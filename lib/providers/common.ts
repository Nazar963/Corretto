// Shared HTTP, timeout and error handling for provider adapters (docs/adr/0003-provider-adapters.md).

import type { ErrorCode } from '../messages';

export class ProviderError extends Error {
  constructor(
    readonly code: ErrorCode,
    readonly detail?: string,
  ) {
    super(code);
  }
}

export interface AdapterDeps {
  fetch?: typeof fetch;
  /** Total time for all attempts; defaults to the provider's own timeout. */
  timeoutMs?: number;
}

export interface Signals {
  caller: AbortSignal;
  timeout: AbortSignal;
}

const MAX_DETAIL_CHARS = 200;

/**
 * The provider's error message from a failed response, if any. Handles the OpenAI and
 * Anthropic shape `{error: {message}}` and Gemini's `[{error: {message}}]`. Never includes the key.
 */
export async function readErrorDetail(response: Response, apiKey: string): Promise<string | undefined> {
  let message: unknown;
  try {
    const body: unknown = await response.json();
    const first = Array.isArray(body) ? body[0] : body;
    message = (first as { error?: { message?: unknown } })?.error?.message;
  } catch {
    return undefined;
  }
  if (typeof message !== 'string' || message.trim() === '') return undefined;
  let detail = message.trim().replace(/\s+/g, ' ');
  // Short strings are not real keys; redacting them would mangle ordinary words.
  if (apiKey.length >= 8) detail = detail.split(apiKey).join('***');
  return detail.length > MAX_DETAIL_CHARS ? `${detail.slice(0, MAX_DETAIL_CHARS - 1)}…` : detail;
}

function codeForStatus(status: number, detail: string | undefined): ErrorCode {
  if (status === 401 || status === 403) return 'invalid_key';
  // Gemini answers a bad key with 400 "API key not valid" / "Please pass a valid API key".
  if (status === 400 && detail && /api key/i.test(detail)) return 'invalid_key';
  if (status === 404) return 'model_not_found';
  if (status === 429) return 'rate_limited';
  return 'http';
}

/** Fetch JSON, mapping aborts, network failures and HTTP errors to ProviderError. */
export async function fetchJson(
  url: string,
  init: { method: 'GET' | 'POST'; headers: Record<string, string>; body?: unknown },
  apiKey: string,
  signals: Signals,
  fetchFn: typeof fetch,
): Promise<unknown> {
  const toError = (): ProviderError => {
    if (signals.caller.aborted) return new ProviderError('cancelled');
    if (signals.timeout.aborted) return new ProviderError('timeout');
    return new ProviderError('network');
  };

  let response: Response;
  try {
    response = await fetchFn(url, {
      method: init.method,
      headers: init.headers,
      ...(init.body === undefined ? {} : { body: JSON.stringify(init.body) }),
      signal: AbortSignal.any([signals.caller, signals.timeout]),
    });
  } catch {
    throw toError();
  }
  if (!response.ok) {
    const detail = await readErrorDetail(response, apiKey);
    throw new ProviderError(codeForStatus(response.status, detail), detail);
  }
  try {
    return await response.json();
  } catch {
    if (signals.caller.aborted || signals.timeout.aborted) throw toError();
    throw new ProviderError('bad_output');
  }
}

/** Model ids that are clearly not chat models (embeddings, speech, images, video, music). */
const NON_CHAT_MODEL =
  /embed|tts|transcri|whisper|audio|image|imagen|veo|lyria|dall-e|moderation|aqa|robotics|computer-use|live|nano-banana/i;

export function chatModels(ids: string[]): string[] {
  return [...new Set(ids.map((id) => id.replace(/^models\//, '')))].filter((id) => !NON_CHAT_MODEL.test(id)).sort();
}
