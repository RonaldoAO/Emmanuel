import { describe, expect, it } from 'vitest';
import { getCellKey } from './calculations';
import {
  addCajon,
  addRecorrido,
  appendCuadraFromGrid,
  createInitialState,
  removeCajon,
  removeRecorrido,
  renameCuadra,
  setCellValue,
  setCuadraCount,
} from './operations';

describe('setCuadraCount', () => {
  it('adds empty cuadras at the end', () => {
    const state = setCuadraCount(createInitialState(), 2);
    expect(state.cuadras).toHaveLength(2);
    expect(state.cuadras[0].cajones).toHaveLength(0);
    expect(state.cuadras[0].recorridos).toHaveLength(0);
  });

  it('removes trailing cuadras and their observations', () => {
    let state = setCuadraCount(createInitialState(), 2);
    const [c1, c2] = state.cuadras;
    state = addCajon(state, c1.id);
    state = addRecorrido(state, c1.id);
    state = addCajon(state, c2.id);
    state = addRecorrido(state, c2.id);
    state = setCellValue(state, c2.id, state.cuadras[1].cajones[0].id, state.cuadras[1].recorridos[0].id, '5');

    state = setCuadraCount(state, 1);
    expect(state.cuadras).toHaveLength(1);
    expect(Object.keys(state.observations)).toHaveLength(0);
  });
});

describe('addCajon / removeCajon', () => {
  it('removing a cajón clears only its own observations, keeping others by id', () => {
    let state = setCuadraCount(createInitialState(), 1);
    const cuadraId = state.cuadras[0].id;
    state = addCajon(state, cuadraId);
    state = addCajon(state, cuadraId);
    state = addRecorrido(state, cuadraId);
    const [cajon1, cajon2] = state.cuadras[0].cajones;
    const rec1 = state.cuadras[0].recorridos[0];
    state = setCellValue(state, cuadraId, cajon1.id, rec1.id, 'AAA111');
    state = setCellValue(state, cuadraId, cajon2.id, rec1.id, 'BBB222');

    state = removeCajon(state, cuadraId, cajon1.id);
    expect(state.cuadras[0].cajones).toHaveLength(1);
    expect(state.cuadras[0].cajones[0].id).toBe(cajon2.id);
    expect(state.observations[getCellKey(cuadraId, cajon2.id, rec1.id)]).toBe('BBB222');
    expect(state.observations[getCellKey(cuadraId, cajon1.id, rec1.id)]).toBeUndefined();
  });
});

describe('addRecorrido / removeRecorrido', () => {
  it('removing a recorrido clears only its own column', () => {
    let state = setCuadraCount(createInitialState(), 1);
    const cuadraId = state.cuadras[0].id;
    state = addCajon(state, cuadraId);
    state = addRecorrido(state, cuadraId);
    state = addRecorrido(state, cuadraId);
    const cajon = state.cuadras[0].cajones[0];
    const [rec1, rec2] = state.cuadras[0].recorridos;
    state = setCellValue(state, cuadraId, cajon.id, rec1.id, '3');
    state = setCellValue(state, cuadraId, cajon.id, rec2.id, '4');

    state = removeRecorrido(state, cuadraId, rec1.id);
    expect(state.cuadras[0].recorridos).toHaveLength(1);
    expect(state.observations[getCellKey(cuadraId, cajon.id, rec2.id)]).toBe('4');
    expect(state.observations[getCellKey(cuadraId, cajon.id, rec1.id)]).toBeUndefined();
  });
});

describe('setCellValue', () => {
  it('setting an empty string clears the cell back to vacío (no stored key)', () => {
    let state = setCuadraCount(createInitialState(), 1);
    const cuadraId = state.cuadras[0].id;
    state = addCajon(state, cuadraId);
    state = addRecorrido(state, cuadraId);
    const cajon = state.cuadras[0].cajones[0];
    const rec = state.cuadras[0].recorridos[0];
    state = setCellValue(state, cuadraId, cajon.id, rec.id, '9');
    expect(state.observations[getCellKey(cuadraId, cajon.id, rec.id)]).toBe('9');
    state = setCellValue(state, cuadraId, cajon.id, rec.id, '');
    expect(state.observations[getCellKey(cuadraId, cajon.id, rec.id)]).toBeUndefined();
  });

  it('accepts an alphanumeric license-plate-style identifier', () => {
    let state = setCuadraCount(createInitialState(), 1);
    const cuadraId = state.cuadras[0].id;
    state = addCajon(state, cuadraId);
    state = addRecorrido(state, cuadraId);
    const cajon = state.cuadras[0].cajones[0];
    const rec = state.cuadras[0].recorridos[0];
    state = setCellValue(state, cuadraId, cajon.id, rec.id, 'ABC-123');
    expect(state.observations[getCellKey(cuadraId, cajon.id, rec.id)]).toBe('ABC-123');
  });
});

describe('renameCuadra', () => {
  it('starts with no custom name (null)', () => {
    const state = setCuadraCount(createInitialState(), 1);
    expect(state.cuadras[0].name).toBeNull();
  });

  it('sets a custom trimmed name', () => {
    let state = setCuadraCount(createInitialState(), 1);
    const cuadraId = state.cuadras[0].id;
    state = renameCuadra(state, cuadraId, '  Calle Principal  ');
    expect(state.cuadras[0].name).toBe('Calle Principal');
  });

  it('clearing the name (empty or blank string) resets it back to null', () => {
    let state = setCuadraCount(createInitialState(), 1);
    const cuadraId = state.cuadras[0].id;
    state = renameCuadra(state, cuadraId, 'Temporal');
    state = renameCuadra(state, cuadraId, '   ');
    expect(state.cuadras[0].name).toBeNull();
  });

  it('only renames the targeted cuadra', () => {
    let state = setCuadraCount(createInitialState(), 2);
    const [c1, c2] = state.cuadras;
    state = renameCuadra(state, c1.id, 'Norte');
    expect(state.cuadras.find((c) => c.id === c1.id)?.name).toBe('Norte');
    expect(state.cuadras.find((c) => c.id === c2.id)?.name).toBeNull();
  });
});

describe('appendCuadraFromGrid', () => {
  it('builds a new cuadra matching the grid dimensions, appended at the end', () => {
    let state = setCuadraCount(createInitialState(), 1);
    state = appendCuadraFromGrid(state, {
      name: 'PLANTA BAJA',
      recorridoCount: 2,
      grid: [
        ['ABC123', ''],
        ['', 'XYZ999'],
      ],
    });

    expect(state.cuadras).toHaveLength(2);
    const imported = state.cuadras[1];
    expect(imported.name).toBe('PLANTA BAJA');
    expect(imported.cajones).toHaveLength(2);
    expect(imported.recorridos).toHaveLength(2);

    const key1 = getCellKey(imported.id, imported.cajones[0].id, imported.recorridos[0].id);
    const key2 = getCellKey(imported.id, imported.cajones[1].id, imported.recorridos[1].id);
    expect(state.observations[key1]).toBe('ABC123');
    expect(state.observations[key2]).toBe('XYZ999');
    // vacío cells are never stored
    const emptyKey = getCellKey(imported.id, imported.cajones[0].id, imported.recorridos[1].id);
    expect(state.observations[emptyKey]).toBeUndefined();
  });

  it('does not touch existing cuadras or their observations', () => {
    let state = setCuadraCount(createInitialState(), 1);
    const existingId = state.cuadras[0].id;
    state = addCajon(state, existingId);
    state = addRecorrido(state, existingId);
    state = setCellValue(
      state,
      existingId,
      state.cuadras[0].cajones[0].id,
      state.cuadras[0].recorridos[0].id,
      'KEEP1',
    );

    state = appendCuadraFromGrid(state, { name: null, recorridoCount: 1, grid: [['NEW1']] });

    expect(state.cuadras[0].id).toBe(existingId);
    expect(
      state.observations[
        getCellKey(existingId, state.cuadras[0].cajones[0].id, state.cuadras[0].recorridos[0].id)
      ],
    ).toBe('KEEP1');
  });
});
