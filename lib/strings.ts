// User-facing strings come from _locales (FR-017).

export const STRING_KEYS = [
  'buttonLabel',
  'panelLabel',
  'toneMinimal',
  'toneFluent',
  'toneFormal',
  'loading',
  'cancel',
  'replaced',
  'undo',
  'retry',
  'openSettings',
  'error_not_configured',
  'error_no_key',
  'error_permission',
  'error_invalid_key',
  'error_model_not_found',
  'error_rate_limited',
  'error_timeout',
  'error_network',
  'error_bad_output',
  'error_too_long',
  'error_http',
  'error_unknown',
] as const;

export type Strings = Record<(typeof STRING_KEYS)[number], string>;

export function loadStrings(): Strings {
  return Object.fromEntries(STRING_KEYS.map((key) => [key, browser.i18n.getMessage(key)])) as Strings;
}
