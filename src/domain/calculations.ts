import type { Cuadra, ObservationsMap } from './types';

export function getCellKey(cuadraId: string, cajonId: string, recorridoId: string): string {
  return `${cuadraId}|${cajonId}|${recorridoId}`;
}

/** '' means vacío (no vehicle). Any other string is a vehicle identifier (e.g. a license plate). */
export function getCellValue(observations: ObservationsMap, key: string): string {
  return observations[key] ?? '';
}

export type CellColor = 'red' | 'green' | 'yellow';

/**
 * Color for every recorrido of a single cajón, derived purely from the
 * vehicle identifiers — there is no manual override. For each recorrido:
 * - vacío ('') → red
 * - the first recorrido, or the previous recorrido was vacío → green
 * - same vehicle as the immediately preceding recorrido → green (continúa)
 * - different vehicle than the immediately preceding recorrido → yellow
 *   (only compares recorrido n against n-1, never further back — so the
 *   same vehicle can reappear two recorridos later and be green again).
 */
export function deriveRowColors(cuadra: Cuadra, cajonId: string, observations: ObservationsMap): CellColor[] {
  const values = cuadra.recorridos.map((rec) => getCellValue(observations, getCellKey(cuadra.id, cajonId, rec.id)));
  return values.map((value, i) => {
    if (value === '') return 'red';
    const previous = i > 0 ? values[i - 1] : '';
    if (previous === '') return 'green';
    return previous === value ? 'green' : 'yellow';
  });
}

export interface DuplicateVehicleIssue {
  recorridoId: string;
  vehicleId: string;
  cajonIds: string[];
}

/** Same vehicle occupying two cajones during the same recorrido — a data-entry mistake worth flagging. */
export function findDuplicateVehicles(cuadra: Cuadra, observations: ObservationsMap): DuplicateVehicleIssue[] {
  const duplicates: DuplicateVehicleIssue[] = [];
  for (const rec of cuadra.recorridos) {
    const vehicleToCajones = new Map<string, string[]>();
    for (const cajon of cuadra.cajones) {
      const value = getCellValue(observations, getCellKey(cuadra.id, cajon.id, rec.id));
      if (value === '') continue;
      const existing = vehicleToCajones.get(value);
      if (existing) existing.push(cajon.id);
      else vehicleToCajones.set(value, [cajon.id]);
    }
    for (const [vehicleId, cajonIds] of vehicleToCajones) {
      if (cajonIds.length > 1) duplicates.push({ recorridoId: rec.id, vehicleId, cajonIds });
    }
  }
  return duplicates;
}

export interface CuadraResult {
  cuadraId: string;
  C: number; // oferta: número de cajones
  R: number; // número de recorridos
  T: number; // duración del estudio, en horas
  oferta: number;
  demanda: number; // N: ocupaciones observadas (ver nota debajo)
  vaciosPromedio: number;
  rotacion: number;
  /** null cuando no es calculable (no se observaron vehículos) */
  duracionHoras: number | null;
  duracionMinutos: number | null;
  utilizacion: number;
}

/**
 * N (demanda) = observaciones ocupadas, contando una sola vez cuando el
 * mismo vehículo permanece en el MISMO cajón del recorrido inmediatamente
 * anterior (una "estadía" continua), pero contando por separado si:
 * - es un vehículo distinto en ese cajón (cambio/turnover), o
 * - el mismo vehículo reaparece en un cajón DISTINTO (no se deduplica entre
 *   cajones — dos cajones ocupados por la misma placa al mismo tiempo son
 *   dos ocupaciones reales, no una).
 *
 * Es decir: N = O − (número de celdas cuyo valor es igual al del recorrido
 * anterior en el mismo cajón). Equivale a contar cada "racha" de verdes
 * consecutivos como una sola ocupación. Verificado exacto contra el
 * ejercicio original (demanda 12/9/15/7) y contra un estudio real con
 * colisiones de placas entre cajones distintos (ver import/importExcel.test.ts).
 */
export function calculateCuadraResult(cuadra: Cuadra, horas: number, observations: ObservationsMap): CuadraResult {
  const C = cuadra.cajones.length;
  const R = cuadra.recorridos.length;
  const T = horas;

  let occupied = 0; // O: observaciones ocupadas (celda con vehículo)
  let empty = 0; // V: observaciones vacías
  let continuations = 0; // mismo vehículo, mismo cajón, recorrido inmediatamente anterior

  for (const cajon of cuadra.cajones) {
    let previousValue = '';
    for (const rec of cuadra.recorridos) {
      const value = getCellValue(observations, getCellKey(cuadra.id, cajon.id, rec.id));
      if (value !== '') {
        occupied += 1;
        if (value === previousValue) continuations += 1;
      } else {
        empty += 1;
      }
      previousValue = value;
    }
  }

  const demanda = occupied - continuations;
  const vaciosPromedio = R > 0 ? empty / R : 0;
  const rotacion = C > 0 && T > 0 ? demanda / (C * T) : 0;
  const duracionHoras = rotacion > 0 ? 1 / rotacion : null;
  const duracionMinutos = duracionHoras !== null ? duracionHoras * 60 : null;
  const utilizacion = C > 0 && R > 0 ? occupied / (C * R) : 0;

  return {
    cuadraId: cuadra.id,
    C,
    R,
    T,
    oferta: C,
    demanda,
    vaciosPromedio,
    rotacion,
    duracionHoras,
    duracionMinutos,
    utilizacion,
  };
}
