import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { ThunkAction } from '@reduxjs/toolkit';
import {
  DisplayScheme,
  DisplaySnapshot,
  SliceType,
  SliceConfig,
  VolumeRenderingConfig,
} from '../../types';
import { applyDisplaySnapshot } from './viewerSlice';
import type { RootState } from '../index';

type AppThunk<ReturnType = void> = ThunkAction<ReturnType, RootState, unknown, any>;

/** 切片类型的中文名，供控制面板与底部信息栏复用。 */
export const SLICE_LABELS: Record<SliceType, string> = {
  inline: 'Inline',
  crossline: 'Crossline',
  depth: '深度',
};

export const SLICE_TYPES: SliceType[] = ['inline', 'crossline', 'depth'];

const STORAGE_PREFIX = 'seismic-display-schemes:';
const STORAGE_VERSION = 1;

interface PersistedSchemes {
  version: number;
  schemes: DisplayScheme[];
  lastSchemeId: string | null;
}

interface DisplaySchemeState {
  /** 当前数据体下保存的全部方案。 */
  schemes: DisplayScheme[];
  /** 当前应用中的方案 ID（手动调整后仍然保留，用于判断是否有未保存修改）。 */
  activeSchemeId: string | null;
  /** 最近一次使用的方案 ID，用于切换数据体/刷新后恢复。 */
  lastSchemeId: string | null;
  /** 已完成方案初始化的数据体 ID，避免重复恢复。 */
  loadedSeismicId: number | null;
}

const initialState: DisplaySchemeState = {
  schemes: [],
  activeSchemeId: null,
  lastSchemeId: null,
  loadedSeismicId: null,
};

/** 默认显示快照：所有切片与体绘制均关闭（用于从未保存过方案的数据体）。 */
export const defaultSnapshot: DisplaySnapshot = {
  slices: {
    inline: { visible: false, opacity: 1, colormap: 'seismic' },
    crossline: { visible: false, opacity: 1, colormap: 'seismic' },
    depth: { visible: false, opacity: 1, colormap: 'seismic' },
  },
  volumeRendering: { enabled: false, opacity: 0.5 },
};

const loadPersisted = (seismicId: number): PersistedSchemes => {
  const fallback: PersistedSchemes = {
    version: STORAGE_VERSION,
    schemes: [],
    lastSchemeId: null,
  };
  try {
    const raw = localStorage.getItem(STORAGE_PREFIX + seismicId);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    if (parsed.version !== STORAGE_VERSION || !Array.isArray(parsed.schemes)) {
      return fallback;
    }
    return {
      version: STORAGE_VERSION,
      schemes: parsed.schemes as DisplayScheme[],
      lastSchemeId: parsed.lastSchemeId ?? null,
    };
  } catch (error) {
    console.error('读取显示方案失败:', error);
    return fallback;
  }
};

const persist = (seismicId: number, state: DisplaySchemeState) => {
  try {
    const data: PersistedSchemes = {
      version: STORAGE_VERSION,
      schemes: state.schemes,
      lastSchemeId: state.lastSchemeId,
    };
    localStorage.setItem(STORAGE_PREFIX + seismicId, JSON.stringify(data));
  } catch (error) {
    console.error('保存显示方案失败:', error);
  }
};

/** 从当前 viewer 状态中提取需要纳入方案的显示字段。 */
export const buildDisplaySnapshot = (
  slices: Record<SliceType, SliceConfig>,
  volumeRendering: VolumeRenderingConfig
): DisplaySnapshot => {
  const snapshotSlices = {} as Record<SliceType, DisplaySnapshot['slices'][SliceType]>;
  SLICE_TYPES.forEach((sliceType) => {
    const config = slices[sliceType];
    snapshotSlices[sliceType] = {
      visible: config.visible,
      opacity: config.opacity,
      colormap: config.colormap,
    };
  });
  return {
    slices: snapshotSlices,
    volumeRendering: {
      enabled: volumeRendering.enabled,
      opacity: volumeRendering.opacity,
    },
  };
};

/** 比较两份快照在方案字段上是否完全一致。 */
export const isSnapshotEqual = (a: DisplaySnapshot, b: DisplaySnapshot): boolean => {
  if (a.volumeRendering.enabled !== b.volumeRendering.enabled) return false;
  if (a.volumeRendering.opacity !== b.volumeRendering.opacity) return false;
  return SLICE_TYPES.every((sliceType) => {
    const sa = a.slices[sliceType];
    const sb = b.slices[sliceType];
    return (
      sa.visible === sb.visible &&
      sa.opacity === sb.opacity &&
      sa.colormap === sb.colormap
    );
  });
};

const generateSchemeId = (): string =>
  `scheme-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

const displaySchemeSlice = createSlice({
  name: 'displaySchemes',
  initialState,
  reducers: {
    hydrate: (
      state,
      action: PayloadAction<{
        seismicId: number;
        schemes: DisplayScheme[];
        lastSchemeId: string | null;
      }>
    ) => {
      state.loadedSeismicId = action.payload.seismicId;
      state.schemes = action.payload.schemes;
      state.lastSchemeId = action.payload.lastSchemeId;
      state.activeSchemeId = null;
    },
    setActiveScheme: (state, action: PayloadAction<string | null>) => {
      state.activeSchemeId = action.payload;
      if (action.payload) state.lastSchemeId = action.payload;
    },
    upsertScheme: (state, action: PayloadAction<DisplayScheme>) => {
      const index = state.schemes.findIndex((s) => s.id === action.payload.id);
      if (index === -1) {
        state.schemes.push(action.payload);
      } else {
        state.schemes[index] = action.payload;
      }
    },
    removeScheme: (state, action: PayloadAction<string>) => {
      state.schemes = state.schemes.filter((s) => s.id !== action.payload);
      if (state.activeSchemeId === action.payload) state.activeSchemeId = null;
      if (state.lastSchemeId === action.payload) state.lastSchemeId = null;
    },
  },
});

/**
 * 进入数据体时初始化方案列表，并恢复该数据体最近一次使用的方案。
 * 同一数据体重复调用不会重复恢复。
 */
export const initSchemesForSeismic =
  (seismicId: number): AppThunk =>
  (dispatch, getState) => {
    const schemeState = getState().displaySchemes;
    if (schemeState.loadedSeismicId === seismicId) return;

    const persisted = loadPersisted(seismicId);
    dispatch(
      hydrate({
        seismicId,
        schemes: persisted.schemes,
        lastSchemeId: persisted.lastSchemeId,
      })
    );

    const lastScheme =
      persisted.schemes.find((s) => s.id === persisted.lastSchemeId) ?? null;

    if (lastScheme) {
      // 恢复最近一次使用的方案：画布、控制面板、信息栏随 Redux 同时更新
      dispatch(applyDisplaySnapshot(lastScheme.snapshot));
      dispatch(setActiveScheme(lastScheme.id));
    } else {
      // 该数据体从未保存过方案，复位显示状态避免上一个数据体的配置残留
      dispatch(applyDisplaySnapshot(defaultSnapshot));
    }
  };

/** 一键切换到指定方案。 */
export const applyScheme =
  (schemeId: string): AppThunk =>
  (dispatch, getState) => {
    const state = getState().displaySchemes;
    const scheme = state.schemes.find((s) => s.id === schemeId);
    if (!scheme || state.loadedSeismicId !== scheme.seismicId) return;

    dispatch(applyDisplaySnapshot(scheme.snapshot));
    dispatch(setActiveScheme(scheme.id));
    persist(scheme.seismicId, getState().displaySchemes);
  };

/**
 * 将当前显示状态整组保存为新方案。
 * 名称为空或与现有方案重名（忽略首尾空格与大小写）时拒绝保存。
 */
export const saveCurrentAsScheme =
  (name: string): AppThunk<{ ok: boolean; error?: string; scheme?: DisplayScheme }> =>
  (dispatch, getState) => {
    const trimmed = name.trim();
    if (!trimmed) {
      return { ok: false, error: '方案名称不能为空' };
    }

    const state = getState().displaySchemes;
    const seismicId = state.loadedSeismicId;
    if (seismicId === null) {
      return { ok: false, error: '数据尚未加载完成，请稍后再试' };
    }

    const duplicated = state.schemes.some(
      (s) => s.name.trim().toLowerCase() === trimmed.toLowerCase()
    );
    if (duplicated) {
      return { ok: false, error: `已存在名为“${trimmed}”的显示方案，请更换名称` };
    }

    const { viewer } = getState();
    const now = new Date().toISOString();
    const scheme: DisplayScheme = {
      id: generateSchemeId(),
      name: trimmed,
      seismicId,
      snapshot: buildDisplaySnapshot(viewer.slices, viewer.volumeRendering),
      createdAt: now,
      updatedAt: now,
    };

    dispatch(upsertScheme(scheme));
    dispatch(setActiveScheme(scheme.id));
    persist(seismicId, getState().displaySchemes);
    return { ok: true, scheme };
  };

/** 用当前显示状态覆盖更新正在使用的方案。 */
export const updateActiveScheme =
  (): AppThunk<{ ok: boolean; error?: string }> =>
  (dispatch, getState) => {
    const state = getState().displaySchemes;
    const active = state.schemes.find((s) => s.id === state.activeSchemeId);
    if (!active || state.loadedSeismicId === null) {
      return { ok: false, error: '当前没有可更新的显示方案' };
    }

    const { viewer } = getState();
    const updated: DisplayScheme = {
      ...active,
      snapshot: buildDisplaySnapshot(viewer.slices, viewer.volumeRendering),
      updatedAt: new Date().toISOString(),
    };

    dispatch(upsertScheme(updated));
    persist(active.seismicId, getState().displaySchemes);
    return { ok: true };
  };

/** 删除指定方案；删除的是当前方案时清除激活标记。 */
export const deleteSchemeById =
  (schemeId: string): AppThunk =>
  (dispatch, getState) => {
    const state = getState().displaySchemes;
    const scheme = state.schemes.find((s) => s.id === schemeId);
    if (!scheme || state.loadedSeismicId === null) return;

    dispatch(removeScheme(schemeId));
    persist(scheme.seismicId, getState().displaySchemes);
  };

export const { hydrate, setActiveScheme, upsertScheme, removeScheme } =
  displaySchemeSlice.actions;
export default displaySchemeSlice.reducer;
