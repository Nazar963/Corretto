// OpenAI-compatible chat-completions adapter (docs/adr/0003-provider-adapters.md).
// Covers Groq, Gemini's compatible endpoint, OpenRouter, Mistral, OpenAI and custom URLs.

import type { ErrorCode, Rewrites } from '../messages';
import { parseRewrites } from '../parse';
import { buildMessages } from '../prompt';
import type { ResolvedProvider } from '../settings';

export const DEFAULT_TIMEOUT_MS = 30_000;

export class ProviderError extends Error {
  constructor(readonly code: ErrorCode) {
    super(code);
  }
}

export interface AdapterDeps {
  fetch?: typeof fetch;
  /** Total time for all attempts. */
  timeoutMs?: number;
}

function codeForStatus(status: number): ErrorCode {
  if (status === 401 || status === 403) return 'invalid_key';
  if (status === 404) return 'model_not_found';
  if (status === 429) return 'rate_limited';
  return 'http';
}

async function chatCompletion(
  provider: ResolvedProvider,
  text: string,
  signals: { caller: AbortSignal; timeout: AbortSignal },
  fetchFn: typeof fetch,
): Promise<string> {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider.apiKey) headers.Authorization = `Bearer ${provider.apiKey}`;
  const body = {
    model: provider.model,
    messages: buildMessages(text),
    temperature: 0.4,
    ...(provider.jsonMode ? { response_format: { type: 'json_object' } } : {}),
  };
  const toError = (): ProviderError => {
    if (signals.caller.aborted) return new ProviderError('cancelled');
    if (signals.timeout.aborted) return new ProviderError('timeout');
    return new ProviderError('network');
  };

  let response: Response;
  try {
    response = await fetchFn(`${provider.baseUrl}/chat/completions`, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.any([signals.caller, signals.timeout]),
    });
  } catch {
    throw toError();
  }
  if (!response.ok) throw new ProviderError(codeForStatus(response.status));

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    if (signals.caller.aborted || signals.timeout.aborted) throw toError();
    throw new ProviderError('bad_output');
  }
  const content = (data as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new ProviderError('bad_output');
  return content;
}

/** Ask for three rewrites; retries once if the output does not match the contract (ADR-0004). */
export async function requestRewrites(
  provider: ResolvedProvider,
  text: string,
  signal: AbortSignal,
  { fetch: fetchFn = globalThis.fetch.bind(globalThis), timeoutMs = DEFAULT_TIMEOUT_MS }: AdapterDeps = {},
): Promise<Rewrites> {
  const timeout = AbortSignal.timeout(timeoutMs);
  for (let attempt = 0; attempt < 2; attempt++) {
    const raw = await chatCompletion(provider, text, { caller: signal, timeout }, fetchFn);
    const rewrites = parseRewrites(raw);
    if (rewrites) return rewrites;
  }
  throw new ProviderError('bad_output');
}
