import { describe, expect, it, vi } from 'vitest';
import { availableModels, MAX_INPUT_CHARS, rewrite } from '@/lib/rewrite-service';
import type { Settings } from '@/lib/settings';

const settings: Settings = { providerId: 'groq', apiKey: 'k', model: 'm', baseUrl: '' };
const ok = JSON.stringify({ minimal: 'a', fluent: 'b', formal: 'c' });
const okFetch = () => vi.fn(async () => new Response(JSON.stringify({ choices: [{ message: { content: ok } }] })));
const allow = { hasPermission: async () => true };
const signal = new AbortController().signal;

describe('rewrite service', () => {
  it('returns rewrites for a configured provider', async () => {
    const response = await rewrite('hello', settings, signal, { ...allow, fetch: okFetch() });
    expect(response).toEqual({ ok: true, rewrites: { minimal: 'a', fluent: 'b', formal: 'c' } });
  });

  it('rejects text over the limit without calling the provider', async () => {
    const fetch = okFetch();
    const response = await rewrite('x'.repeat(MAX_INPUT_CHARS + 1), settings, signal, { ...allow, fetch });
    expect(response).toEqual({ ok: false, error: { code: 'too_long' } });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('requires a key for cloud presets', async () => {
    const response = await rewrite('hello', { ...settings, apiKey: ' ' }, signal, { ...allow, fetch: okFetch() });
    expect(response).toEqual({ ok: false, error: { code: 'no_key' } });
  });

  it('allows a custom endpoint without a key', async () => {
    const custom = { providerId: 'custom', apiKey: '', model: 'm', baseUrl: 'http://127.0.0.1:1234/v1' };
    const response = await rewrite('hello', custom, signal, { ...allow, fetch: okFetch() });
    expect(response.ok).toBe(true);
  });

  it('reports not_configured for an incomplete custom endpoint', async () => {
    const custom = { providerId: 'custom', apiKey: '', model: 'm', baseUrl: '' };
    expect(await rewrite('hello', custom, signal, { ...allow, fetch: okFetch() })).toEqual({
      ok: false,
      error: { code: 'not_configured' },
    });
  });

  it('checks the host permission for the provider origin', async () => {
    const hasPermission = vi.fn(async () => false);
    const fetch = okFetch();
    expect(await rewrite('hello', settings, signal, { hasPermission, fetch })).toEqual({
      ok: false,
      error: { code: 'permission' },
    });
    expect(hasPermission).toHaveBeenCalledWith('https://api.groq.com/*');
    expect(fetch).not.toHaveBeenCalled();
  });

  it('passes the provider detail through', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ error: { message: 'Model retired' } }), { status: 404 }));
    expect(await rewrite('hello', settings, signal, { ...allow, fetch })).toEqual({
      ok: false,
      error: { code: 'model_not_found', detail: 'Model retired' },
    });
  });

  it('lets a local server run without a key', async () => {
    const local = { providerId: 'ollama', apiKey: '', model: 'llama3.2', baseUrl: '' };
    const hasPermission = vi.fn(async () => true);
    expect((await rewrite('hello', local, signal, { hasPermission, fetch: okFetch() })).ok).toBe(true);
    expect(hasPermission).toHaveBeenCalledWith('http://localhost/*');
  });

  it('requires a key for Anthropic', async () => {
    const claude = { providerId: 'anthropic', apiKey: '', model: '', baseUrl: '' };
    expect(await rewrite('hello', claude, signal, { ...allow, fetch: okFetch() })).toEqual({ ok: false, error: { code: 'no_key' } });
  });
});

describe('available models', () => {
  it('lists models without needing a model name', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ data: [{ id: 'llama3.2:latest' }] })));
    const local = { providerId: 'ollama', apiKey: '', model: '', baseUrl: '' };
    expect(await availableModels(local, signal, { ...allow, fetch })).toEqual({ ok: true, models: ['llama3.2:latest'] });
  });

  it('checks the key and permission first', async () => {
    const fetch = vi.fn();
    expect(await availableModels({ ...settings, apiKey: '' }, signal, { ...allow, fetch })).toEqual({
      ok: false,
      error: { code: 'no_key' },
    });
    expect(await availableModels(settings, signal, { hasPermission: async () => false, fetch })).toEqual({
      ok: false,
      error: { code: 'permission' },
    });
    expect(fetch).not.toHaveBeenCalled();
  });
});
