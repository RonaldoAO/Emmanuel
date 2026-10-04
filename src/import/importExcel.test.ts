import { describe, expect, it } from 'vitest';
import readXlsxFile from 'read-excel-file/node';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { calculateCuadraResult } from '../domain/calculations';
import type { Cuadra, ObservationsMap } from '../domain/types';
import { parseSheetRows } from './importExcel';

const fixturePath = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '__fixtures__/datos-estac.xlsx',
);

describe('parseSheetRows against a real parking-study .xlsx export', () => {
  it('extracts one 128-cajón / 6-recorrido block named after "Nivel:"', async () => {
    const sheets = await readXlsxFile(fixturePath);
    const blocks = sheets.flatMap((sheet) => parseSheetRows(sheet.sheet, sheet.data as unknown[][]));

    expect(blocks).toHaveLength(1);
    const block = blocks[0];
    expect(block.name).toBe('PLANTA BAJA');
    expect(block.grid).toHaveLength(128);
    expect(block.recorridoCount).toBe(6);
  });

  // The file reports three independent 1-hour periods, each covering two
  // consecutive recorrido columns: (9:00,10:00), (13:00,14:00), (17:00,18:00).
  // Its own embedded "Calculo de cajones" section reports, per period:
  //   Oferta=128/128/128, Demanda=107/97/77, Cajones vacíos=27.0/35.0/71.5,
  //   Utilización=79%/73%/44%.
  //
  // Cross-checking those against this app's formulas: Oferta, Cajones vacíos
  // promedio and Utilización match the file exactly for all three periods —
  // those only depend on counting "0" cells, which is unambiguous. Demanda
  // does NOT match (this app computes N = distinct vehicle identifiers,
  // verified correct against the exercise's original worked example; the
  // source file instead appears to count cajones occupied in either
  // recorrido of the period, not deduplicated by vehicle). The two are
  // genuinely different metrics: this file has real plate collisions
  // (cajón 13 and cajón 43 both show "16C" at both 9:00 and 10:00), so
  // "distinct plates" and "occupied cajones" diverge. This test only
  // asserts what this app actually computes; it does not claim to
  // reproduce the source file's own Demanda/Rotación/Duración.
  it("matches the spreadsheet's own Oferta/Cajones vacíos/Utilización for each period", async () => {
    const sheets = await readXlsxFile(fixturePath);
    const [block] = sheets.flatMap((sheet) => parseSheetRows(sheet.sheet, sheet.data as unknown[][]));

    const periods = [
      { cols: [0, 1], oferta: 128, vaciosPromedio: 27.0, utilizacion: 0.79 },
      { cols: [2, 3], oferta: 128, vaciosPromedio: 35.0, utilizacion: 0.73 },
      { cols: [4, 5], oferta: 128, vaciosPromedio: 71.5, utilizacion: 0.44 },
    ];

    for (const period of periods) {
      const cuadra: Cuadra = {
        id: 'c',
        order: 1,
        name: null,
        cajones: block.grid.map((_, i) => ({ id: `s${i}`, order: i + 1 })),
        recorridos: period.cols.map((_, i) => ({ id: `r${i}`, order: i + 1 })),
      };
      const observations: ObservationsMap = {};
      block.grid.forEach((row, cajonIndex) => {
        period.cols.forEach((col, recIndex) => {
          const value = row[col];
          if (value !== '') observations[`c|s${cajonIndex}|r${recIndex}`] = value;
        });
      });

      const result = calculateCuadraResult(cuadra, 1, observations);
      expect(result.oferta).toBe(period.oferta);
      expect(result.vaciosPromedio).toBeCloseTo(period.vaciosPromedio, 1);
      expect(result.utilizacion).toBeCloseTo(period.utilizacion, 2);
    }
  });
});
