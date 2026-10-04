/**
 * Normalizes a user-entered number that may use either "," or "." as the
 * decimal separator. Returns null when the text is not a valid number.
 */
export function normalizeDecimalInput(text: string): number | null {
  const trimmed = text.trim();
  if (trimmed === '') return null;
  const normalized = trimmed.replace(',', '.');
  if (!/^-?\d+(\.\d+)?$/.test(normalized)) return null;
  const value = Number(normalized);
  return Number.isFinite(value) ? value : null;
}

export function normalizeIntegerInput(text: string): number | null {
  const value = normalizeDecimalInput(text);
  if (value === null) return null;
  if (!Number.isInteger(value)) return null;
  return value;
}
