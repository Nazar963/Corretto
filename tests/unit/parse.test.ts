import { describe, expect, it } from 'vitest';
import { parseRewrites } from '@/lib/parse';

const valid = { minimal: 'a', fluent: 'b', formal: 'c' };

describe('parseRewrites (ADR-0004)', () => {
  it('parses a plain JSON object', () => {
    expect(parseRewrites(JSON.stringify(valid))).toEqual(valid);
  });

  it('strips code fences and surrounding prose', () => {
    expect(parseRewrites('Sure! Here you go:\n```json\n' + JSON.stringify(valid) + '\n```\nEnjoy.')).toEqual(valid);
  });

  it('handles braces and quotes inside strings', () => {
    const tricky = { minimal: 'use {x}', fluent: 'say "hi" }', formal: 'back\\slash' };
    expect(parseRewrites(JSON.stringify(tricky))).toEqual(tricky);
  });

  it('keeps line breaks and non-Latin text, trimming outer whitespace', () => {
    const value = { minimal: ' Привет,\nмир ', fluent: 'こんにちは', formal: 'مرحبا' };
    expect(parseRewrites(JSON.stringify(value))).toEqual({ minimal: 'Привет,\nмир', fluent: 'こんにちは', formal: 'مرحبا' });
  });

  it('takes the first object, even when wrapped in an array (ADR-0004)', () => {
    expect(parseRewrites(JSON.stringify([valid]))).toEqual(valid);
  });

  it('ignores extra keys', () => {
    expect(parseRewrites(JSON.stringify({ ...valid, note: 'x' }))).toEqual(valid);
  });

  it.each([
    ['empty', ''],
    ['no object', 'I cannot help with that'],
    ['truncated', '{"minimal": "a", "fluent": "b", "formal": "c'],
    ['missing key', JSON.stringify({ minimal: 'a', fluent: 'b' })],
    ['wrong type', JSON.stringify({ ...valid, formal: 3 })],
    ['blank value', JSON.stringify({ ...valid, fluent: '  ' })],
  ])('rejects %s', (_name, raw) => {
    expect(parseRewrites(raw)).toBeNull();
  });
});
