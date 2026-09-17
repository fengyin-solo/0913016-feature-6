import React, { useState, useMemo } from 'react';
import {
  Card,
  Collapse,
  Switch,
  Slider,
  Select,
  Space,
  Typography,
  Tag,
  Button,
  Modal,
  Input,
  Form,
  Popconfirm,
  Tooltip,
  message,
} from 'antd';
import {
  EyeOutlined,
  EyeInvisibleOutlined,
  BuildOutlined,
  SettingOutlined,
  AreaChartOutlined,
  ProfileOutlined,
  SaveOutlined,
  DeleteOutlined,
  CloudUploadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import { useSelector, useDispatch } from 'react-redux';
import {
  setSliceVisible,
  setSliceIndex,
  setSliceOpacity,
  setSliceColormap,
  setVolumeRenderingEnabled,
  setVolumeRenderingOpacity,
  setBackground,
  setShowAxes,
  setShowGrid,
} from '../store/slices/viewerSlice';
import {
  applyScheme,
  saveCurrentAsScheme,
  updateActiveScheme,
  deleteSchemeById,
  buildDisplaySnapshot,
  isSnapshotEqual,
  SLICE_LABELS,
  SLICE_TYPES,
} from '../store/slices/displaySchemeSlice';
import { RootState, AppDispatch } from '../store';
import { DisplayScheme, SeismicData, SliceType } from '../types';

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface ControlPanelProps {
  seismicData: SeismicData;
}

const colormapOptions = [
  { value: 'seismic', label: '地震波色标' },
  { value: 'gray', label: '灰度' },
  { value: 'rainbow', label: '彩虹' },
];

/** 显示方案面板：整组保存、恢复与一键切换切片/体绘制的显示状态。 */
const DisplaySchemePanel: React.FC = () => {
  const dispatch = useDispatch<AppDispatch>();
  const schemes = useSelector((state: RootState) => state.displaySchemes.schemes);
  const activeSchemeId = useSelector(
    (state: RootState) => state.displaySchemes.activeSchemeId
  );
  const viewerState = useSelector((state: RootState) => state.viewer);

  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form] = Form.useForm<{ name: string }>();

  const activeScheme = useMemo(
    () => schemes.find((s) => s.id === activeSchemeId) ?? null,
    [schemes, activeSchemeId]
  );

  // 当前显示状态相对已应用方案是否存在未保存修改
  const isDirty = useMemo(() => {
    if (!activeScheme) return false;
    return !isSnapshotEqual(
      buildDisplaySnapshot(viewerState.slices, viewerState.volumeRendering),
      activeScheme.snapshot
    );
  }, [activeScheme, viewerState.slices, viewerState.volumeRendering]);

  const handleApply = (schemeId: string) => {
    if (!schemeId) return;
    dispatch(applyScheme(schemeId));
  };

  const handleSave = async () => {
    try {
      const { name } = await form.validateFields();
      setSaving(true);
      const result = dispatch(saveCurrentAsScheme(name));
      if (result.ok) {
        message.success(`显示方案“${result.scheme?.name}”已保存`);
        setSaveModalOpen(false);
        form.resetFields();
      } else {
        message.error(result.error || '保存失败');
      }
    } catch (error) {
      // 校验未通过，保留弹窗供用户修改
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateActive = () => {
    const result = dispatch(updateActiveScheme());
    if (result.ok) {
      message.success(`方案“${activeScheme?.name}”已更新为当前显示状态`);
    } else {
      message.error(result.error || '更新失败');
    }
  };

  const handleDelete = (scheme: DisplayScheme) => {
    dispatch(deleteSchemeById(scheme.id));
    message.success(`方案“${scheme.name}”已删除`);
  };

  return (
    <Card size="small">
      <div style={{ marginBottom: 8 }}>
        <Text type="secondary">当前方案</Text>
        <div style={{ marginTop: 4 }}>
          {activeScheme ? (
            <Space size={4} wrap>
              <Tag color="blue">{activeScheme.name}</Tag>
              {isDirty && <Tag color="orange">有未保存修改</Tag>}
            </Space>
          ) : (
            <Tag>未应用方案（显示状态为临时调整）</Tag>
          )}
        </div>
      </div>

      <Select
        value={activeSchemeId ?? undefined}
        style={{ width: '100%' }}
        placeholder="一键切换显示方案"
        onChange={handleApply}
        disabled={schemes.length === 0}
        options={schemes.map((scheme) => ({
          value: scheme.id,
          label: scheme.name,
        }))}
      />

      <Space style={{ marginTop: 8 }} wrap>
        <Button
          size="small"
          type="primary"
          icon={<SaveOutlined />}
          onClick={() => {
            form.resetFields();
            setSaveModalOpen(true);
          }}
        >
          保存当前显示为新方案
        </Button>
        <Tooltip title={isDirty ? '用当前显示状态覆盖此方案' : '当前显示与方案一致，无需更新'}>
          <Button
            size="small"
            icon={<CloudUploadOutlined />}
            disabled={!activeScheme || !isDirty}
            onClick={handleUpdateActive}
          >
            更新当前方案
          </Button>
        </Tooltip>
        <Tooltip title="放弃临时调整，重新应用当前方案">
          <Button
            size="small"
            disabled={!activeScheme || !isDirty}
            onClick={() => activeScheme && dispatch(applyScheme(activeScheme.id))}
          >
            恢复方案
          </Button>
        </Tooltip>
        {activeScheme && (
          <Popconfirm
            title="删除显示方案"
            description={`确定删除方案“${activeScheme.name}”吗？删除后显示状态不会改变，但无法再一键恢复。`}
            okText="删除"
            okButtonProps={{ danger: true }}
            cancelText="取消"
            onConfirm={() => handleDelete(activeScheme)}
          >
            <Button size="small" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        )}
      </Space>

      <Modal
        title="保存显示方案"
        open={saveModalOpen}
        onOk={handleSave}
        confirmLoading={saving}
        okText="保存"
        cancelText="取消"
        onCancel={() => setSaveModalOpen(false)}
        destroyOnClose
      >
        <Text type="secondary">
          方案将保存各切片的启用状态、透明度、色标以及体绘制的启用状态与透明度。
        </Text>
        <Form form={form} layout="vertical" style={{ marginTop: 12 }}>
          <Form.Item
            name="name"
            label="方案名称"
            rules={[
              { required: true, whitespace: true, message: '请输入方案名称' },
              {
                validator: (_rule, value: string) => {
                  const trimmed = (value ?? '').trim();
                  const duplicated = schemes.some(
                    (s) => s.name.trim().toLowerCase() === trimmed.toLowerCase()
                  );
                  return duplicated
                    ? Promise.reject(new Error('已存在同名方案，请更换名称'))
                    : Promise.resolve();
                },
              },
            ]}
          >
            <Input
              placeholder="例如：构造解释视图 / 岩性对比视图"
              maxLength={50}
              showCount
              autoFocus
            />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
};

const ControlPanel: React.FC<ControlPanelProps> = ({ seismicData }) => {
  const dispatch = useDispatch<AppDispatch>();
  const slices = useSelector((state: RootState) => state.viewer.slices);
  const volumeRendering = useSelector((state: RootState) => state.viewer.volumeRendering);
  const background = useSelector((state: RootState) => state.viewer.background);
  const showAxes = useSelector((state: RootState) => state.viewer.showAxes);
  const showGrid = useSelector((state: RootState) => state.viewer.showGrid);
  const activeScheme = useSelector((state: RootState) => {
    const { schemes, activeSchemeId } = state.displaySchemes;
    return schemes.find((s) => s.id === activeSchemeId) ?? null;
  });

  const [activeKeys, setActiveKeys] = useState<string[]>([
    'schemes',
    'slices',
    'volume',
    'display',
  ]);

  /** 关闭切片：若该切片属于当前方案的启用项，先弹窗确认。 */
  const handleSliceVisibleChange = (sliceType: SliceType, visible: boolean) => {
    if (!visible && activeScheme?.snapshot.slices[sliceType].visible) {
      Modal.confirm({
        title: '关闭方案中的切片？',
        icon: <ExclamationCircleOutlined />,
        content: (
          <div>
            <p>
              「{SLICE_LABELS[sliceType]}切片」是当前显示方案
              <Text strong>「{activeScheme.name}」</Text>
              中启用的切片。
            </p>
            <p>关闭后，画布显示将与该方案不一致（可随时在方案中重新启用，或使用「更新当前方案」保存调整）。确定要关闭吗？</p>
          </div>
        ),
        okText: '关闭切片',
        cancelText: '保持启用',
        onOk: () => dispatch(setSliceVisible({ sliceType, visible })),
      });
      return;
    }
    dispatch(setSliceVisible({ sliceType, visible }));
  };

  const renderSliceControl = (sliceType: SliceType) => {
    const config = slices[sliceType];

    const maxMap = {
      inline: seismicData.num_inlines || 100,
      crossline: seismicData.num_crosslines || 100,
      depth: seismicData.num_depths || 100,
    };

    const labelsMap = {
      inline: 'Inline 切片',
      crossline: 'Crossline 切片',
      depth: '深度切片',
    };

    return (
      <Card
        key={sliceType}
        size="small"
        style={{ marginBottom: 8 }}
        extra={
          <Switch
            checked={config.visible}
            onChange={(checked) => handleSliceVisibleChange(sliceType, checked)}
            checkedChildren={<EyeOutlined />}
            unCheckedChildren={<EyeInvisibleOutlined />}
          />
        }
      >
        <Title level={5} style={{ margin: '0 0 12px 0' }}>
          {labelsMap[sliceType]}
        </Title>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text type="secondary">切片索引</Text>
            <Tag color="blue">{config.index}</Tag>
          </div>
          <Slider
            min={0}
            max={maxMap[sliceType] - 1}
            value={config.index}
            onChange={(value) => dispatch(setSliceIndex({ sliceType, index: value as number }))}
            disabled={!config.visible}
          />
        </div>

        <div style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <Text type="secondary">不透明度</Text>
            <Tag>{(config.opacity * 100).toFixed(0)}%</Tag>
          </div>
          <Slider
            min={0}
            max={1}
            step={0.01}
            value={config.opacity}
            onChange={(value) => dispatch(setSliceOpacity({ sliceType, opacity: value as number }))}
            disabled={!config.visible}
          />
        </div>

        <div>
          <Text type="secondary">色标</Text>
          <Select
            value={config.colormap}
            size="small"
            style={{ width: '100%' }}
            onChange={(value) => dispatch(setSliceColormap({ sliceType, colormap: value }))}
            disabled={!config.visible}
          >
            {colormapOptions.map(opt => (
              <Select.Option key={opt.value} value={opt.value}>{opt.label}</Select.Option>
            ))}
          </Select>
        </div>
      </Card>
    );
  };

  return (
    <div className="control-panel">
      <Card
        size="small"
        title={
          <Space>
            <SettingOutlined />
            <span>控制面板</span>
          </Space>
        }
        style={{ marginBottom: 0 }}
      >
        <Collapse
          activeKey={activeKeys}
          onChange={(keys) => setActiveKeys(keys as string[])}
        >
          <Panel
            header={
              <Space>
                <ProfileOutlined />
                <span>显示方案</span>
              </Space>
            }
            key="schemes"
          >
            <DisplaySchemePanel />
          </Panel>

          <Panel
            header={
              <Space>
                <AreaChartOutlined />
                <span>切片控制</span>
              </Space>
            }
            key="slices"
          >
            {SLICE_TYPES.map(renderSliceControl)}
          </Panel>

          <Panel
            header={
              <Space>
                <BuildOutlined />
                <span>体绘制</span>
              </Space>
            }
            key="volume"
          >
            <Card size="small">
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>启用体绘制</Text>
                  <Switch
                    checked={volumeRendering.enabled}
                    onChange={(checked) => dispatch(setVolumeRenderingEnabled(checked))}
                  />
                </div>
              </div>

              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <Text type="secondary">透明度</Text>
                  <Tag>{(volumeRendering.opacity * 100).toFixed(0)}%</Tag>
                </div>
                <Slider
                  min={0}
                  max={1}
                  step={0.01}
                  value={volumeRendering.opacity}
                  onChange={(value) => dispatch(setVolumeRenderingOpacity(value as number))}
                  disabled={!volumeRendering.enabled}
                />
              </div>
            </Card>
          </Panel>

          <Panel
            header={
              <Space>
                <EyeOutlined />
                <span>显示设置</span>
              </Space>
            }
            key="display"
          >
            <Card size="small">
              <div style={{ marginBottom: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text>背景</Text>
                  <Select
                    value={background}
                    size="small"
                    style={{ width: 100 }}
                    onChange={(value) => dispatch(setBackground(value))}
                  >
                    <Select.Option value="dark">深色</Select.Option>
                    <Select.Option value="light">浅色</Select.Option>
                  </Select>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <Text>显示坐标轴</Text>
                  <Switch
                    checked={showAxes}
                    onChange={(checked) => dispatch(setShowAxes(checked))}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text>显示网格</Text>
                  <Switch
                    checked={showGrid}
                    onChange={(checked) => dispatch(setShowGrid(checked))}
                  />
                </div>
              </div>
            </Card>
          </Panel>
        </Collapse>
      </Card>
    </div>
  );
};

export default ControlPanel;
