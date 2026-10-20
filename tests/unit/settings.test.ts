import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { ERROR_CODES } from '@/lib/messages';
import messages from '../../public/_locales/en/messages.json';
import { PRESETS } from '@/lib/providers/presets';
import { defaultSettings, loadSettings, originPattern, resolveProvider, saveSettings } from '@/lib/settings';
import { STRING_KEYS } from '@/lib/strings';

describe('settings', () => {
  beforeEach(() => fakeBrowser.reset());

  it('loads defaults when nothing is stored', async () => {
    expect(await loadSettings()).toEqual(defaultSettings());
  });

  it('round-trips through storage.local only (FR-011 AC-001)', async () => {
    const saved = { providerId: 'mistral', apiKey: 'k', model: 'x', baseUrl: '' };
    await saveSettings(saved);
    expect(await loadSettings()).toEqual(saved);
    expect(await fakeBrowser.storage.sync.get(null)).toEqual({});
  });

  it('resolves presets and custom endpoints', () => {
    expect(resolveProvider({ providerId: 'groq', apiKey: ' k ', model: '', baseUrl: 'ignored' })).toEqual({
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: 'k',
      model: 'openai/gpt-oss-120b',
      jsonMode: true,
    });
    expect(resolveProvider({ providerId: 'custom', apiKey: '', model: 'm', baseUrl: 'http://127.0.0.1:1234/v1/' })).toMatchObject({
      baseUrl: 'http://127.0.0.1:1234/v1',
    });
    expect(resolveProvider({ providerId: 'nope', apiKey: '', model: 'm', baseUrl: '' })).toBeNull();
  });

  it('builds host permission patterns', () => {
    expect(originPattern('https://api.groq.com/openai/v1')).toBe('https://api.groq.com/*');
    expect(originPattern('http://127.0.0.1:1234/v1')).toBe('http://127.0.0.1/*');
    expect(originPattern('ftp://x')).toBeNull();
    expect(originPattern('not a url')).toBeNull();
  });

  it('has a preset base URL covered by optional_host_permissions', () => {
    for (const preset of PRESETS.filter((p) => p.baseUrl)) expect(preset.baseUrl.startsWith('https://')).toBe(true);
  });
});

describe('strings (FR-017)', () => {
  it('defines every string key and an error message for every shown error code', () => {
    const keys = Object.keys(messages);
    for (const key of STRING_KEYS) expect(keys).toContain(key);
    for (const code of ERROR_CODES.filter((c) => c !== 'cancelled')) expect(keys).toContain(`error_${code}`);
  });
});
