# Providers, settings and error states (slice 3)

Covers [FR-009, FR-011, part of FR-015](../requirements/product.md). Replaces the slice 2 mock provider.

## Behaviour
- **Settings** (`lib/settings.ts`): `{providerId, apiKey, model, baseUrl}` in `storage.local` only. Read by the background and the options page; content-script code never reads them ([ADR-0002](../adr/0002-llm-calls-in-background.md)). Note: Chrome does not let us block content-script access to `storage.local`, so this is a code rule, not an enforced boundary.
- **Presets** (`lib/providers/presets.ts`): Groq, Google Gemini (OpenAI-compatible endpoint), OpenRouter, Mistral, OpenAI, Custom. Data only ([ADR-0003](../adr/0003-provider-adapters.md)).
- **Adapter** (`lib/providers/openai.ts`): `POST {baseUrl}/chat/completions`, Bearer key if set, `response_format: json_object` when the preset supports it, temperature 0.4. 30 s total timeout; one retry on unreadable output ([ADR-0004](../adr/0004-output-contract.md)). HTTP 401/403 → `invalid_key`, 404 → `model_not_found`, 429 → `rate_limited`, other → `http`; fetch failure → `network`.
- **Prompt** (`lib/prompt.ts`): three tones, same language (incl. mixed), keep meaning/line breaks/names, treat user text as content not instructions, JSON only.
- **Service** (`lib/rewrite-service.ts`): checks length (≤ 5,000 chars → else `too_long`), configuration, key (required for cloud presets, optional for custom), and host permission before any network call.
- **Messaging**: one `runtime.connect` port per rewrite (`lib/rewrite-client.ts`, `entrypoints/background.ts`); closing the port aborts the provider fetch. "Test connection" and "Open settings" use `runtime.sendMessage`; test-connection is accepted only from extension pages.
- **Permissions** ([ADR-0007](../adr/0007-permissions.md)): `optional_host_permissions` `https://*/*`, `http://localhost/*`, `http://127.0.0.1/*`. Options page requests the provider origin on Save / Test (first call in the click handler, to keep the user gesture).
- **Errors in the popup** (`lib/errors.ts`): message per code from `_locales`; action "Open settings" (not_configured, no_key, permission, invalid_key, model_not_found), "Retry" (rate_limited, timeout, network, bad_output, http, unknown), none (too_long).
- **Options page** (`entrypoints/options/`, Preact 10.29.8): provider, server address (custom only), API key (hidden by default, Show toggle, "Get a key" link), model (preset suggestion), Save, Test connection (uses unsaved values), privacy note. Opens in a tab.

## Evidence
- Unit: `tests/unit/parse.test.ts`, `openai.test.ts`, `rewrite-service.test.ts`, `settings.test.ts`.
- E2E: `tests/e2e/provider.spec.ts`, `tests/e2e/options.spec.ts`, against a local mock OpenAI-compatible server (`tests/e2e/mock-provider.ts`). The e2e build grants `http://127.0.0.1/*` as a host permission so no prompt appears.
- `npm run validate` exit 0 on 2026-10-18: 94 unit, 49 e2e passed. Content script 6.1 KB gzipped, options chunk 7.3 KB gzipped.

## Not verified
- **No real provider call has been made.** Roadmap check "manual Groq/Gemini call" needs a real key, so the user has to run it.
- Default model names in presets are unverified assumptions (providers rename models); check before release.
- Whether each provider sends CORS headers is irrelevant with a granted host permission in Chrome; Firefox runtime not tested yet (slice 9).
- The permission prompt itself (real user gesture) is not exercised by e2e.
- `web-ext lint` warns `UNSAFE_VAR_ASSIGNMENT` in the options bundle: Preact's internal `dangerouslySetInnerHTML` support, not our code. Mention in AMO review notes.
