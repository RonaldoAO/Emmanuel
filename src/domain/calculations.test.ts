import { describe, expect, it } from 'vitest';
import { calculateCuadraResult, deriveRowColors, findDuplicateVehicles, getCellKey } from './calculations';
import type { Cuadra, ObservationsMap } from './types';

function buildCuadra(id: string, slotCount: number, repCount: number): Cuadra {
  return {
    id,
    order: 1,
    name: null,
    cajones: Array.from({ length: slotCount }, (_, i) => ({ id: `${id}-c${i + 1}`, order: i + 1 })),
    recorridos: Array.from({ length: repCount }, (_, i) => ({ id: `${id}-r${i + 1}`, order: i + 1 })),
  };
}

// Pairs use plain numbers for readability (matching the original worked
// example); 0 means vacío and is stored as "" (i.e. not stored at all).
function fillPairs(cuadra: Cuadra, pairs: number[][]): ObservationsMap {
  const observations: ObservationsMap = {};
  pairs.forEach(([v1, v2], i) => {
    const cajon = cuadra.cajones[i];
    if (v1 > 0) observations[getCellKey(cuadra.id, cajon.id, cuadra.recorridos[0].id)] = String(v1);
    if (v2 > 0) observations[getCellKey(cuadra.id, cajon.id, cuadra.recorridos[1].id)] = String(v2);
  });
  return observations;
}

describe('calculateCuadraResult against the known worked example', () => {
  const cases = [
    { pairs: [[1, 1], [2, 2], [3, 4], [5, 5], [6, 6], [0, 7], [0, 8], [9, 10], [11, 11], [0, 12]], slots: 10, expected: { demanda: 12, vaciosPromedio: 1.5, rotacion: 1.2, duracionMinutos: 50, utilizacion: 0.85 } },
    { pairs: [[0, 1], [0, 2], [0, 3], [4, 4], [0, 5], [6, 7], [8, 8], [9, 9]], slots: 8, expected: { demanda: 9, vaciosPromedio: 2, rotacion: 1.125, duracionMinutos: 53.333333, utilizacion: 0.75 } },
    { pairs: [[1, 2], [3, 4], [5, 6], [0, 7], [0, 8], [0, 9], [10, 11], [12, 13], [0, 14], [15, 0]], slots: 10, expected: { demanda: 15, vaciosPromedio: 2.5, rotacion: 1.5, duracionMinutos: 40, utilizacion: 0.75 } },
    { pairs: [[1, 0], [2, 2], [3, 4], [5, 5], [6, 6], [7, 0]], slots: 6, expected: { demanda: 7, vaciosPromedio: 1, rotacion: 1.166667, duracionMinutos: 51.428571, utilizacion: 0.833333 } },
  ];

  cases.forEach(({ pairs, slots, expected }, index) => {
    it(`matches expected results for cuadra ${index + 1}`, () => {
      const cuadra = buildCuadra(`cuadra${index + 1}`, slots, 2);
      const observations = fillPairs(cuadra, pairs);
      const result = calculateCuadraResult(cuadra, 1, observations);
      expect(result.demanda).toBe(expected.demanda);
      expect(result.vaciosPromedio).toBeCloseTo(expected.vaciosPromedio, 6);
      expect(result.rotacion).toBeCloseTo(expected.rotacion, 5);
      expect(result.duracionMinutos as number).toBeCloseTo(expected.duracionMinutos, 2);
      expect(result.utilizacion).toBeCloseTo(expected.utilizacion, 5);
    });
  });

  it('doubling the duration halves rotation, doubles duration, keeps utilization', () => {
    const cuadra = buildCuadra('c1', 10, 2);
    const observations = fillPairs(cuadra, cases[0].pairs);
    const before = calculateCuadraResult(cuadra, 1, observations);
    const after = calculateCuadraResult(cuadra, 2, observations);
    expect(after.rotacion).toBeCloseTo(before.rotacion / 2, 6);
    expect(after.duracionMinutos as number).toBeCloseTo((before.duracionMinutos as number) * 2, 3);
    expect(after.utilizacion).toBeCloseTo(before.utilizacion, 6);
  });
});

describe('calculateCuadraResult edge cases', () => {
  it('returns zeros and a non-calculable duration when no vehicles were observed', () => {
    const cuadra = buildCuadra('c1', 4, 2);
    const result = calculateCuadraResult(cuadra, 1, {});
    expect(result.demanda).toBe(0);
    expect(result.rotacion).toBe(0);
    expect(result.utilizacion).toBe(0);
    expect(result.duracionHoras).toBeNull();
    expect(result.duracionMinutos).toBeNull();
  });

  it('counts a vehicle only once per cuadra even if seen in multiple recorridos', () => {
    const cuadra = buildCuadra('c1', 2, 2);
    const [slotA, slotB] = cuadra.cajones;
    const [rep1, rep2] = cuadra.recorridos;
    const observations = {
      [getCellKey('c1', slotA.id, rep1.id)]: '5',
      [getCellKey('c1', slotB.id, rep2.id)]: '5',
    };
    const result = calculateCuadraResult(cuadra, 1, observations);
    expect(result.demanda).toBe(1);
  });

  it('a missing cell behaves exactly like an explicit 0 (no pending state)', () => {
    const cuadra = buildCuadra('c1', 1, 1);
    const result = calculateCuadraResult(cuadra, 1, {});
    expect(result.vaciosPromedio).toBe(1);
  });
});

describe('findDuplicateVehicles', () => {
  it('flags the same vehicle occupying two cajones in the same recorrido', () => {
    const cuadra = buildCuadra('c1', 2, 1);
    const [slotA, slotB] = cuadra.cajones;
    const [rep1] = cuadra.recorridos;
    const observations = {
      [getCellKey('c1', slotA.id, rep1.id)]: '7',
      [getCellKey('c1', slotB.id, rep1.id)]: '7',
    };
    const duplicates = findDuplicateVehicles(cuadra, observations);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].vehicleId).toBe('7');
  });

  it('does not flag the same vehicle across different recorridos', () => {
    const cuadra = buildCuadra('c1', 2, 2);
    const [slotA] = cuadra.cajones;
    const [rep1, rep2] = cuadra.recorridos;
    const observations = {
      [getCellKey('c1', slotA.id, rep1.id)]: '7',
      [getCellKey('c1', slotA.id, rep2.id)]: '7',
    };
    expect(findDuplicateVehicles(cuadra, observations)).toHaveLength(0);
  });

  it('flags duplicate alphanumeric plates the same way as numeric ids', () => {
    const cuadra = buildCuadra('c1', 2, 1);
    const [slotA, slotB] = cuadra.cajones;
    const [rep1] = cuadra.recorridos;
    const observations = {
      [getCellKey('c1', slotA.id, rep1.id)]: 'ABC123',
      [getCellKey('c1', slotB.id, rep1.id)]: 'ABC123',
    };
    const duplicates = findDuplicateVehicles(cuadra, observations);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].vehicleId).toBe('ABC123');
  });
});

describe('deriveRowColors', () => {
  it('matches the exact user example: 1,2,2 → green, yellow, green', () => {
    const cuadra = buildCuadra('c1', 1, 3);
    const cajon = cuadra.cajones[0];
    const observations = {
      [getCellKey('c1', cajon.id, cuadra.recorridos[0].id)]: '1',
      [getCellKey('c1', cajon.id, cuadra.recorridos[1].id)]: '2',
      [getCellKey('c1', cajon.id, cuadra.recorridos[2].id)]: '2',
    };
    expect(deriveRowColors(cuadra, cajon.id, observations)).toEqual(['green', 'yellow', 'green']);
  });

  it('works the same way with license-plate-style alphanumeric ids', () => {
    const cuadra = buildCuadra('c1', 1, 3);
    const cajon = cuadra.cajones[0];
    const observations = {
      [getCellKey('c1', cajon.id, cuadra.recorridos[0].id)]: 'ABC-123',
      [getCellKey('c1', cajon.id, cuadra.recorridos[1].id)]: 'XYZ-999',
      [getCellKey('c1', cajon.id, cuadra.recorridos[2].id)]: 'XYZ-999',
    };
    expect(deriveRowColors(cuadra, cajon.id, observations)).toEqual(['green', 'yellow', 'green']);
  });

  it('only compares a recorrido against the immediately preceding one, not further back', () => {
    // 5, 6, 5 → green, yellow, yellow (recorrido 3 differs from recorrido 2's 6,
    // even though it matches recorrido 1's 5 — that match does not count).
    const cuadra = buildCuadra('c1', 1, 3);
    const cajon = cuadra.cajones[0];
    const observations = {
      [getCellKey('c1', cajon.id, cuadra.recorridos[0].id)]: '5',
      [getCellKey('c1', cajon.id, cuadra.recorridos[1].id)]: '6',
      [getCellKey('c1', cajon.id, cuadra.recorridos[2].id)]: '5',
    };
    expect(deriveRowColors(cuadra, cajon.id, observations)).toEqual(['green', 'yellow', 'yellow']);
  });

  it('a vacío ("") is always red, regardless of neighbors', () => {
    const cuadra = buildCuadra('c1', 1, 2);
    const cajon = cuadra.cajones[0];
    const observations = {
      [getCellKey('c1', cajon.id, cuadra.recorridos[0].id)]: '3',
    };
    // recorrido 2 left unset (vacío)
    expect(deriveRowColors(cuadra, cajon.id, observations)).toEqual(['green', 'red']);
  });

  it('occupying right after a vacío is green, not yellow (arrival, not turnover)', () => {
    const cuadra = buildCuadra('c1', 1, 2);
    const cajon = cuadra.cajones[0];
    const observations = {
      [getCellKey('c1', cajon.id, cuadra.recorridos[1].id)]: '7',
    };
    // recorrido 1 left unset (vacío), recorrido 2 = 7
    expect(deriveRowColors(cuadra, cajon.id, observations)).toEqual(['red', 'green']);
  });

  it('matches every row of the known worked example (cuadra 1)', () => {
    const cuadra = buildCuadra('c1', 10, 2);
    const observations = fillPairs(cuadra, [[1, 1], [2, 2], [3, 4], [5, 5], [6, 6], [0, 7], [0, 8], [9, 10], [11, 11], [0, 12]]);
    const expected: Array<['green' | 'yellow' | 'red', 'green' | 'yellow' | 'red']> = [
      ['green', 'green'], // 1,1 same vehicle stays
      ['green', 'green'], // 2,2
      ['green', 'yellow'], // 3,4 different vehicle
      ['green', 'green'], // 5,5
      ['green', 'green'], // 6,6
      ['red', 'green'], // 0,7 arrival after vacío
      ['red', 'green'], // 0,8
      ['green', 'yellow'], // 9,10 different vehicle
      ['green', 'green'], // 11,11
      ['red', 'green'], // 0,12
    ];
    cuadra.cajones.forEach((cajon, i) => {
      expect(deriveRowColors(cuadra, cajon.id, observations)).toEqual(expected[i]);
    });
  });
});
