import { DisplayScheme, DisplaySchemeStorageData } from '../types';

/**
 * 显示方案本地持久化。
 *
 * 方案按数据体 ID 分开存储，切换到其它数据体再切回、或刷新页面后，
 * 仍能恢复该数据体最近一次使用的方案。
 */

const STORAGE_KEY = 'seismic-viewer:display-schemes:v1';

type AllSchemesStorage = Record<string, DisplaySchemeStorageData>;

const isBrowser = typeof window !== 'undefined' && !!window.localStorage;

function loadAll(): AllSchemesStorage {
  if (!isBrowser) return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === 'object' ? (parsed as AllSchemesStorage) : {};
  } catch {
    return {};
  }
}

function saveAll(data: AllSchemesStorage): void {
  if (!isBrowser) return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch {
    // localStorage 不可用（隐私模式/配额已满）时静默降级，不影响页面使用
  }
}

/** 读取某个数据体保存的全部方案及最近一次使用的方案 */
export function loadSchemes(seismicId: number): DisplaySchemeStorageData {
  const data = loadAll()[String(seismicId)];
  if (!data || !Array.isArray(data.schemes)) {
    return { schemes: [], activeSchemeId: null };
  }
  return {
    schemes: data.schemes,
    activeSchemeId: data.activeSchemeId ?? null,
  };
}

export function saveSchemes(seismicId: number, data: DisplaySchemeStorageData): void {
  const all = loadAll();
  all[String(seismicId)] = data;
  saveAll(all);
}

export function createSchemeId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `scheme-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function isDuplicateSchemeName(
  schemes: DisplayScheme[],
  name: string,
  excludeSchemeId?: string
): boolean {
  const normalized = name.trim();
  return schemes.some(
    (scheme) =>
      scheme.id !== excludeSchemeId && scheme.name.trim() === normalized
  );
}
