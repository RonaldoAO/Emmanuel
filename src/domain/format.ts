/** Formats a number using "," as decimal separator and "." as thousands separator (es). */
export function formatNumberEs(value: number, maxDecimals = 2): string {
  const rounded = Number(value.toFixed(maxDecimals));
  const [intPart, decPart] = Math.abs(rounded).toString().split('.');
  const grouped = intPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');
  const sign = rounded < 0 ? '-' : '';
  return decPart ? `${sign}${grouped},${decPart}` : `${sign}${grouped}`;
}

export function formatPercentEs(fraction: number, maxDecimals = 2): string {
  return `${formatNumberEs(fraction * 100, maxDecimals)} %`;
}

export function formatDurationMinutes(minutes: number | null): string {
  if (minutes === null) return 'No calculable: no se observaron vehículos';
  return `${formatNumberEs(minutes, 2)} min`;
}
