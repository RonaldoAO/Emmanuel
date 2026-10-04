import { describe, expect, it } from 'vitest';
import { normalizeDecimalInput, normalizeIntegerInput } from './numberInput';

describe('normalizeDecimalInput / normalizeIntegerInput', () => {
  it('accepts comma as decimal separator', () => {
    expect(normalizeDecimalInput('1,5')).toBeCloseTo(1.5);
  });
  it('accepts dot as decimal separator', () => {
    expect(normalizeDecimalInput('1.5')).toBeCloseTo(1.5);
  });
  it('rejects non-numeric text', () => {
    expect(normalizeDecimalInput('abc')).toBeNull();
  });
  it('rejects decimals for integer fields', () => {
    expect(normalizeIntegerInput('3,5')).toBeNull();
    expect(normalizeIntegerInput('4')).toBe(4);
  });
});
