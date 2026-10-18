// Settings live in storage.local only, never storage.sync (docs/adr/0008-privacy.md).
// Only the background and extension pages read them; content scripts never do (ADR-0002).

import { findPreset, PRESETS } from './providers/presets';

export interface Settings {
  providerId: string;
  apiKey: string;
  model: string;
  /** Used for the custom provider; presets use their own base URL. */
  baseUrl: string;
}

const STORAGE_KEY = 'settings';

export function defaultSettings(): Settings {
  const preset = PRESETS[0]!;
  return { providerId: preset.id, apiKey: '', model: preset.defaultModel, baseUrl: '' };
}

export async function loadSettings(): Promise<Settings> {
  const stored = (await browser.storage.local.get(STORAGE_KEY))[STORAGE_KEY] as Partial<Settings> | undefined;
  return { ...defaultSettings(), ...stored };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await browser.storage.local.set({ [STORAGE_KEY]: settings });
}

export interface ResolvedProvider {
  baseUrl: string;
  apiKey: string;
  model: string;
  jsonMode: boolean;
}

/** Base URL and flags for the chosen provider, or null if the configuration is incomplete. */
export function resolveProvider(settings: Settings): ResolvedProvider | null {
  const preset = findPreset(settings.providerId);
  if (!preset) return null;
  const baseUrl = (preset.id === 'custom' ? settings.baseUrl : preset.baseUrl).trim().replace(/\/+$/, '');
  const model = settings.model.trim() || preset.defaultModel;
  if (!baseUrl || !model) return null;
  return { baseUrl, apiKey: settings.apiKey.trim(), model, jsonMode: preset.jsonMode };
}

/** Host-permission pattern for a base URL, e.g. `https://api.groq.com/*` (docs/adr/0007-permissions.md). */
export function originPattern(baseUrl: string): string | null {
  try {
    const url = new URL(baseUrl);
    if (url.protocol !== 'https:' && url.protocol !== 'http:') return null;
    return `${url.protocol}//${url.hostname}/*`;
  } catch {
    return null;
  }
}
