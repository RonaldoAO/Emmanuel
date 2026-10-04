import readXlsxFile from 'read-excel-file/browser';
import { sanitizePlateInput } from '../domain/plateInput';

export interface ParsedCuadraBlock {
  /** Taken from the nearest "Nivel:" label above the table, or the sheet name as a fallback. */
  name: string | null;
  /** grid[cajonIndex][recorridoIndex] = sanitized vehicle plate, or '' for vacío. */
  grid: string[][];
  recorridoCount: number;
}

export interface ImportResult {
  blocks: ParsedCuadraBlock[];
  errors: string[];
}

// `read-excel-file`'s own cell type is a bit unusual (it includes the `Date`
// constructor type itself alongside instances), so raw rows are kept as
// `unknown[]` and narrowed at the point of use via `cellToText`/`typeof`.
type RawRow = unknown[];

const ANCHOR_TEXT = 'numero de cajones';
const NIVEL_PREFIX = 'nivel';
const MAX_CAJONES_PER_BLOCK = 5000;
const MAX_RECORRIDOS_PER_BLOCK = 500;
const NIVEL_SEARCH_WINDOW = 15;

function normalize(text: unknown): string {
  if (typeof text !== 'string') return '';
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
    .toLowerCase();
}

function cellToText(value: unknown): string {
  if (value === null || value === undefined) return '';
  if (value instanceof Date) return value.toLocaleDateString('es-ES');
  return String(value).trim();
}

/** Looks upward from `beforeRow` for a "Nivel:" label and returns the value next to it. */
function findNivelName(rows: RawRow[], beforeRow: number): string | null {
  const from = Math.max(0, beforeRow - NIVEL_SEARCH_WINDOW);
  for (let r = beforeRow - 1; r >= from; r--) {
    const row = rows[r] ?? [];
    for (let c = 0; c < row.length; c++) {
      if (normalize(row[c]).startsWith(NIVEL_PREFIX)) {
        for (let c2 = c + 1; c2 < row.length; c2++) {
          const value = cellToText(row[c2]);
          if (value !== '') return value;
        }
      }
    }
  }
  return null;
}

/**
 * Scans a sheet's raw rows for one or more "Número de cajones" / "Recorridos"
 * tables (the format used in professional parking-study spreadsheets): an
 * anchor cell, a row of time/recorrido labels right below it, a row of
 * recorrido numbers below that, then one row per cajón with its plate (or
 * "0" for vacío) under each recorrido column.
 */
export function parseSheetRows(sheetName: string, rows: RawRow[]): ParsedCuadraBlock[] {
  const blocks: ParsedCuadraBlock[] = [];
  let r = 0;

  while (r < rows.length) {
    const row = rows[r] ?? [];
    const anchorCol = row.findIndex((cell) => normalize(cell) === ANCHOR_TEXT);
    if (anchorCol === -1) {
      r += 1;
      continue;
    }

    const labelsRow = rows[r + 1] ?? [];
    let recorridoCount = 0;
    for (let c = anchorCol + 1; c < labelsRow.length; c += 1) {
      if (cellToText(labelsRow[c]) === '') break;
      recorridoCount += 1;
    }

    if (recorridoCount === 0 || recorridoCount > MAX_RECORRIDOS_PER_BLOCK) {
      r += 1;
      continue;
    }

    const firstCajonRow = r + 3;
    const grid: string[][] = [];
    let cajonRow = firstCajonRow;
    while (cajonRow < rows.length && grid.length < MAX_CAJONES_PER_BLOCK) {
      const dataRow = rows[cajonRow] ?? [];
      const label = dataRow[anchorCol];
      const isCajonRow =
        typeof label === 'number' || (typeof label === 'string' && /^\d+$/.test(label.trim()));
      if (!isCajonRow) break;

      const gridRow: string[] = [];
      for (let c = 0; c < recorridoCount; c += 1) {
        const text = cellToText(dataRow[anchorCol + 1 + c]);
        gridRow.push(text === '' || text === '0' ? '' : sanitizePlateInput(text));
      }
      grid.push(gridRow);
      cajonRow += 1;
    }

    if (grid.length > 0) {
      blocks.push({
        name: findNivelName(rows, r) ?? (sheetName.trim() !== '' ? sheetName.trim() : null),
        grid,
        recorridoCount,
      });
    }

    // Continue scanning right after this block (skips past it so its own
    // rows are never re-matched as a new anchor).
    r = Math.max(cajonRow, r + 1);
  }

  return blocks;
}

export async function importExcelFile(file: File): Promise<ImportResult> {
  let sheets: { sheet: string; data: RawRow[] }[];
  try {
    sheets = await readXlsxFile(file);
  } catch {
    return { blocks: [], errors: ['No se pudo leer el archivo. Verifica que sea un .xlsx válido.'] };
  }

  const blocks = sheets.flatMap((sheet) => parseSheetRows(sheet.sheet, sheet.data));

  if (blocks.length === 0) {
    return {
      blocks: [],
      errors: [
        'No se encontró ninguna tabla de cajones en este archivo. Se busca una celda "Número de cajones" seguida de la fila de recorridos.',
      ],
    };
  }

  return { blocks, errors: [] };
}
