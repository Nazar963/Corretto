// Background-side rewrite: validation, permission check, provider call, error mapping.

import type { RewriteResponse } from './messages';
import { ProviderError, requestRewrites, type AdapterDeps } from './providers/openai';
import { originPattern, resolveProvider, type Settings } from './settings';

/** NFR performance: bound latency and cost. */
export const MAX_INPUT_CHARS = 5000;

export interface ServiceDeps extends AdapterDeps {
  hasPermission: (originPattern: string) => Promise<boolean>;
}

export async function rewrite(
  text: string,
  settings: Settings,
  signal: AbortSignal,
  deps: ServiceDeps,
): Promise<RewriteResponse> {
  const fail = (code: Extract<RewriteResponse, { ok: false }>['error']['code']): RewriteResponse => ({
    ok: false,
    error: { code },
  });

  if (text.length > MAX_INPUT_CHARS) return fail('too_long');
  const provider = resolveProvider(settings);
  if (!provider) return fail('not_configured');
  // Every cloud preset needs a key; a custom endpoint (e.g. a local server) may not.
  if (!provider.apiKey && settings.providerId !== 'custom') return fail('no_key');
  const pattern = originPattern(provider.baseUrl);
  if (!pattern) return fail('not_configured');
  if (!(await deps.hasPermission(pattern))) return fail('permission');

  try {
    return { ok: true, rewrites: await requestRewrites(provider, text, signal, deps) };
  } catch (error) {
    if (!(error instanceof ProviderError)) return fail('unknown');
    return { ok: false, error: error.detail ? { code: error.code, detail: error.detail } : { code: error.code } };
  }
}
