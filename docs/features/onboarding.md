# Setup guide (slice 8)

Covers [FR-014](../requirements/product.md).

## Behaviour
- Opens once in a new tab on first install (`runtime.onInstalled`, reason `install`); not on updates or restarts. The settings page links to it ("Open the setup guide"). Page: `entrypoints/welcome/` → `welcome.html`.
- **Step 1 – choose a provider**, grouped: Free to start (Gemini *recommended*, Groq, Mistral, OpenRouter), On your computer (Ollama, LM Studio), Paid (Anthropic, OpenAI). Gemini is recommended because it is the only provider verified end to end with a real key. Custom endpoints stay in settings.
- **Step 2 – get a key / set up the app**: link to the provider's key page (or download page), short steps, and a privacy note: free tiers may use submitted text to improve models (read their terms), paid = billed to your account, local = text stays on this computer. Ollama: example `ollama pull llama3.2` and how to allow extension origins if the test returns 403. LM Studio: load a model, start the server, enable CORS if the test fails.
- **Step 3 – connect**: the shared `components/ProviderForm.tsx` in guide mode (provider fixed, one "Test and save" button). Settings are saved **only after a successful test**; failures show the specific error and keep the user on the step.
- **Step 4 – ready**: tips (button, selection, shortcut, toolbar switch, undo), Close and Settings buttons.
- The options page uses the same `ProviderForm` in settings mode (separate Save and Test connection).

## Evidence
- E2E: `tests/e2e/welcome.spec.ts` (opens once on install; recommendation and privacy note; full Ollama flow with Show models and Test and save against the mock server; failed test saves nothing; link from settings). `tests/e2e/options.spec.ts` still passes on the shared form.
- Found and fixed while testing: the provider select was meant to be hidden in guide mode via the `hidden` attribute, but `label { display: grid }` overrode it; it is now not rendered.
- `npm run validate` exit 0 on 2026-10-20: 156 unit, 95 e2e passed.

## Not verified
- The cloud-provider path through the browser's permission prompt (automation cannot accept it); verify by hand on a fresh install.
- Wording of each provider's free-tier data terms (the note is deliberately general; check before release).
- `ollama pull llama3.2`, the Ollama origins setting and the LM Studio CORS toggle are written from general knowledge, not tested here.
