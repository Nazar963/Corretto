// OpenAI-compatible chat-completions adapter (docs/adr/0003-provider-adapters.md).
// Covers Groq, Gemini's compatible endpoint, OpenRouter, Mistral, OpenAI, Ollama, LM Studio and custom URLs.

import { buildMessages } from '../prompt';
import type { ResolvedProvider } from '../settings';
import { chatModels, fetchJson, ProviderError, type Signals } from './common';

function headers(provider: ResolvedProvider): Record<string, string> {
  const result: Record<string, string> = { 'Content-Type': 'application/json' };
  if (provider.apiKey) result.Authorization = `Bearer ${provider.apiKey}`;
  return result;
}

export async function completeOpenAi(
  provider: ResolvedProvider,
  text: string,
  signals: Signals,
  fetchFn: typeof fetch,
): Promise<string> {
  const body = {
    model: provider.model,
    messages: buildMessages(text),
    temperature: 0.4,
    ...(provider.jsonMode ? { response_format: { type: 'json_object' } } : {}),
  };
  const data = await fetchJson(
    `${provider.baseUrl}/chat/completions`,
    { method: 'POST', headers: headers(provider), body },
    provider.apiKey,
    signals,
    fetchFn,
  );
  const content = (data as { choices?: { message?: { content?: unknown } }[] })?.choices?.[0]?.message?.content;
  if (typeof content !== 'string') throw new ProviderError('bad_output');
  return content;
}

export async function listOpenAiModels(provider: ResolvedProvider, signals: Signals, fetchFn: typeof fetch) {
  const data = await fetchJson(
    `${provider.baseUrl}/models`,
    { method: 'GET', headers: headers(provider) },
    provider.apiKey,
    signals,
    fetchFn,
  );
  const items = (data as { data?: { id?: unknown }[] })?.data;
  if (!Array.isArray(items)) throw new ProviderError('bad_output');
  return chatModels(items.map((item) => item.id).filter((id): id is string => typeof id === 'string'));
}
