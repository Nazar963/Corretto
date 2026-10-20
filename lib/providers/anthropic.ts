// Anthropic Messages API adapter over fetch (docs/adr/0003-provider-adapters.md; raw fetch chosen
// by the user on 2026-10-20 to match the other adapters instead of adding @anthropic-ai/sdk).

import { SYSTEM_PROMPT } from '../prompt';
import type { ResolvedProvider } from '../settings';
import { fetchJson, ProviderError, type Signals } from './common';

const ANTHROPIC_VERSION = '2023-06-01';
/** Room for three rewrites of a 5,000-character input plus thinking; non-streaming default. */
const MAX_TOKENS = 16_000;

function headers(provider: ResolvedProvider): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    'x-api-key': provider.apiKey,
    'anthropic-version': ANTHROPIC_VERSION,
    // Requests from an extension carry a chrome-extension:// / moz-extension:// Origin; the API
    // only accepts browser-origin calls with this opt-in. The key is the user's own (BYOK).
    'anthropic-dangerous-direct-browser-access': 'true',
  };
}

interface MessagesResponse {
  content?: { type?: string; text?: unknown }[];
  stop_reason?: string;
}

export async function completeAnthropic(
  provider: ResolvedProvider,
  text: string,
  signals: Signals,
  fetchFn: typeof fetch,
): Promise<string> {
  // No `temperature` (non-default sampling values are rejected on current models) and no
  // `thinking` (on by default); low effort keeps thinking short for this simple task.
  const body = {
    model: provider.model,
    max_tokens: MAX_TOKENS,
    system: SYSTEM_PROMPT,
    messages: [{ role: 'user', content: text }],
    output_config: { effort: 'low' },
  };
  const data = (await fetchJson(
    `${provider.baseUrl}/messages`,
    { method: 'POST', headers: headers(provider), body },
    provider.apiKey,
    signals,
    fetchFn,
  )) as MessagesResponse;
  if (data?.stop_reason === 'refusal') throw new ProviderError('bad_output', 'The model declined to rewrite this text.');
  // Responses may start with (empty) thinking blocks; only text blocks carry the answer.
  const textParts = (data?.content ?? [])
    .filter((block) => block.type === 'text' && typeof block.text === 'string')
    .map((block) => block.text as string);
  if (textParts.length === 0) throw new ProviderError('bad_output');
  return textParts.join('');
}

export async function listAnthropicModels(provider: ResolvedProvider, signals: Signals, fetchFn: typeof fetch) {
  const data = await fetchJson(
    `${provider.baseUrl}/models?limit=100`,
    { method: 'GET', headers: headers(provider) },
    provider.apiKey,
    signals,
    fetchFn,
  );
  const items = (data as { data?: { id?: unknown }[] })?.data;
  if (!Array.isArray(items)) throw new ProviderError('bad_output');
  return items
    .map((item) => item.id)
    .filter((id): id is string => typeof id === 'string' && id.startsWith('claude-'))
    .sort();
}
