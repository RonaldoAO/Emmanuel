const DISALLOWED_CHARS = /[^A-Za-z0-9-]/g;
const MAX_PLATE_LENGTH = 10;

/**
 * Normalizes a vehicle identifier as typed into a cell: keeps letters,
 * digits and hyphens only (matching common license-plate formats like
 * "ABC-123"), uppercases it for consistent comparisons, and caps the
 * length so a cell can't grow unbounded.
 */
export function sanitizePlateInput(raw: string): string {
  return raw.replace(DISALLOWED_CHARS, '').toUpperCase().slice(0, MAX_PLATE_LENGTH);
}
