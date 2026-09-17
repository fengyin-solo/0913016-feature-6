import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import {
  DisplayScheme,
  SliceConfig,
  VolumeRenderingConfig,
  Point3D,
  MeasurementResult,
} from '../../types';

interface ViewerState {
  slices: {
    inline: SliceConfig;
    crossline: SliceConfig;
    depth: SliceConfig;
  };
  volumeRendering: VolumeRenderingConfig;
  tool: 'select' | 'pan' | 'rotate' | 'measure' | 'annotate';
  measurementType: 'distance' | 'area' | 'volume';
  measurementPoints: Point3D[];
  lastMeasurement: MeasurementResult | null;
  background: 'dark' | 'light';
  showAxes: boolean;
  showGrid: boolean;
  zoom: number;
  rotation: [number, number, number];
  /** 当前数据体的显示方案（本地持久化，按数据体分别加载） */
  displaySchemes: DisplayScheme[];
  /** 当前激活的方案 ID；null 表示未使用任何已保存方案（当前状态为手动调整） */
  activeDisplaySchemeId: string | null;
}

const initialState: ViewerState = {
  slices: {
    inline: {
      type: 'inline',
      index: 0,
      visible: false,
      opacity: 1.0,
      colormap: 'seismic',
      minValue: null,
      maxValue: null,
    },
    crossline: {
      type: 'crossline',
      index: 0,
      visible: false,
      opacity: 1.0,
      colormap: 'seismic',
      minValue: null,
      maxValue: null,
    },
    depth: {
      type: 'depth',
      index: 0,
      visible: false,
      opacity: 1.0,
      colormap: 'seismic',
      minValue: null,
      maxValue: null,
    },
  },
  volumeRendering: {
    enabled: false,
    quality: 1,
    sampleRate: 0.5,
    opacity: 0.5,
  },
  tool: 'rotate',
  measurementType: 'distance',
  measurementPoints: [],
  lastMeasurement: null,
  background: 'dark',
  showAxes: true,
  showGrid: true,
  zoom: 1,
  rotation: [0, 0, 0],
  displaySchemes: [],
  activeDisplaySchemeId: null,
};

const viewerSlice = createSlice({
  name: 'viewer',
  initialState,
  reducers: {
    // 注意：用户单独拖动透明度、开关切片等操作不改变“最近一次使用的方案”，
    // 因此这里不清空 activeDisplaySchemeId（方案内容本身也不会被改写，
    // 只有“更新”或另存为新方案才会保存当前状态）。
    setSliceVisible: (
      state,
      action: PayloadAction<{ sliceType: 'inline' | 'crossline' | 'depth'; visible: boolean }>
    ) => {
      state.slices[action.payload.sliceType].visible = action.payload.visible;
    },
    setSliceIndex: (
      state,
      action: PayloadAction<{ sliceType: 'inline' | 'crossline' | 'depth'; index: number }>
    ) => {
      state.slices[action.payload.sliceType].index = action.payload.index;
    },
    setSliceOpacity: (
      state,
      action: PayloadAction<{ sliceType: 'inline' | 'crossline' | 'depth'; opacity: number }>
    ) => {
      state.slices[action.payload.sliceType].opacity = action.payload.opacity;
    },
    setSliceColormap: (
      state,
      action: PayloadAction<{ sliceType: 'inline' | 'crossline' | 'depth'; colormap: string }>
    ) => {
      state.slices[action.payload.sliceType].colormap = action.payload.colormap;
    },
    setSliceValueRange: (
      state,
      action: PayloadAction<{
        sliceType: 'inline' | 'crossline' | 'depth';
        minValue: number | null;
        maxValue: number | null;
      }>
    ) => {
      state.slices[action.payload.sliceType].minValue = action.payload.minValue;
      state.slices[action.payload.sliceType].maxValue = action.payload.maxValue;
    },
    setVolumeRenderingEnabled: (state, action: PayloadAction<boolean>) => {
      state.volumeRendering.enabled = action.payload;
    },
    setVolumeRenderingQuality: (state, action: PayloadAction<number>) => {
      state.volumeRendering.quality = action.payload;
    },
    setVolumeRenderingOpacity: (state, action: PayloadAction<number>) => {
      state.volumeRendering.opacity = action.payload;
    },
    setTool: (state, action: PayloadAction<ViewerState['tool']>) => {
      state.tool = action.payload;
      state.measurementPoints = [];
    },
    setMeasurementType: (state, action: PayloadAction<ViewerState['measurementType']>) => {
      state.measurementType = action.payload;
      state.measurementPoints = [];
    },
    addMeasurementPoint: (state, action: PayloadAction<Point3D>) => {
      state.measurementPoints.push(action.payload);
    },
    clearMeasurementPoints: (state) => {
      state.measurementPoints = [];
    },
    setLastMeasurement: (state, action: PayloadAction<MeasurementResult | null>) => {
      state.lastMeasurement = action.payload;
    },
    setBackground: (state, action: PayloadAction<'dark' | 'light'>) => {
      state.background = action.payload;
    },
    setShowAxes: (state, action: PayloadAction<boolean>) => {
      state.showAxes = action.payload;
    },
    setShowGrid: (state, action: PayloadAction<boolean>) => {
      state.showGrid = action.payload;
    },
    setZoom: (state, action: PayloadAction<number>) => {
      state.zoom = action.payload;
    },
    setRotation: (state, action: PayloadAction<[number, number, number]>) => {
      state.rotation = action.payload;
    },
    /** 切换数据体/刷新时载入该数据体本地保存的方案列表 */
    hydrateDisplaySchemes: (
      state,
      action: PayloadAction<{ schemes: DisplayScheme[]; activeSchemeId: string | null }>
    ) => {
      state.displaySchemes = action.payload.schemes;
      // 最近方案若已被删除则回退到无激活方案
      const stillExists = action.payload.schemes.some(
        (scheme) => scheme.id === action.payload.activeSchemeId
      );
      state.activeDisplaySchemeId = stillExists ? action.payload.activeSchemeId : null;
    },
    addDisplayScheme: (state, action: PayloadAction<DisplayScheme>) => {
      state.displaySchemes.push(action.payload);
      state.activeDisplaySchemeId = action.payload.id;
    },
    updateDisplayScheme: (
      state,
      action: PayloadAction<{ id: string; name: string; config: DisplayScheme['config']; updatedAt: string }>
    ) => {
      const scheme = state.displaySchemes.find((item) => item.id === action.payload.id);
      if (scheme) {
        scheme.name = action.payload.name;
        scheme.config = action.payload.config;
        scheme.updatedAt = action.payload.updatedAt;
        state.activeDisplaySchemeId = scheme.id;
      }
    },
    removeDisplayScheme: (state, action: PayloadAction<string>) => {
      state.displaySchemes = state.displaySchemes.filter(
        (scheme) => scheme.id !== action.payload
      );
      if (state.activeDisplaySchemeId === action.payload) {
        state.activeDisplaySchemeId = null;
      }
    },
    setActiveDisplayScheme: (state, action: PayloadAction<string | null>) => {
      state.activeDisplaySchemeId = action.payload;
    },
    resetViewer: (state) => {
      // 重置仅恢复视图默认值；已保存的方案与“最近一次使用的方案”均保留，
      // 刷新/切换数据体再回来时仍恢复最近一次使用的方案
      Object.assign(state, {
        ...initialState,
        displaySchemes: state.displaySchemes,
        activeDisplaySchemeId: state.activeDisplaySchemeId,
      });
    },
  },
});

export const {
  setSliceVisible,
  setSliceIndex,
  setSliceOpacity,
  setSliceColormap,
  setSliceValueRange,
  setVolumeRenderingEnabled,
  setVolumeRenderingQuality,
  setVolumeRenderingOpacity,
  setTool,
  setMeasurementType,
  addMeasurementPoint,
  clearMeasurementPoints,
  setLastMeasurement,
  setBackground,
  setShowAxes,
  setShowGrid,
  setZoom,
  setRotation,
  hydrateDisplaySchemes,
  addDisplayScheme,
  updateDisplayScheme,
  removeDisplayScheme,
  setActiveDisplayScheme,
  resetViewer,
} = viewerSlice.actions;
export default viewerSlice.reducer;
