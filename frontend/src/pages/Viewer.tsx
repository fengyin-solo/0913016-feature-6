import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { Button, Spin, message, Space, Typography } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { RootState, AppDispatch } from '../store';
import { fetchSeismicData, setCurrentSeismic } from '../store/slices/seismicSlice';
import {
  hydrateDisplaySchemes,
} from '../store/slices/viewerSlice';
import { SeismicData } from '../types';
import {
  loadSchemes,
  saveSchemes,
} from '../services/displaySchemeStorage';
import {
  applySchemeConfig,
  DEFAULT_SCHEME_CONFIG,
} from '../services/displaySchemeConfig';
import SeismicCanvas from '../components/SeismicCanvas';
import ControlPanel from '../components/ControlPanel';
import Toolbar from '../components/Toolbar';
import StatusBar from '../components/StatusBar';

const { Title } = Typography;

const Viewer: React.FC = () => {
  const { seismicId } = useParams<{ seismicId: string }>();
  const navigate = useNavigate();
  const dispatch = useDispatch<AppDispatch>();
  const containerRef = useRef<HTMLDivElement>(null);

  const { seismicList, loading } = useSelector((state: RootState) => state.seismic);
  const [currentData, setCurrentData] = useState<SeismicData | null>(null);

  const displaySchemes = useSelector((state: RootState) => state.viewer.displaySchemes);
  const activeDisplaySchemeId = useSelector(
    (state: RootState) => state.viewer.activeDisplaySchemeId
  );
  // 标记当前方案数据已完成水合的数据体 ID，避免用切换前的旧状态覆盖新数据体的存储
  const [hydratedSeismicId, setHydratedSeismicId] = useState<number | null>(null);

  // 切换数据体（或刷新后进入）时，按数据体恢复保存的方案列表并应用最近一次使用的方案
  useEffect(() => {
    const id = parseInt(seismicId || '0', 10);
    if (!id) return;

    const { schemes, activeSchemeId } = loadSchemes(id);

    const active = schemes.find((scheme) => scheme.id === activeSchemeId);
    if (active) {
      applySchemeConfig(dispatch, active.config);
    } else if (schemes.length === 0) {
      // 从未保存过方案的数据体回到默认显示，避免残留上一个数据体的切片
      applySchemeConfig(dispatch, DEFAULT_SCHEME_CONFIG);
    }
    // 方案应用派发的单项 action 会清空激活标记，最后再统一恢复水合后的方案列表与激活方案
    dispatch(hydrateDisplaySchemes({ schemes, activeSchemeId }));
    setHydratedSeismicId(id);
  }, [seismicId, dispatch]);

  // 方案列表/激活方案变化时按数据体持久化
  useEffect(() => {
    const id = parseInt(seismicId || '0', 10);
    if (!id || hydratedSeismicId !== id) return;
    saveSchemes(id, { schemes: displaySchemes, activeSchemeId: activeDisplaySchemeId });
  }, [seismicId, displaySchemes, activeDisplaySchemeId, hydratedSeismicId]);

  useEffect(() => {
    const loadData = async () => {
      const id = parseInt(seismicId || '0');
      if (!id) return;

      const existing = seismicList.find((s) => s.id === id);
      if (existing) {
        setCurrentData(existing);
        dispatch(setCurrentSeismic(existing));
      } else {
        message.error('未找到地震数据');
        navigate('/projects');
      }
    };

    loadData();
  }, [seismicId, seismicList, dispatch, navigate]);

  if (loading || !currentData) {
    return (
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
        }}
      >
        <Spin size="large" />
      </div>
    );
  }

  if (currentData.status !== 'ready') {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: '100%',
          gap: 16,
        }}
      >
        <Title level={4}>数据尚未就绪</Title>
        <p>当前状态: {currentData.status}</p>
        <Button type="primary" onClick={() => navigate('/projects')}>
          返回项目列表
        </Button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="seismic-canvas-container">
      <SeismicCanvas seismicData={currentData} containerRef={containerRef} />

      <Toolbar />

      <ControlPanel seismicData={currentData} />

      <StatusBar seismicData={currentData} />

      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 16,
          zIndex: 100,
        }}
      >
        <Space>
          <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}>
            返回
          </Button>
          <div
            style={{
              background: 'rgba(255, 255, 255, 0.9)',
              padding: '8px 16px',
              borderRadius: 4,
              boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            }}
          >
            <strong>{currentData.name}</strong>
          </div>
        </Space>
      </div>
    </div>
  );
};

export default Viewer;
