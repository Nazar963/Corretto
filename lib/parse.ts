// Tolerant parser for model output (docs/adr/0004-output-contract.md).

import { TONES, type Rewrites } from './messages';

/** First balanced `{...}` in `raw`, ignoring braces inside JSON strings. */
function extractObject(raw: string): string | null {
  const start = raw.indexOf('{');
  if (start === -1) return null;
  let depth = 0;
  let inString = false;
  let escaped = false;
  for (let i = start; i < raw.length; i++) {
    const char = raw[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === '\\') escaped = true;
      else if (char === '"') inString = false;
    } else if (char === '"') {
      inString = true;
    } else if (char === '{') {
      depth++;
    } else if (char === '}') {
      depth--;
      if (depth === 0) return raw.slice(start, i + 1);
    }
  }
  return null;
}

/** Three non-empty strings, or null if the output does not match the contract. */
export function parseRewrites(raw: string): Rewrites | null {
  const json = extractObject(raw);
  if (!json) return null;
  let value: unknown;
  try {
    value = JSON.parse(json);
  } catch {
    return null;
  }
  if (typeof value !== 'object' || value === null) return null;
  const record = value as Record<string, unknown>;
  const result: Partial<Rewrites> = {};
  for (const tone of TONES) {
    const text = record[tone];
    if (typeof text !== 'string' || text.trim() === '') return null;
    result[tone] = text.trim();
  }
  return result as Rewrites;
}
