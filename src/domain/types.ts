export interface Recorrido {
  id: string;
  order: number;
}

export interface Cajon {
  id: string;
  order: number;
}

export interface Cuadra {
  id: string;
  order: number;
  /** null means "no custom name" — displayed as "Cuadra {posición}". */
  name: string | null;
  cajones: Cajon[];
  recorridos: Recorrido[];
}

/**
 * Keys are `${cuadraId}|${cajonId}|${recorridoId}`. A missing key (or an
 * empty string) means the cell is vacío — there is no separate "pending"
 * state: every cell starts out empty/red by default. A non-empty value is a
 * vehicle identifier (letters and/or numbers, like a license plate).
 */
export type ObservationsMap = Record<string, string>;

export interface AppState {
  formatVersion: number;
  horas: number;
  cuadras: Cuadra[];
  observations: ObservationsMap;
}

export const CURRENT_FORMAT_VERSION = 3;
