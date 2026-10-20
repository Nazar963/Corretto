// Provider presets are data, not code (docs/adr/0003-provider-adapters.md).
// Default models are suggestions the user can change; they must be re-checked before release
// because providers rename and retire models often. Prefer provider aliases that track the
// current model over versioned names (see docs/features/provider-settings.md for evidence).

import type { ApiStyle } from './index';

export interface ProviderPreset {
  id: string;
  name: string;
  /** Request format: OpenAI chat-completions or Anthropic Messages. */
  api: ApiStyle;
  /** API base URL, without `/chat/completions` or `/messages`. Empty for custom. */
  baseUrl: string;
  /** The user may change the base URL (custom endpoints, local servers on another port). */
  editableBaseUrl: boolean;
  /** Runs on the user's own computer: no key needed, longer timeout. */
  local: boolean;
  defaultModel: string;
  /** Where the user creates a key, or downloads the app for local servers (onboarding, FR-014). */
  keyUrl: string;
  /** Whether `response_format: {type: 'json_object'}` is accepted. */
  jsonMode: boolean;
  /** Has a free tier (shown in settings and onboarding). */
  free: boolean;
}

export const PRESETS: readonly ProviderPreset[] = [
  {
    id: 'groq',
    api: 'openai',
    editableBaseUrl: false,
    local: false,
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    // llama-3.3-70b-versatile was retired 2026-08-16; this is Groq's recommended replacement.
    defaultModel: 'openai/gpt-oss-120b',
    keyUrl: 'https://console.groq.com/keys',
    jsonMode: true,
    free: true,
  },
  {
    id: 'gemini',
    api: 'openai',
    editableBaseUrl: false,
    local: false,
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    // gemini-flash-latest hung past 30 s in a real test; the lite alias answered in ~3 s.
    defaultModel: 'gemini-flash-lite-latest',
    keyUrl: 'https://aistudio.google.com/apikey',
    jsonMode: true,
    free: true,
  },
  {
    id: 'openrouter',
    api: 'openai',
    editableBaseUrl: false,
    local: false,
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    keyUrl: 'https://openrouter.ai/settings/keys',
    jsonMode: false,
    free: true,
  },
  {
    id: 'mistral',
    api: 'openai',
    editableBaseUrl: false,
    local: false,
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    keyUrl: 'https://console.mistral.ai/api-keys',
    jsonMode: true,
    free: true,
  },
  {
    id: 'openai',
    api: 'openai',
    editableBaseUrl: false,
    local: false,
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4.1-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    jsonMode: true,
    free: false,
  },
  {
    id: 'anthropic',
    api: 'anthropic',
    editableBaseUrl: false,
    local: false,
    name: 'Anthropic (Claude)',
    baseUrl: 'https://api.anthropic.com/v1',
    // Fastest and cheapest current Claude model; chosen by the user on 2026-10-20. Not tested with a key.
    defaultModel: 'claude-haiku-5-5',
    keyUrl: 'https://console.anthropic.com/settings/keys',
    jsonMode: false,
    free: false,
  },
  {
    id: 'ollama',
    api: 'openai',
    editableBaseUrl: true,
    local: true,
    name: 'Ollama (on this computer)',
    baseUrl: 'http://localhost:11434/v1',
    // Depends on what the user has pulled; "Show available models" lists them.
    defaultModel: '',
    keyUrl: 'https://ollama.com/download',
    jsonMode: true,
    free: true,
  },
  {
    id: 'lmstudio',
    api: 'openai',
    editableBaseUrl: true,
    local: true,
    name: 'LM Studio (on this computer)',
    baseUrl: 'http://localhost:1234/v1',
    defaultModel: '',
    keyUrl: 'https://lmstudio.ai/download',
    // LM Studio accepts json_schema but not json_object; rely on the prompt and parser.
    jsonMode: false,
    free: true,
  },
  {
    id: 'custom',
    api: 'openai',
    editableBaseUrl: true,
    local: false,
    name: 'Custom (OpenAI-compatible)',
    baseUrl: '',
    defaultModel: '',
    keyUrl: '',
    jsonMode: false,
    free: false,
  },
];

export function findPreset(id: string): ProviderPreset | undefined {
  return PRESETS.find((preset) => preset.id === id);
}
