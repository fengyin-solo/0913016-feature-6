import React from 'react';
import { Space, Tag, Typography, Tooltip } from 'antd';
import { InfoCircleOutlined, DatabaseOutlined, LineChartOutlined, AppstoreOutlined } from '@ant-design/icons';
import { useSelector } from 'react-redux';
import { RootState } from '../store';
import { SeismicData, SliceType } from '../types';

const { Text } = Typography;

const SLICE_LABELS: Record<SliceType, string> = {
  inline: 'Inline',
  crossline: 'Crossline',
  depth: '深度',
};

interface StatusBarProps {
  seismicData: SeismicData;
}

const StatusBar: React.FC<StatusBarProps> = ({ seismicData }) => {
  const tool = useSelector((state: RootState) => state.viewer.tool);
  const lastMeasurement = useSelector((state: RootState) => state.viewer.lastMeasurement);
  const measurementPoints = useSelector((state: RootState) => state.viewer.measurementPoints);
  const displaySchemes = useSelector((state: RootState) => state.viewer.displaySchemes);
  const activeDisplaySchemeId = useSelector(
    (state: RootState) => state.viewer.activeDisplaySchemeId
  );
  const activeScheme = displaySchemes.find((scheme) => scheme.id === activeDisplaySchemeId);

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
      icon: <AppstoreOutlined />,
      content: (
        <>
          <Text type="secondary">显示方案: </Text>
          {activeScheme ? (
            <Tooltip
              title={
                <div style={{ fontSize: 12 }}>
                  {(['inline', 'crossline', 'depth'] as SliceType[])
                    .filter((sliceType) => activeScheme.config.slices[sliceType].visible)
                    .map((sliceType) => {
                      const slice = activeScheme.config.slices[sliceType];
                      return (
                        <div key={sliceType}>
                          {SLICE_LABELS[sliceType]} · 透明度 {(slice.opacity * 100).toFixed(0)}% · {slice.colormap}
                        </div>
                      );
                    })}
                  <div>体绘制: {activeScheme.config.volumeRendering.enabled ? `开 · ${(activeScheme.config.volumeRendering.opacity * 100).toFixed(0)}%` : '关'}</div>
                </div>
              }
            >
              <Tag color="purple">{activeScheme.name}</Tag>
            </Tooltip>
          ) : (
            <Text>自定义</Text>
          )}
        </>
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
