// Field eligibility and minimum-length rules.
// See docs/requirements/product.md FR-001..FR-003 and docs/adr/0009-sensitive-fields.md.

export type TextField = HTMLTextAreaElement | HTMLInputElement;
/** A text field, or the editing host of a contenteditable region (Gmail, LinkedIn, ...). */
export type Field = TextField | HTMLElement;

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

export function isTextField(el: Element): el is TextField {
  return el instanceof HTMLTextAreaElement || el instanceof HTMLInputElement;
}

/** The outermost contenteditable element: focus and input events target it. */
export function isEditingHost(el: Element): el is HTMLElement {
  if (!(el instanceof HTMLElement) || !el.isContentEditable) return false;
  const parent = el.parentElement;
  return !parent || !parent.isContentEditable;
}

/** Whether the button may attach to `el` (FR-001, FR-003). */
export function isEligibleField(el: Element | null): el is Field {
  if (!el) return false;
  if (isEditingHost(el)) {
    return el.getAttribute('aria-readonly') !== 'true' && el.getAttribute('aria-disabled') !== 'true';
  }
  if (!isTextField(el)) return false;
  // `type` reflects "text" for missing or unknown values, matching browser behaviour.
  if (el instanceof HTMLInputElement && !SUPPORTED_INPUT_TYPES.has(el.type)) return false;
  if (el.readOnly || el.disabled) return false;
  return !hasSensitiveAutocomplete(el);
}

/** The field's whole text; contenteditable uses innerText so block breaks become newlines. */
export function fieldText(field: Field): string {
  return isTextField(field) ? field.value : field.innerText;
}

/** True when the text has at least `minWords` words or `minChars` non-space characters. */
export function meetsMinimumLength(text: string, minimum: MinimumLength = DEFAULT_MINIMUM): boolean {
  const trimmed = text.trim();
  if (trimmed === '') return false;
  const words = trimmed.split(/\s+/).length;
  const chars = trimmed.replace(/\s+/g, '').length;
  return words >= minimum.minWords || chars >= minimum.minChars;
}
