import type { AppState } from './types';
import { CURRENT_FORMAT_VERSION } from './types';

const STORAGE_KEY = 'parking_app_state_v2';

export function loadState(): AppState | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AppState;
    if (parsed.formatVersion !== CURRENT_FORMAT_VERSION) return null;
    return parsed;
  } catch {
    return null;
  }
}

/** Throws if the write fails (quota exceeded, storage disabled, etc.) so callers can surface a real error. */
export function saveState(state: AppState): void {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}
