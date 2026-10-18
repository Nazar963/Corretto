// Field eligibility and minimum-length rules.
// See docs/requirements/product.md FR-001..FR-003 and docs/adr/0009-sensitive-fields.md.

export type TextField = HTMLTextAreaElement | HTMLInputElement;

/** Input types that hold free-form prose. Everything else is excluded (FR-003). */
const SUPPORTED_INPUT_TYPES = new Set(['text', 'search']);

/** `autocomplete` tokens that mark credential or payment fields. */
const SENSITIVE_AUTOCOMPLETE = new Set(['one-time-code', 'current-password', 'new-password']);

export interface MinimumLength {
  minWords: number;
  minChars: number;
}

/** Default from ADR-0010; becomes a user setting in slice 7. */
export const DEFAULT_MINIMUM: MinimumLength = { minWords: 3, minChars: 15 };

function hasSensitiveAutocomplete(el: Element): boolean {
  const value = el.getAttribute('autocomplete');
  if (!value) return false;
  return value
    .toLowerCase()
    .split(/\s+/)
    .some((token) => token.startsWith('cc-') || SENSITIVE_AUTOCOMPLETE.has(token));
}

/**
 * Whether `el` is a `<textarea>` or text-like `<input>` the button may attach to.
 * contenteditable support arrives in slice 4.
 */
export function isEligibleField(el: Element | null): el is TextField {
  if (!el) return false;
  let field: TextField;
  if (el instanceof HTMLTextAreaElement) {
    field = el;
  } else if (el instanceof HTMLInputElement) {
    // `type` reflects "text" for missing or unknown values, matching browser behaviour.
    if (!SUPPORTED_INPUT_TYPES.has(el.type)) return false;
    field = el;
  } else {
    return false;
  }
  if (field.readOnly || field.disabled) return false;
  return !hasSensitiveAutocomplete(field);
}

/** True when the text has at least `minWords` words or `minChars` non-space characters. */
export function meetsMinimumLength(text: string, minimum: MinimumLength = DEFAULT_MINIMUM): boolean {
  const trimmed = text.trim();
  if (trimmed === '') return false;
  const words = trimmed.split(/\s+/).length;
  const chars = trimmed.replace(/\s+/g, '').length;
  return words >= minimum.minWords || chars >= minimum.minChars;
}
