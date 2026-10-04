import writeExcelFile from 'write-excel-file/browser';
import { calculateCuadraResult, deriveRowColors, type CellColor } from '../domain/calculations';
import { formatNumberEs, formatPercentEs } from '../domain/format';
import type { Cuadra, ObservationsMap } from '../domain/types';

const COLOR_RED = '#FCA5A5';
const COLOR_GREEN = '#86EFAC';
const COLOR_YELLOW = '#FDE68A';
const COLOR_HEADER = '#E5E7EB';

type Cell = { value: string | number; backgroundColor?: string; fontWeight?: 'bold' };

const COLOR_HEX: Record<CellColor, string> = {
  red: COLOR_RED,
  green: COLOR_GREEN,
  yellow: COLOR_YELLOW,
};

export function cuadraDisplayName(cuadra: Cuadra, cuadraIndex: number): string {
  return cuadra.name ?? `Cuadra ${cuadraIndex + 1}`;
}

/** Excel sheet names can't contain : \ / ? * [ ] and are capped at 31 characters. */
function sanitizeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, '').trim();
  const safe = cleaned === '' ? 'Cuadra' : cleaned;
  return safe.slice(0, 31);
}

export function buildCuadraSheetData(
  cuadra: Cuadra,
  cuadraIndex: number,
  horas: number,
  observations: ObservationsMap,
): Cell[][] {
  const result = calculateCuadraResult(cuadra, horas, observations);
  const rows: Cell[][] = [];

  const title = cuadraDisplayName(cuadra, cuadraIndex);
  rows.push([{ value: title, fontWeight: 'bold', backgroundColor: COLOR_HEADER }]);

  const headerRow: Cell[] = [{ value: '# cajones', fontWeight: 'bold', backgroundColor: COLOR_HEADER }];
  cuadra.recorridos.forEach((_, i) => {
    headerRow.push({ value: `Recorrido ${i + 1}`, fontWeight: 'bold', backgroundColor: COLOR_HEADER });
  });
  rows.push(headerRow);

  cuadra.cajones.forEach((cajon, cajonIndex) => {
    const rowColors = deriveRowColors(cuadra, cajon.id, observations);
    const row: Cell[] = [{ value: cajonIndex + 1, fontWeight: 'bold', backgroundColor: COLOR_HEADER }];
    cuadra.recorridos.forEach((rec, recIndex) => {
      const value = observations[`${cuadra.id}|${cajon.id}|${rec.id}`] ?? '';
      row.push({ value, backgroundColor: COLOR_HEX[rowColors[recIndex]] });
    });
    rows.push(row);
  });

  rows.push([{ value: '' }]);
  rows.push([{ value: 'Oferta (cajones)', fontWeight: 'bold' }, { value: result.oferta }]);
  rows.push([{ value: 'Demanda (vehículos distintos)', fontWeight: 'bold' }, { value: result.demanda }]);
  rows.push([{ value: 'Cajones vacíos promedio', fontWeight: 'bold' }, { value: formatNumberEs(result.vaciosPromedio) }]);
  rows.push([{ value: 'Índice de rotación (veh/cajón/h)', fontWeight: 'bold' }, { value: formatNumberEs(result.rotacion, 6) }]);
  rows.push([
    { value: 'Duración del ejemplo', fontWeight: 'bold' },
    { value: result.duracionMinutos === null ? 'No calculable' : `${formatNumberEs(result.duracionMinutos, 2)} min` },
  ]);
  rows.push([{ value: 'Utilización de capacidad', fontWeight: 'bold' }, { value: formatPercentEs(result.utilizacion) }]);

  return rows;
}

export async function downloadCuadraExcel(
  cuadra: Cuadra,
  cuadraIndex: number,
  horas: number,
  observations: ObservationsMap,
): Promise<void> {
  const data = buildCuadraSheetData(cuadra, cuadraIndex, horas, observations);
  await writeExcelFile(data).toFile(`${sanitizeSheetName(cuadraDisplayName(cuadra, cuadraIndex))}.xlsx`);
}

export async function downloadAllCuadrasExcel(
  cuadras: Cuadra[],
  horas: number,
  observations: ObservationsMap,
): Promise<void> {
  const usedNames = new Set<string>();
  const sheets = cuadras.map((cuadra, index) => {
    let sheetName = sanitizeSheetName(cuadraDisplayName(cuadra, index));
    // Sheet names must be unique within a workbook; disambiguate collisions
    // (e.g. two cuadras both renamed to the same thing) by appending a number.
    let suffix = 2;
    while (usedNames.has(sheetName)) {
      sheetName = `${sanitizeSheetName(cuadraDisplayName(cuadra, index)).slice(0, 28)} (${suffix})`;
      suffix += 1;
    }
    usedNames.add(sheetName);
    return { sheet: sheetName, data: buildCuadraSheetData(cuadra, index, horas, observations) };
  });
  await writeExcelFile(sheets).toFile('oferta-demanda-estacionamiento.xlsx');
}
