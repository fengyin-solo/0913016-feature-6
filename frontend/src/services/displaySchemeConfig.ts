import { Dispatch } from '@reduxjs/toolkit';
import {
  DisplaySchemeConfig,
  SliceConfig,
  SliceType,
  VolumeRenderingConfig,
} from '../types';
import {
  setSliceVisible,
  setSliceOpacity,
  setSliceColormap,
  setVolumeRenderingEnabled,
  setVolumeRenderingOpacity,
} from '../store/slices/viewerSlice';

export const SLICE_TYPES: SliceType[] = ['inline', 'crossline', 'depth'];

/** 没有任何已保存方案时，新数据体默认恢复到的显示状态 */
export const DEFAULT_SCHEME_CONFIG: DisplaySchemeConfig = {
  slices: {
    inline: { visible: false, opacity: 1, colormap: 'seismic' },
    crossline: { visible: false, opacity: 1, colormap: 'seismic' },
    depth: { visible: false, opacity: 1, colormap: 'seismic' },
  },
  volumeRendering: {
    enabled: false,
    opacity: 0.5,
  },
};

/** 从当前 Redux 显示状态快照出一份方案配置 */
export function buildSchemeConfig(
  slices: Record<SliceType, SliceConfig>,
  volumeRendering: VolumeRenderingConfig
): DisplaySchemeConfig {
  return {
    slices: {
      inline: {
        visible: slices.inline.visible,
        opacity: slices.inline.opacity,
        colormap: slices.inline.colormap,
      },
      crossline: {
        visible: slices.crossline.visible,
        opacity: slices.crossline.opacity,
        colormap: slices.crossline.colormap,
      },
      depth: {
        visible: slices.depth.visible,
        opacity: slices.depth.opacity,
        colormap: slices.depth.colormap,
      },
    },
    volumeRendering: {
      enabled: volumeRendering.enabled,
      opacity: volumeRendering.opacity,
    },
  };
}

/**
 * 将一份方案配置整体应用到画布：切片开关/透明度/色标、体绘制开关/透明度。
 * Redux 更新后画布、控制面板与底部信息栏会同时刷新。
 */
export function applySchemeConfig(
  dispatch: Dispatch,
  config: DisplaySchemeConfig
): void {
  SLICE_TYPES.forEach((sliceType) => {
    const slice = config.slices[sliceType];
    dispatch(setSliceVisible({ sliceType, visible: slice.visible }));
    dispatch(setSliceOpacity({ sliceType, opacity: slice.opacity }));
    dispatch(setSliceColormap({ sliceType, colormap: slice.colormap }));
  });

  dispatch(setVolumeRenderingEnabled(config.volumeRendering.enabled));
  dispatch(setVolumeRenderingOpacity(config.volumeRendering.opacity));
}
