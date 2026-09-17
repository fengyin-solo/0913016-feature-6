import React, { useState } from 'react';
import {
  Card,
  Select,
  Button,
  Space,
  Modal,
  Input,
  Tooltip,
  Typography,
  Popconfirm,
  Empty,
} from 'antd';
import {
  AppstoreOutlined,
  SaveOutlined,
  ReloadOutlined,
  DeleteOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import { RootState, AppDispatch } from '../store';
import {
  addDisplayScheme,
  updateDisplayScheme,
  removeDisplayScheme,
  setActiveDisplayScheme,
} from '../store/slices/viewerSlice';
import {
  DisplayScheme,
  DisplaySchemeConfig,
  SliceType,
} from '../types';
import {
  buildSchemeConfig,
  applySchemeConfig,
  SLICE_TYPES,
} from '../services/displaySchemeConfig';
import {
  createSchemeId,
  isDuplicateSchemeName,
} from '../services/displaySchemeStorage';

const { Text } = Typography;

const SLICE_LABELS: Record<SliceType, string> = {
  inline: 'Inline 切片',
  crossline: 'Crossline 切片',
  depth: '深度切片',
};

/** 方案保存弹窗（新建 / 覆盖更新共用） */
const SchemeNameModal: React.FC<{
  open: boolean;
  title: string;
  initialName: string;
  existingSchemes: DisplayScheme[];
  excludeSchemeId?: string;
  onCancel: () => void;
  onSubmit: (name: string) => void;
}> = ({ open, title, initialName, existingSchemes, excludeSchemeId, onCancel, onSubmit }) => {
  const [name, setName] = useState(initialName);
  const [error, setError] = useState<string | null>(null);

  React.useEffect(() => {
    if (open) {
      setName(initialName);
      setError(null);
    }
  }, [open, initialName]);

  const handleOk = () => {
    const trimmed = name.trim();
    if (!trimmed) {
      setError('请输入方案名称');
      return;
    }
    if (isDuplicateSchemeName(existingSchemes, trimmed, excludeSchemeId)) {
      setError('方案名已存在，请更换名称');
      return;
    }
    onSubmit(trimmed);
  };

  return (
    <Modal
      open={open}
      title={title}
      onCancel={onCancel}
      onOk={handleOk}
      okText="保存"
      cancelText="取消"
      destroyOnClose
    >
      <Input
        value={name}
        maxLength={30}
        placeholder="请输入显示方案名称"
        onChange={(event) => {
          setName(event.target.value);
          setError(null);
        }}
        onPressEnter={handleOk}
        status={error ? 'error' : undefined}
      />
      {error ? (
        <Text type="danger" style={{ fontSize: 12 }}>
          {error}
        </Text>
      ) : (
        <Text type="secondary" style={{ fontSize: 12 }}>
          将保存当前启用的切片、各自的透明度与色标，以及体绘制开关与透明度
        </Text>
      )}
    </Modal>
  );
};

const DisplaySchemePanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const slices = useSelector((state: RootState) => state.viewer.slices);
  const volumeRendering = useSelector((state: RootState) => state.viewer.volumeRendering);
  const schemes = useSelector((state: RootState) => state.viewer.displaySchemes);
  const activeSchemeId = useSelector(
    (state: RootState) => state.viewer.activeDisplaySchemeId
  );

  const [saveOpen, setSaveOpen] = useState(false);
  const activeScheme = schemes.find((scheme) => scheme.id === activeSchemeId);

  const handleSwitch = (schemeId: string) => {
    if (schemeId === activeSchemeId) return;
    const target = schemes.find((scheme) => scheme.id === schemeId);
    if (!target) return;

    // 方案引用的切片/体绘制会被关掉时，先弹窗确认并说明影响
    const closingSlices = SLICE_TYPES.filter(
      (sliceType) =>
        slices[sliceType].visible && !target.config.slices[sliceType].visible
    );
    const closingVolume = volumeRendering.enabled && !target.config.volumeRendering.enabled;

    const doApply = () => {
      applySchemeConfig(dispatch, target.config);
      dispatch(setActiveDisplayScheme(target.id));
    };

    if (closingSlices.length === 0 && !closingVolume) {
      doApply();
      return;
    }
    const affected: string[] = [
      ...closingSlices.map((sliceType) => SLICE_LABELS[sliceType]),
      ...(closingVolume ? ['体绘制'] : []),
    ];

    Modal.confirm({
      title: '切换显示方案',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p style={{ marginBottom: 8 }}>
            切换到方案「<strong>{target.name}</strong>」后，以下当前显示内容将被关闭：
          </p>
          <p>
            {affected.map((label) => (
              <span key={label} style={{ marginRight: 8 }}>
                · {label}
              </span>
            ))}
          </p>
          <p style={{ marginBottom: 0, color: 'rgba(0,0,0,0.45)' }}>
            方案中启用的切片、透明度与色标将同步应用到画布与控制面板，是否继续？
          </p>
        </div>
      ),
      okText: '继续切换',
      cancelText: '取消',
      onOk: doApply,
    });
  };

  const handleSave = (name: string) => {
    const now = new Date().toISOString();
    const scheme: DisplayScheme = {
      id: createSchemeId(),
      name,
      config: buildSchemeConfig(slices, volumeRendering),
      createdAt: now,
      updatedAt: now,
    };
    dispatch(addDisplayScheme(scheme));
    setSaveOpen(false);
  };

  const handleUpdate = () => {
    if (!activeScheme) return;
    Modal.confirm({
      title: '更新显示方案',
      content: `将用当前画布状态覆盖方案「${activeScheme.name}」中保存的切片开关、透明度与色标，是否继续？`,
      okText: '覆盖保存',
      cancelText: '取消',
      onOk: () => {
        dispatch(
          updateDisplayScheme({
            id: activeScheme.id,
            name: activeScheme.name,
            config: buildSchemeConfig(slices, volumeRendering),
            updatedAt: new Date().toISOString(),
          })
        );
      },
    });
  };

  const handleDelete = () => {
    if (!activeScheme) return;
    dispatch(removeDisplayScheme(activeScheme.id));
  };

  const describeConfig = (config: DisplaySchemeConfig): string => {
    const enabledSlices = SLICE_TYPES.filter(
      (sliceType) => config.slices[sliceType].visible
    ).length;
    return `切片 ${enabledSlices}/3${config.volumeRendering.enabled ? ' · 体绘制' : ''}`;
  };

  return (
    <Card
      size="small"
      title={
        <Space>
          <AppstoreOutlined />
          <span>显示方案</span>
        </Space>
      }
      style={{ marginBottom: 8 }}
    >
      {schemes.length === 0 ? (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="暂无方案，调整后可保存当前显示为方案"
          style={{ margin: '8px 0' }}
        />
      ) : (
        <Select
          value={activeSchemeId ?? undefined}
          placeholder="一键切换显示方案"
          style={{ width: '100%', marginBottom: 8 }}
          onChange={handleSwitch}
          options={schemes.map((scheme) => ({
            value: scheme.id,
            label: `${scheme.name}（${describeConfig(scheme.config)}）`,
          }))}
        />
      )}

      <Space wrap>
        <Button
          size="small"
          type="primary"
          ghost
          icon={<SaveOutlined />}
          onClick={() => setSaveOpen(true)}
        >
          保存当前为新方案
        </Button>
        <Tooltip title={activeScheme ? '用当前状态覆盖已激活方案' : '请先选择一个方案'}>
          <Button
            size="small"
            icon={<ReloadOutlined />}
            disabled={!activeScheme}
            onClick={handleUpdate}
          >
            更新
          </Button>
        </Tooltip>
        <Popconfirm
          title="删除显示方案"
          description={
            activeScheme ? `确认删除方案「${activeScheme.name}」？` : '请先选择一个方案'
          }
          okText="删除"
          cancelText="取消"
          okButtonProps={{ danger: true }}
          disabled={!activeScheme}
          onConfirm={handleDelete}
        >
          <Button size="small" danger icon={<DeleteOutlined />} disabled={!activeScheme}>
            删除
          </Button>
        </Popconfirm>
      </Space>

      <SchemeNameModal
        open={saveOpen}
        title="保存显示方案"
        initialName=""
        existingSchemes={schemes}
        onCancel={() => setSaveOpen(false)}
        onSubmit={handleSave}
      />
    </Card>
  );
};

export default DisplaySchemePanel;
