// Adapter dispatch, retry and timeout (docs/adr/0003-provider-adapters.md, docs/adr/0004-output-contract.md).

import type { Rewrites } from '../messages';
import { parseRewrites } from '../parse';
import type { ResolvedProvider } from '../settings';
import { completeAnthropic, listAnthropicModels } from './anthropic';
import { ProviderError, type AdapterDeps, type Signals } from './common';
import { completeOpenAi, listOpenAiModels } from './openai';

export { ProviderError, readErrorDetail, type AdapterDeps } from './common';

const ADAPTERS = {
  openai: { complete: completeOpenAi, listModels: listOpenAiModels },
  anthropic: { complete: completeAnthropic, listModels: listAnthropicModels },
} as const;

export type ApiStyle = keyof typeof ADAPTERS;

function setup(provider: ResolvedProvider, signal: AbortSignal, deps: AdapterDeps) {
  const fetchFn = deps.fetch ?? globalThis.fetch.bind(globalThis);
  const signals: Signals = { caller: signal, timeout: AbortSignal.timeout(deps.timeoutMs ?? provider.timeoutMs) };
  return { adapter: ADAPTERS[provider.api], fetchFn, signals };
}

/** Ask for three rewrites; retries once if the output does not match the contract (ADR-0004). */
export async function requestRewrites(
  provider: ResolvedProvider,
  text: string,
  signal: AbortSignal,
  deps: AdapterDeps = {},
): Promise<Rewrites> {
  const { adapter, fetchFn, signals } = setup(provider, signal, deps);
  for (let attempt = 0; attempt < 2; attempt++) {
    const rewrites = parseRewrites(await adapter.complete(provider, text, signals, fetchFn));
    if (rewrites) return rewrites;
  }
  throw new ProviderError('bad_output');
}

/** Chat model ids the key can use, for the settings page. */
export async function listModels(provider: ResolvedProvider, signal: AbortSignal, deps: AdapterDeps = {}): Promise<string[]> {
  const { adapter, fetchFn, signals } = setup(provider, signal, deps);
  return adapter.listModels(provider, signals, fetchFn);
}
