import { getCellKey } from './calculations';
import { generateId } from './id';
import type { AppState, Cuadra, ObservationsMap } from './types';
import { CURRENT_FORMAT_VERSION } from './types';

export function createInitialState(): AppState {
  return {
    formatVersion: CURRENT_FORMAT_VERSION,
    horas: 1,
    cuadras: [],
    observations: {},
  };
}

function nextOrder(items: { order: number }[]): number {
  return items.length === 0 ? 1 : Math.max(...items.map((i) => i.order)) + 1;
}

function reindexOrders<T extends { order: number }>(items: T[]): T[] {
  return items.map((item, i) => ({ ...item, order: i + 1 }));
}

function omitKeys<T>(map: Record<string, T>, keys: string[]): Record<string, T> {
  if (keys.length === 0) return map;
  const removeSet = new Set(keys);
  const next: Record<string, T> = {};
  for (const [key, value] of Object.entries(map)) {
    if (!removeSet.has(key)) next[key] = value;
  }
  return next;
}

/** Sets how many cuadra tables exist, adding empty ones at the end or removing trailing ones. */
export function setCuadraCount(state: AppState, count: number): AppState {
  const current = state.cuadras;
  if (count === current.length) return state;

  if (count > current.length) {
    const additions: Cuadra[] = [];
    for (let i = current.length; i < count; i += 1) {
      additions.push({ id: generateId('cuadra'), order: i + 1, name: null, cajones: [], recorridos: [] });
    }
    return { ...state, cuadras: [...current, ...additions] };
  }

  const removed = current.slice(count);
  const removedCuadraIds = new Set(removed.map((c) => c.id));
  const removedKeys = Object.keys(state.observations).filter((key) => removedCuadraIds.has(key.split('|')[0]));

  return {
    ...state,
    cuadras: current.slice(0, count),
    observations: omitKeys(state.observations, removedKeys),
  };
}

export function setHoras(state: AppState, horas: number): AppState {
  return { ...state, horas };
}

/** Removes a single cuadra and all of its observations. The remaining cuadras keep their own ids/data. */
export function removeCuadra(state: AppState, cuadraId: string): AppState {
  const cuadra = state.cuadras.find((c) => c.id === cuadraId);
  if (!cuadra) return state;
  const removedKeys = Object.keys(state.observations).filter((key) => key.split('|')[0] === cuadraId);
  return {
    ...state,
    cuadras: reindexOrders(state.cuadras.filter((c) => c.id !== cuadraId)),
    observations: omitKeys(state.observations, removedKeys),
  };
}

/** Removes every cuadra and all observations, keeping horas as-is. */
export function clearAllCuadras(state: AppState): AppState {
  if (state.cuadras.length === 0) return state;
  return { ...state, cuadras: [], observations: {} };
}

function updateCuadra(state: AppState, cuadraId: string, updater: (cuadra: Cuadra) => Cuadra): AppState {
  const index = state.cuadras.findIndex((c) => c.id === cuadraId);
  if (index === -1) return state;
  const nextCuadras = [...state.cuadras];
  nextCuadras[index] = updater(nextCuadras[index]);
  return { ...state, cuadras: nextCuadras };
}

/** Sets a cuadra's custom display name. Pass null (or an empty/blank string) to go back to the default "Cuadra {posición}". */
export function renameCuadra(state: AppState, cuadraId: string, name: string | null): AppState {
  const trimmed = name?.trim() ?? '';
  return updateCuadra(state, cuadraId, (cuadra) => ({ ...cuadra, name: trimmed === '' ? null : trimmed }));
}

export function addCajon(state: AppState, cuadraId: string): AppState {
  return updateCuadra(state, cuadraId, (cuadra) => ({
    ...cuadra,
    cajones: [...cuadra.cajones, { id: generateId('cajon'), order: nextOrder(cuadra.cajones) }],
  }));
}

export function addRecorrido(state: AppState, cuadraId: string): AppState {
  return updateCuadra(state, cuadraId, (cuadra) => ({
    ...cuadra,
    recorridos: [...cuadra.recorridos, { id: generateId('recorrido'), order: nextOrder(cuadra.recorridos) }],
  }));
}

export function removeCajon(state: AppState, cuadraId: string, cajonId: string): AppState {
  const cuadra = state.cuadras.find((c) => c.id === cuadraId);
  if (!cuadra) return state;
  const removedKeys = cuadra.recorridos.map((rec) => getCellKey(cuadraId, cajonId, rec.id));
  const nextState = updateCuadra(state, cuadraId, (c) => ({
    ...c,
    cajones: reindexOrders(c.cajones.filter((slot) => slot.id !== cajonId)),
  }));
  return {
    ...nextState,
    observations: omitKeys(nextState.observations, removedKeys),
  };
}

export function removeRecorrido(state: AppState, cuadraId: string, recorridoId: string): AppState {
  const cuadra = state.cuadras.find((c) => c.id === cuadraId);
  if (!cuadra) return state;
  const removedKeys = cuadra.cajones.map((cajon) => getCellKey(cuadraId, cajon.id, recorridoId));
  const nextState = updateCuadra(state, cuadraId, (c) => ({
    ...c,
    recorridos: reindexOrders(c.recorridos.filter((rec) => rec.id !== recorridoId)),
  }));
  return {
    ...nextState,
    observations: omitKeys(nextState.observations, removedKeys),
  };
}

/**
 * Appends a new cuadra built from an imported grid (e.g. parsed from an
 * uploaded spreadsheet): `grid[cajonIndex][recorridoIndex]` is a vehicle
 * plate, or '' for vacío. Existing cuadras and their data are untouched.
 */
export function appendCuadraFromGrid(
  state: AppState,
  options: { name: string | null; grid: string[][]; recorridoCount: number },
): AppState {
  const { name, grid, recorridoCount } = options;
  const cuadraId = generateId('cuadra');
  const cajones = grid.map((_, i) => ({ id: generateId('cajon'), order: i + 1 }));
  const recorridos = Array.from({ length: recorridoCount }, (_, i) => ({
    id: generateId('recorrido'),
    order: i + 1,
  }));

  const observations: ObservationsMap = { ...state.observations };
  grid.forEach((row, cajonIndex) => {
    row.forEach((value, recIndex) => {
      if (value === '') return;
      observations[getCellKey(cuadraId, cajones[cajonIndex].id, recorridos[recIndex].id)] = value;
    });
  });

  const cuadra: Cuadra = {
    id: cuadraId,
    order: nextOrder(state.cuadras),
    name,
    cajones,
    recorridos,
  };

  return { ...state, cuadras: [...state.cuadras, cuadra], observations };
}

/** Sets a cell's vehicle identifier. An empty string means vacío (the key is removed, not stored). */
export function setCellValue(
  state: AppState,
  cuadraId: string,
  cajonId: string,
  recorridoId: string,
  value: string,
): AppState {
  const key = getCellKey(cuadraId, cajonId, recorridoId);
  const observations: ObservationsMap = { ...state.observations };
  if (value === '') {
    delete observations[key];
  } else {
    observations[key] = value;
  }
  return { ...state, observations };
}
