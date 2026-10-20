// Display preferences, stored apart from provider settings so the content script can read and
// watch them without ever loading the API key (docs/adr/0002-llm-calls-in-background.md).

import { DEFAULT_MINIMUM, type MinimumLength } from './fields';
import { DEFAULT_SENSITIVE_SITES } from './sites';

export interface Prefs extends MinimumLength {
  /** Sites where the user turned Corretto off from the toolbar popup (FR-012). */
  disabledSites: string[];
  /** Sites where Corretto never appears; starts from the default list (FR-013). */
  sensitiveSites: string[];
}

const STORAGE_KEY = 'prefs';

export function defaultPrefs(): Prefs {
  return { ...DEFAULT_MINIMUM, disabledSites: [], sensitiveSites: [...DEFAULT_SENSITIVE_SITES] };
}

function clampCount(value: unknown, fallback: number): number {
  const n = Math.round(Number(value));
  return Number.isFinite(n) && n >= 1 && n <= 1000 ? n : fallback;
}

/** Fill gaps and repair invalid values, so a damaged entry never breaks the content script. */
export function sanitizePrefs(stored: Partial<Prefs> | undefined): Prefs {
  const defaults = defaultPrefs();
  const list = (value: unknown, fallback: string[]) =>
    Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : fallback;
  return {
    minWords: clampCount(stored?.minWords, defaults.minWords),
    minChars: clampCount(stored?.minChars, defaults.minChars),
    disabledSites: list(stored?.disabledSites, defaults.disabledSites),
    sensitiveSites: list(stored?.sensitiveSites, defaults.sensitiveSites),
  };
}

export async function loadPrefs(): Promise<Prefs> {
  return sanitizePrefs((await browser.storage.local.get(STORAGE_KEY))[STORAGE_KEY] as Partial<Prefs> | undefined);
}

export async function savePrefs(prefs: Prefs): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: sanitizePrefs(prefs) });
}

/** Call `onChange` whenever prefs change in any tab or extension page. Returns an unsubscribe function. */
export function watchPrefs(onChange: (prefs: Prefs) => void): () => void {
  const listener = (changes: Record<string, { newValue?: unknown }>, area: string) => {
    if (area === 'local' && STORAGE_KEY in changes) {
      onChange(sanitizePrefs(changes[STORAGE_KEY]!.newValue as Partial<Prefs> | undefined));
    }
  };
  browser.storage.onChanged.addListener(listener);
  return () => browser.storage.onChanged.removeListener(listener);
}
