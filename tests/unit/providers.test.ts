import { describe, expect, it, vi } from 'vitest';
import { listModels, readErrorDetail, requestRewrites } from '@/lib/providers/index';
import { SYSTEM_PROMPT } from '@/lib/prompt';
import { CLOUD_TIMEOUT_MS } from '@/lib/settings';
import type { ResolvedProvider } from '@/lib/settings';

const provider: ResolvedProvider = {
  api: 'openai',
  baseUrl: 'https://api.example.com/v1',
  apiKey: 'k-123',
  model: 'm',
  jsonMode: true,
  requiresKey: true,
  timeoutMs: CLOUD_TIMEOUT_MS,
};
const rewrites = { minimal: 'a', fluent: 'b', formal: 'c' };

function reply(content: unknown, status = 200): Response {
  return new Response(JSON.stringify({ choices: [{ message: { content } }] }), { status });
}

function fakeFetch(...responses: (Response | Error)[]) {
  return vi.fn(async () => {
    const next = responses.shift();
    if (!next) throw new Error('unexpected call');
    if (next instanceof Error) throw next;
    return next;
  });
}

const signal = () => new AbortController().signal;

describe('OpenAI-compatible adapter (contract)', () => {
  it('sends an OpenAI-compatible request', async () => {
    const fetch = fakeFetch(reply(JSON.stringify(rewrites)));
    await requestRewrites(provider, 'helo', signal(), { fetch });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.example.com/v1/chat/completions');
    expect(init.method).toBe('POST');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer k-123', 'Content-Type': 'application/json' });
    const body = JSON.parse(init.body as string);
    expect(body).toMatchObject({ model: 'm', response_format: { type: 'json_object' } });
    expect(body.messages).toEqual([
      { role: 'system', content: SYSTEM_PROMPT },
      { role: 'user', content: 'helo' },
    ]);
  });

  it('omits JSON mode and the auth header when not applicable', async () => {
    const fetch = fakeFetch(reply(JSON.stringify(rewrites)));
    await requestRewrites({ ...provider, apiKey: '', jsonMode: false }, 'x', signal(), { fetch });
    const init = (fetch.mock.calls[0] as unknown as [string, RequestInit])[1];
    expect(init.headers).not.toHaveProperty('Authorization');
    expect(JSON.parse(init.body as string)).not.toHaveProperty('response_format');
  });

  it('returns parsed rewrites', async () => {
    await expect(requestRewrites(provider, 'x', signal(), { fetch: fakeFetch(reply(JSON.stringify(rewrites))) })).resolves.toEqual(
      rewrites,
    );
  });

  it('retries once on unreadable output, then succeeds', async () => {
    const fetch = fakeFetch(reply('not json'), reply(JSON.stringify(rewrites)));
    await expect(requestRewrites(provider, 'x', signal(), { fetch })).resolves.toEqual(rewrites);
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('fails with bad_output after two unreadable answers', async () => {
    const fetch = fakeFetch(reply('nope'), reply(42));
    await expect(requestRewrites(provider, 'x', signal(), { fetch })).rejects.toMatchObject({ code: 'bad_output' });
    expect(fetch).toHaveBeenCalledTimes(2);
  });

  it('fails with bad_output when the body is not JSON', async () => {
    const fetch = fakeFetch(new Response('<html>', { status: 200 }));
    await expect(requestRewrites(provider, 'x', signal(), { fetch })).rejects.toMatchObject({ code: 'bad_output' });
  });

  it.each([
    [401, 'invalid_key'],
    [403, 'invalid_key'],
    [404, 'model_not_found'],
    [429, 'rate_limited'],
    [500, 'http'],
    [400, 'http'],
  ])('maps HTTP %i to %s', async (status, code) => {
    const fetch = fakeFetch(new Response('{}', { status }));
    await expect(requestRewrites(provider, 'x', signal(), { fetch })).rejects.toMatchObject({ code });
  });

  it('maps a network failure to network', async () => {
    const fetch = fakeFetch(new TypeError('Failed to fetch'));
    await expect(requestRewrites(provider, 'x', signal(), { fetch })).rejects.toMatchObject({ code: 'network' });
  });

  const hanging = vi.fn(
    (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      }),
  );

  it('maps a timeout to timeout', async () => {
    await expect(requestRewrites(provider, 'x', signal(), { fetch: hanging, timeoutMs: 20 })).rejects.toMatchObject({
      code: 'timeout',
    });
  });

  it('maps a caller abort to cancelled', async () => {
    const controller = new AbortController();
    const pending = requestRewrites(provider, 'x', controller.signal, { fetch: hanging, timeoutMs: 5000 });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ code: 'cancelled' });
  });
});

describe('provider error detail', () => {
  const json = (body: unknown, status = 400) => new Response(JSON.stringify(body), { status });

  it('reads the OpenAI error shape', async () => {
    expect(await readErrorDetail(json({ error: { message: 'Model gone' } }), 'k')).toBe('Model gone');
  });

  it("reads Gemini's array error shape", async () => {
    expect(await readErrorDetail(json([{ error: { message: 'Please pass a valid API key' } }]), 'k')).toBe(
      'Please pass a valid API key',
    );
  });

  it('redacts the key and collapses whitespace', async () => {
    const key = 'sk-test-123456';
    expect(await readErrorDetail(json({ error: { message: `Bad key  ${key}\n here` } }), key)).toBe('Bad key *** here');
  });

  it('shortens long messages', async () => {
    const detail = await readErrorDetail(json({ error: { message: 'x'.repeat(500) } }), 'k');
    expect(detail).toHaveLength(200);
    expect(detail!.endsWith('…')).toBe(true);
  });

  it.each([
    ['non-JSON body', new Response('<html>', { status: 500 })],
    ['no message', json({ error: {} })],
    ['empty body', new Response('', { status: 502 })],
  ])('returns undefined for %s', async (_name, response) => {
    expect(await readErrorDetail(response, 'k')).toBeUndefined();
  });

  it('attaches the detail to the error and maps a 400 key message to invalid_key', async () => {
    const fetch = fakeFetch(json([{ error: { message: 'API key not valid. Please pass a valid API key.' } }]));
    await expect(requestRewrites(provider, 'x', signal(), { fetch })).rejects.toMatchObject({
      code: 'invalid_key',
      detail: 'API key not valid. Please pass a valid API key.',
    });
  });

  it('keeps other 400s as http with their detail', async () => {
    const fetch = fakeFetch(json({ error: { message: 'Unsupported parameter: response_format' } }));
    await expect(requestRewrites(provider, 'x', signal(), { fetch })).rejects.toMatchObject({
      code: 'http',
      detail: 'Unsupported parameter: response_format',
    });
  });
});

describe('Anthropic adapter (contract)', () => {
  const claude: ResolvedProvider = {
    api: 'anthropic',
    baseUrl: 'https://api.anthropic.com/v1',
    apiKey: 'sk-ant-test-123456',
    model: 'claude-haiku-5-5',
    jsonMode: false,
    requiresKey: true,
    timeoutMs: CLOUD_TIMEOUT_MS,
  };
  const message = (content: unknown[], stop_reason = 'end_turn') =>
    new Response(JSON.stringify({ type: 'message', content, stop_reason }));

  it('sends a Messages API request with the BYOK browser headers', async () => {
    const fetch = fakeFetch(message([{ type: 'text', text: JSON.stringify(rewrites) }]));
    await requestRewrites(claude, 'helo', signal(), { fetch });
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/messages');
    expect(init.headers).toEqual({
      'Content-Type': 'application/json',
      'x-api-key': 'sk-ant-test-123456',
      'anthropic-version': '2023-06-01',
      'anthropic-dangerous-direct-browser-access': 'true',
    });
    const body = JSON.parse(init.body as string);
    expect(body).toEqual({
      model: 'claude-haiku-5-5',
      max_tokens: 16000,
      system: SYSTEM_PROMPT,
      messages: [{ role: 'user', content: 'helo' }],
      output_config: { effort: 'low' },
    });
    // Rejected on current models: non-default sampling values and manual thinking budgets.
    expect(body).not.toHaveProperty('temperature');
    expect(body).not.toHaveProperty('thinking');
  });

  it('skips thinking blocks and reads the text blocks', async () => {
    const fetch = fakeFetch(
      message([
        { type: 'thinking', thinking: '', signature: 'x' },
        { type: 'text', text: '{"minimal": "a", ' },
        { type: 'text', text: '"fluent": "b", "formal": "c"}' },
      ]),
    );
    await expect(requestRewrites(claude, 'x', signal(), { fetch })).resolves.toEqual(rewrites);
  });

  it('reports a refusal as unreadable output with an explanation', async () => {
    const fetch = fakeFetch(message([], 'refusal'), message([], 'refusal'));
    await expect(requestRewrites(claude, 'x', signal(), { fetch })).rejects.toMatchObject({
      code: 'bad_output',
      detail: 'The model declined to rewrite this text.',
    });
  });

  it.each([
    [401, 'authentication_error', 'invalid x-api-key', 'invalid_key'],
    [404, 'not_found_error', 'model: claude-nope', 'model_not_found'],
    [429, 'rate_limit_error', 'Number of requests has exceeded your rate limit', 'rate_limited'],
    [529, 'overloaded_error', 'Overloaded', 'http'],
  ])('maps HTTP %i (%s) with its message', async (status, type, text, code) => {
    const fetch = fakeFetch(new Response(JSON.stringify({ type: 'error', error: { type, message: text } }), { status }));
    await expect(requestRewrites(claude, 'x', signal(), { fetch })).rejects.toMatchObject({ code, detail: text });
  });

  it('lists only Claude models', async () => {
    const fetch = fakeFetch(
      new Response(JSON.stringify({ data: [{ id: 'claude-sonnet-5-5' }, { id: 'claude-haiku-5-5' }, { id: 'other' }] })),
    );
    await expect(listModels(claude, signal(), { fetch })).resolves.toEqual(['claude-haiku-5-5', 'claude-sonnet-5-5']);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.anthropic.com/v1/models?limit=100');
    expect(init.method).toBe('GET');
  });
});

describe('listModels (OpenAI-compatible)', () => {
  it('strips the models/ prefix, drops non-chat models and sorts', async () => {
    const ids = ['models/gemini-3.5-flash-lite', 'models/gemini-embedding-2', 'models/veo-3.1-generate-preview', 'llama3.2:latest'];
    const fetch = fakeFetch(new Response(JSON.stringify({ data: ids.map((id) => ({ id })) })));
    await expect(listModels(provider, signal(), { fetch })).resolves.toEqual(['gemini-3.5-flash-lite', 'llama3.2:latest']);
    const [url, init] = fetch.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe('https://api.example.com/v1/models');
    expect(init.headers).toMatchObject({ Authorization: 'Bearer k-123' });
  });

  it('reports an unexpected body as unreadable', async () => {
    const fetch = fakeFetch(new Response(JSON.stringify({ models: [] })));
    await expect(listModels(provider, signal(), { fetch })).rejects.toMatchObject({ code: 'bad_output' });
  });
});

describe('timeouts', () => {
  it("uses the provider's own timeout when none is given", async () => {
    const quick = { ...provider, timeoutMs: 20 };
    const never = (_url: string | URL | Request, init?: RequestInit) =>
      new Promise<Response>((_resolve, reject) => {
        init?.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')));
      });
    await expect(requestRewrites(quick, 'x', signal(), { fetch: never })).rejects.toMatchObject({ code: 'timeout' });
  });
});
