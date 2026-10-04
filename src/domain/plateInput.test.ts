import { describe, expect, it } from 'vitest';
import { sanitizePlateInput } from './plateInput';

describe('sanitizePlateInput', () => {
  it('keeps letters, digits and hyphens', () => {
    expect(sanitizePlateInput('ABC-123')).toBe('ABC-123');
  });

  it('uppercases lowercase letters', () => {
    expect(sanitizePlateInput('abc123')).toBe('ABC123');
  });

  it('strips disallowed characters (spaces, symbols)', () => {
    expect(sanitizePlateInput('ABC 123!@#')).toBe('ABC123');
  });

  it('accepts a purely numeric id (backwards compatible with plain numbers)', () => {
    expect(sanitizePlateInput('42')).toBe('42');
  });

  it('caps the length', () => {
    expect(sanitizePlateInput('ABCDEFGHIJKLMNOP')).toHaveLength(10);
  });

  it('returns empty string for empty input', () => {
    expect(sanitizePlateInput('')).toBe('');
  });
});
