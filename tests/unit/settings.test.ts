import { beforeEach, describe, expect, it } from 'vitest';
import { fakeBrowser } from 'wxt/testing/fake-browser';
import { ERROR_CODES } from '@/lib/messages';
import messages from '../../public/_locales/en/messages.json';
import { PRESETS } from '@/lib/providers/presets';
import {
  CLOUD_TIMEOUT_MS,
  defaultSettings,
  LOCAL_TIMEOUT_MS,
  loadSettings,
  originPattern,
  resolveProvider,
  saveSettings,
} from '@/lib/settings';
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
      api: 'openai',
      baseUrl: 'https://api.groq.com/openai/v1',
      apiKey: 'k',
      model: 'openai/gpt-oss-120b',
      jsonMode: true,
      requiresKey: true,
      timeoutMs: CLOUD_TIMEOUT_MS,
    });
    expect(resolveProvider({ providerId: 'custom', apiKey: '', model: 'm', baseUrl: 'http://127.0.0.1:1234/v1/' })).toMatchObject({
      baseUrl: 'http://127.0.0.1:1234/v1',
      requiresKey: false,
    });
    expect(resolveProvider({ providerId: 'nope', apiKey: '', model: 'm', baseUrl: '' })).toBeNull();
  });

  it('resolves Anthropic with its own API style and default model', () => {
    expect(resolveProvider({ providerId: 'anthropic', apiKey: 'k', model: '', baseUrl: 'https://evil.example' })).toMatchObject({
      api: 'anthropic',
      baseUrl: 'https://api.anthropic.com/v1',
      model: 'claude-haiku-5-5',
      requiresKey: true,
    });
  });

  it.each([
    ['ollama', 'http://localhost:11434/v1'],
    ['lmstudio', 'http://localhost:1234/v1'],
  ])('resolves local preset %s: default URL, no key, long timeout, model required', (providerId, url) => {
    expect(resolveProvider({ providerId, apiKey: '', model: 'llama3.2', baseUrl: '' })).toMatchObject({
      baseUrl: url,
      requiresKey: false,
      timeoutMs: LOCAL_TIMEOUT_MS,
    });
    expect(resolveProvider({ providerId, apiKey: '', model: 'm', baseUrl: 'http://192.168.1.5:8080/v1' })!.baseUrl).toBe(
      'http://192.168.1.5:8080/v1',
    );
    expect(resolveProvider({ providerId, apiKey: '', model: '', baseUrl: '' })).toBeNull();
  });

  it('builds host permission patterns', () => {
    expect(originPattern('https://api.groq.com/openai/v1')).toBe('https://api.groq.com/*');
    expect(originPattern('http://127.0.0.1:1234/v1')).toBe('http://127.0.0.1/*');
    expect(originPattern('ftp://x')).toBeNull();
    expect(originPattern('not a url')).toBeNull();
  });

  it('has preset base URLs covered by optional_host_permissions', () => {
    for (const preset of PRESETS.filter((p) => p.baseUrl)) {
      const ok = preset.local ? preset.baseUrl.startsWith('http://localhost:') : preset.baseUrl.startsWith('https://');
      expect(ok, preset.id).toBe(true);
    }
  });
});

describe('strings (FR-017)', () => {
  it('defines every string key and an error message for every shown error code', () => {
    const keys = Object.keys(messages);
    for (const key of STRING_KEYS) expect(keys).toContain(key);
    for (const code of ERROR_CODES.filter((c) => c !== 'cancelled')) expect(keys).toContain(`error_${code}`);
  });
});
