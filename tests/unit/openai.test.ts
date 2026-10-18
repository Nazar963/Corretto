import { describe, expect, it, vi } from 'vitest';
import { requestRewrites } from '@/lib/providers/openai';
import { SYSTEM_PROMPT } from '@/lib/prompt';
import type { ResolvedProvider } from '@/lib/settings';

const provider: ResolvedProvider = { baseUrl: 'https://api.example.com/v1', apiKey: 'k-123', model: 'm', jsonMode: true };
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

describe('requestRewrites (contract)', () => {
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
