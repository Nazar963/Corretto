# Current Project Status

## Current milestone
Slice 10 — release preparation (store submission waits on the user) (see [roadmap](roadmap.md)).

## Completed
- Planning: [requirements](../requirements/product.md), [architecture](../architecture/system.md), ADR-0001…0010 (all `proposed`), [roadmap](roadmap.md). Approved by the user in chat 2026-10-18; statuses left for the user to change.
- Slice 0 scaffold (commit 58de202, merged to `main`): WXT + TypeScript, ESLint, Vitest, Playwright, CI workflow, placeholder icons, `en` locale.
  Evidence: `npm run validate` exit 0 on 2026-10-18 — lint clean, typecheck clean, `tests/unit/locales.test.ts` 1 passed, Chrome and Firefox builds succeed, `web-ext lint` 0 errors / 1 warning, `tests/e2e/extension-loads.spec.ts` 1 passed.

- Slice 1 field button (commit fc8040d, merged to `main`): [feature note](../features/field-button.md).
  Evidence: `npm run validate` exit 0 on 2026-10-18 — 43 unit tests, 19 e2e tests passed, `web-ext lint` 0 errors / 1 known warning.

- Slice 2 rewrite flow with mock provider (commit 8dafc42, merged to `main`): [feature note](../features/rewrite-flow.md). Includes a real React fixture for FR-007 AC-001 (dev deps approved by the user 2026-10-18).
  Evidence: `npm run validate` exit 0 on 2026-10-18 — 55 unit, 34 e2e passed, `web-ext lint` 0 errors / 1 known warning.

- Slice 3 providers, settings page and error states (commit f4a375f, merged to `main`): [feature note](../features/provider-settings.md).
  Evidence: `npm run validate` exit 0 on 2026-10-18 — 94 unit, 49 e2e passed (against a local mock provider), `web-ext lint` 0 errors / 2 warnings.

- Slice 4 contenteditable (commit 52b868d, merged to `main`): [feature note](../features/contenteditable.md).
  Evidence: `npm run validate` exit 0 on 2026-10-18 — 109 unit, 66 e2e passed.

- Provider fixes + slice 5 (commit c6c1c1c, merged to `main`): new Gemini/Groq default models, provider error text shown in popup and settings, Gemini 400 bad-key mapped to "key rejected"; selection e2e for iframes and open shadow roots ([provider note](../features/provider-settings.md), [rewrite flow](../features/rewrite-flow.md)).
  Evidence: `npm run validate` exit 0 on 2026-10-20 — 119 unit, 76 e2e passed, `web-ext lint` 0 errors / 2 known warnings.
- Real provider call verified by the user on 2026-10-20: Gemini `gemini-3.5-flash-lite`, Test connection "Connection works." (timings in the provider note).

- Slice 6 more providers (commit 2f19faf, merged to `main`): Anthropic adapter (raw fetch, default `claude-haiku-5-5`), Ollama and LM Studio presets (no key, editable address, 120 s timeout), "Show models" in settings ([provider note](../features/provider-settings.md)).
  Evidence: `npm run validate` exit 0 on 2026-10-20 — 137 unit, 80 e2e passed.

- Slice 7 (commit 157a792, merged to `main`): configurable minimum length, toolbar popup with per-site switch, editable sensitive-site list, keyboard shortcut, fix for already-focused fields ([feature note](../features/sites-and-shortcut.md)).
  Evidence: `npm run validate` exit 0 on 2026-10-20 — 156 unit, 90 e2e passed.

- Slice 8 setup guide (commit 459b08d, merged to `main`): four-step first-run guide, shared provider form, saves only after a successful test ([feature note](../features/onboarding.md)).
  Evidence: `npm run validate` exit 0 on 2026-10-20 — 156 unit, 95 e2e passed.

- Slice 9 (commit f95c94e, merged to `main`): full e2e in Edge 155 and Brave 154, Firefox 157 smoke via geckodriver, axe accessibility checks (light/dark), size budget in `validate`; dark-mode button contrast fixed ([feature note](../features/browsers-a11y-size.md)).
  Evidence (2026-10-20): `npm run validate` exit 0 — 156 unit, 103 e2e passed, size budget OK; `npm run test:e2e:edge` 103 passed; `npm run test:e2e:brave` 103 passed; `npm run test:firefox` 6 passed.

- Slice 10 release prep (branch `slice-10-release-prep`, merged to `main`): Firefox `data_collection_permissions` (required `websiteContent`, `personalCommunications`) and minimum Firefox 140 (user decisions); privacy policy and landing page in `site/` with a GitHub Pages workflow; store listing texts and justifications; generated 1280×800 screenshots; sources zip trimmed and verified to rebuild identically; new submit workflow (dry run by default) ([release notes](../operations/release.md)).
  Evidence (2026-10-20): `npm run validate` exit 0 — 156 unit, 103 e2e, size OK, `web-ext lint` 0 errors / 1 warning; `npm run test:firefox` 6 passed; `npm run screenshots` 4 images; sources rebuild `diff -rq` identical.

## In progress
_Nothing._

## Blocked / open questions
- **Release blocked on the user** (see checklist in [release](../operations/release.md)): real icon and promo tile, public contact address for the privacy policy, enabling GitHub Pages and pushing, first version number, store developer accounts, legal review of the policy.
- GitHub Actions (CI, Pages, submit) have never run: nothing pushed.
- Firefox extension pages (popup, settings, guide UI) and shortcut not automated; check by hand. Branded Google Chrome not automated.
- Setup guide with a cloud provider through the real permission prompt: check by hand on a fresh install.
- Shortcut `Alt+Shift+C` assignment on a real install not verified (not assigned in the automated test browser).
- Manual site check on Gmail, LinkedIn, X, Outlook ([checklist](../operations/manual-checklist.md)) — needs the user, not run.
- Untested with real keys/servers: Groq (`openai/gpt-oss-120b`), Anthropic (`claude-haiku-5-5`), Ollama, LM Studio.
- OpenRouter, Mistral, OpenAI default model names are unverified; check before release.
- `web-ext lint` `UNSAFE_VAR_ASSIGNMENT` comes from the Preact runtime; reviewer note drafted in [release](../operations/release.md).
- Free-tier data-use terms per provider (verify before release).
- `npm audit`: 4 high findings in `node-forge` (transitive dev dependency of `web-ext`); not shipped in the extension.

## Next priorities
1. User: release checklist items, then manual checks on real sites and stores.
2. After first store review: address reviewer feedback; consider translations (FR-017 is ready for them).

## Last reviewed
2026-10-20 — slices 0–10 checked with `npm run validate`, Edge, Brave and Firefox runs.
