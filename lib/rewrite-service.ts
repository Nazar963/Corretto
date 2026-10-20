// Background-side provider calls: validation, permission check, adapter call, error mapping.

import type { ErrorCode, ListModelsResponse, RewriteError, RewriteResponse } from './messages';
import { listModels, ProviderError, requestRewrites, type AdapterDeps } from './providers/index';
import { originPattern, resolveProvider, type ResolvedProvider, type Settings } from './settings';

/** NFR performance: bound latency and cost. */
export const MAX_INPUT_CHARS = 5000;

export interface ServiceDeps extends AdapterDeps {
  hasPermission: (originPattern: string) => Promise<boolean>;
}

function toError(error: unknown): RewriteError {
  if (!(error instanceof ProviderError)) return { code: 'unknown' };
  return error.detail ? { code: error.code, detail: error.detail } : { code: error.code };
}

/** Resolve the provider and check key and host permission before any network call. */
async function prepare(settings: Settings, deps: ServiceDeps): Promise<ResolvedProvider | ErrorCode> {
  const provider = resolveProvider(settings);
  if (!provider) return 'not_configured';
  if (provider.requiresKey && !provider.apiKey) return 'no_key';
  const pattern = originPattern(provider.baseUrl);
  if (!pattern) return 'not_configured';
  if (!(await deps.hasPermission(pattern))) return 'permission';
  return provider;
}

export async function rewrite(
  text: string,
  settings: Settings,
  signal: AbortSignal,
  deps: ServiceDeps,
): Promise<RewriteResponse> {
  if (text.length > MAX_INPUT_CHARS) return { ok: false, error: { code: 'too_long' } };
  const provider = await prepare(settings, deps);
  if (typeof provider === 'string') return { ok: false, error: { code: provider } };
  try {
    return { ok: true, rewrites: await requestRewrites(provider, text, signal, deps) };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}

/** Models the configured key can use; a model name is not required for this call. */
export async function availableModels(settings: Settings, signal: AbortSignal, deps: ServiceDeps): Promise<ListModelsResponse> {
  const provider = await prepare({ ...settings, model: settings.model || 'unused' }, deps);
  if (typeof provider === 'string') return { ok: false, error: { code: provider } };
  try {
    return { ok: true, models: await listModels(provider, signal, deps) };
  } catch (error) {
    return { ok: false, error: toError(error) };
  }
}
