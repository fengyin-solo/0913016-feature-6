import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { SliceConfig, VolumeRenderingConfig, Point3D, MeasurementResult, DisplaySnapshot, SliceType } from '../../types';

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
};

const viewerSlice = createSlice({
  name: 'viewer',
  initialState,
  reducers: {
    setSliceVisible: (
      state,
      action: PayloadAction<{ sliceType: SliceType; visible: boolean }>
    ) => {
      state.slices[action.payload.sliceType].visible = action.payload.visible;
    },
    setSliceIndex: (
      state,
      action: PayloadAction<{ sliceType: SliceType; index: number }>
    ) => {
      state.slices[action.payload.sliceType].index = action.payload.index;
    },
    setSliceOpacity: (
      state,
      action: PayloadAction<{ sliceType: SliceType; opacity: number }>
    ) => {
      state.slices[action.payload.sliceType].opacity = action.payload.opacity;
    },
    setSliceColormap: (
      state,
      action: PayloadAction<{ sliceType: SliceType; colormap: string }>
    ) => {
      state.slices[action.payload.sliceType].colormap = action.payload.colormap;
    },
    setSliceValueRange: (
      state,
      action: PayloadAction<{
        sliceType: SliceType;
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
    /**
     * 整组应用显示方案：一次性覆盖三个切片的启用状态/透明度/色标，
     * 以及体绘制的启用状态与透明度。切片索引、背景深浅、相机等保持不变。
     */
    applyDisplaySnapshot: (state, action: PayloadAction<DisplaySnapshot>) => {
      const { slices, volumeRendering } = action.payload;
      (['inline', 'crossline', 'depth'] as SliceType[]).forEach((sliceType) => {
        const target = slices[sliceType];
        if (!target) return;
        state.slices[sliceType].visible = target.visible;
        state.slices[sliceType].opacity = target.opacity;
        state.slices[sliceType].colormap = target.colormap;
      });
      state.volumeRendering.enabled = volumeRendering.enabled;
      state.volumeRendering.opacity = volumeRendering.opacity;
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
    resetViewer: () => initialState,
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
  applyDisplaySnapshot,
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
  resetViewer,
} = viewerSlice.actions;
export default viewerSlice.reducer;
