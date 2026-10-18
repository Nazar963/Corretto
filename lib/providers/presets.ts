// Provider presets are data, not code (docs/adr/0003-provider-adapters.md).
// Default models are suggestions the user can change; they must be re-checked before release
// because providers rename and retire models often.

export interface ProviderPreset {
  id: string;
  name: string;
  /** Base URL of the OpenAI-compatible API, without `/chat/completions`. Empty for custom. */
  baseUrl: string;
  defaultModel: string;
  /** Where the user creates a key (onboarding, FR-014). */
  keyUrl: string;
  /** Whether `response_format: {type: 'json_object'}` is accepted. */
  jsonMode: boolean;
  /** Has a free tier (shown in settings and onboarding). */
  free: boolean;
}

export const PRESETS: readonly ProviderPreset[] = [
  {
    id: 'groq',
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1',
    defaultModel: 'llama-3.3-70b-versatile',
    keyUrl: 'https://console.groq.com/keys',
    jsonMode: true,
    free: true,
  },
  {
    id: 'gemini',
    name: 'Google Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai',
    defaultModel: 'gemini-flash-latest',
    keyUrl: 'https://aistudio.google.com/apikey',
    jsonMode: true,
    free: true,
  },
  {
    id: 'openrouter',
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
    keyUrl: 'https://openrouter.ai/settings/keys',
    jsonMode: false,
    free: true,
  },
  {
    id: 'mistral',
    name: 'Mistral',
    baseUrl: 'https://api.mistral.ai/v1',
    defaultModel: 'mistral-small-latest',
    keyUrl: 'https://console.mistral.ai/api-keys',
    jsonMode: true,
    free: true,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    baseUrl: 'https://api.openai.com/v1',
    defaultModel: 'gpt-4.1-mini',
    keyUrl: 'https://platform.openai.com/api-keys',
    jsonMode: true,
    free: false,
  },
  {
    id: 'custom',
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
