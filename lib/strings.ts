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
  'errorGeneric',
  'retry',
] as const;

export type Strings = Record<(typeof STRING_KEYS)[number], string>;

export function loadStrings(): Strings {
  return Object.fromEntries(STRING_KEYS.map((key) => [key, browser.i18n.getMessage(key)])) as Strings;
}
