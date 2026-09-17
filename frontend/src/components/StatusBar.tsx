import React from 'react';
import { Space, Tag, Typography, Tooltip } from 'antd';
import {
  InfoCircleOutlined,
  DatabaseOutlined,
  LineChartOutlined,
  ProfileOutlined,
} from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { SLICE_LABELS, SLICE_TYPES, buildDisplaySnapshot, isSnapshotEqual } from '../store/slices/displaySchemeSlice';
import { SeismicData } from '../types';

const { Text } = Typography;

interface StatusBarProps {
  seismicData: SeismicData;
}

const StatusBar: React.FC<StatusBarProps> = ({ seismicData }) => {
  const tool = useSelector((state: RootState) => state.viewer.tool);
  const lastMeasurement = useSelector((state: RootState) => state.viewer.lastMeasurement);
  const measurementPoints = useSelector((state: RootState) => state.viewer.measurementPoints);
  const slices = useSelector((state: RootState) => state.viewer.slices);
  const volumeRendering = useSelector((state: RootState) => state.viewer.volumeRendering);
  const schemes = useSelector((state: RootState) => state.displaySchemes.schemes);
  const activeSchemeId = useSelector(
    (state: RootState) => state.displaySchemes.activeSchemeId
  );

  const activeScheme = schemes.find((s) => s.id === activeSchemeId) ?? null;
  const enabledSliceLabels = SLICE_TYPES.filter((t) => slices[t].visible).map(
    (t) => SLICE_LABELS[t]
  );
  const schemeDirty = activeScheme
    ? !isSnapshotEqual(buildDisplaySnapshot(slices, volumeRendering), activeScheme.snapshot)
    : false;

  const toolLabels: Record<string, string> = {
    rotate: '旋转模式',
    pan: '平移模式',
    select: '选择模式',
    measure: '测量模式',
    annotate: '标注模式',
  };

  const statusItems = [
    {
      icon: <DatabaseOutlined />,
      content: (
        <>
          <Text type="secondary">数据维度: </Text>
          <Text>
            {seismicData.num_inlines || '-'} × {seismicData.num_crosslines || '-'} × {seismicData.num_depths || '-'}
          </Text>
        </>
      ),
    },
    {
      icon: <LineChartOutlined />,
      content: (
        <>
          <Text type="secondary">数值范围: </Text>
          <Text>
            {seismicData.min_value?.toFixed(2) || '-'} ~ {seismicData.max_value?.toFixed(2) || '-'}
          </Text>
        </>
      ),
    },
    {
      icon: <InfoCircleOutlined />,
      content: (
        <>
          <Text type="secondary">当前模式: </Text>
          <Tag color="blue">{toolLabels[tool] || tool}</Tag>
        </>
      ),
    },
    {
      icon: <ProfileOutlined />,
      content: (
        <Tooltip
          title={
            activeScheme
              ? `方案包含：${
                  SLICE_TYPES.filter((t) => activeScheme.snapshot.slices[t].visible)
                    .map((t) => SLICE_LABELS[t] + '切片')
                    .join('、') || '无切片'
                }${activeScheme.snapshot.volumeRendering.enabled ? '、体绘制' : ''}`
              : '尚未应用显示方案'
          }
        >
          <Text type="secondary">显示方案: </Text>
          {activeScheme ? (
            <Space size={4}>
              <Tag color="blue">{activeScheme.name}</Tag>
              {schemeDirty && <Tag color="orange">已调整未保存</Tag>}
            </Space>
          ) : (
            <Tag>临时</Tag>
          )}
          <Text type="secondary" style={{ marginLeft: 8 }}>
            显示中:
          </Text>
          {enabledSliceLabels.length > 0 &&
            enabledSliceLabels.map((label) => <Tag key={label}>{label}切片</Tag>)}
          {volumeRendering.enabled && <Tag color="purple">体绘制</Tag>}
          {enabledSliceLabels.length === 0 && !volumeRendering.enabled && <Tag>无</Tag>}
        </Tooltip>
      ),
    },
  ];

  if (tool === 'measure' && lastMeasurement) {
    statusItems.push({
      icon: <LineChartOutlined />,
      content: (
        <>
          <Text type="secondary">测量结果: </Text>
          <Tag color="green">
            {lastMeasurement.value.toFixed(2)} {lastMeasurement.unit}
          </Tag>
        </>
      ),
    });
  }

  if (tool === 'measure' && measurementPoints.length > 0) {
    statusItems.push({
      icon: <InfoCircleOutlined />,
      content: (
        <>
          <Text type="secondary">已选点: </Text>
          <Tag>{measurementPoints.length}</Tag>
        </>
      ),
    });
  }

  return (
    <div className="status-bar">
      <Space size="large">
        {statusItems.map((item, index) => (
          <Space key={index} size={4}>
            {item.icon}
            {item.content}
          </Space>
        ))}
      </Space>

      <Space size="large">
        {seismicData.file_size && (
          <Text type="secondary">
            文件大小: {(seismicData.file_size / 1024 / 1024).toFixed(2)} MB
          </Text>
        )}
        <Text type="secondary">
          采样率: {seismicData.depth_step?.toFixed(2) || '-'} ms
        </Text>
      </Space>
    </div>
  );
};

export default StatusBar;
