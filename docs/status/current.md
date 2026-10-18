# Current Project Status

## Current milestone
Slice 3 — providers, settings page, error states (see [roadmap](roadmap.md)).

## Completed
- Planning: [requirements](../requirements/product.md), [architecture](../architecture/system.md), ADR-0001…0010 (all `proposed`), [roadmap](roadmap.md). Approved by the user in chat 2026-10-18; statuses left for the user to change.
- Slice 0 scaffold (commit 58de202, merged to `main`): WXT + TypeScript, ESLint, Vitest, Playwright, CI workflow, placeholder icons, `en` locale.
  Evidence: `npm run validate` exit 0 on 2026-10-18 — lint clean, typecheck clean, `tests/unit/locales.test.ts` 1 passed, Chrome and Firefox builds succeed, `web-ext lint` 0 errors / 1 warning, `tests/e2e/extension-loads.spec.ts` 1 passed.

- Slice 1 field button (commit fc8040d, merged to `main`): [feature note](../features/field-button.md).
  Evidence: `npm run validate` exit 0 on 2026-10-18 — 43 unit tests, 19 e2e tests passed, `web-ext lint` 0 errors / 1 known warning.

- Slice 2 rewrite flow with mock provider (commit 8dafc42, merged to `main`): [feature note](../features/rewrite-flow.md). Includes a real React fixture for FR-007 AC-001 (dev deps approved by the user 2026-10-18).
  Evidence: `npm run validate` exit 0 on 2026-10-18 — 55 unit, 34 e2e passed, `web-ext lint` 0 errors / 1 known warning.

- Slice 3 providers, settings page and error states (branch `slice-3-provider-settings`): [feature note](../features/provider-settings.md).
  Evidence: `npm run validate` exit 0 on 2026-10-18 — 94 unit, 49 e2e passed (against a local mock provider), `web-ext lint` 0 errors / 2 warnings.

## In progress
_Nothing._

## Blocked / open questions
- Slice 3 manual check: one real call with a Groq or Gemini key (needs the user's key; not done).
- Preset default model names are unverified; check before release.
- `web-ext lint` `UNSAFE_VAR_ASSIGNMENT` in options bundle comes from Preact internals; explain in AMO review notes.
- Firefox `data_collection_permissions` classification (verify before AMO submission).
- Free-tier data-use terms per provider (verify before release).
- `.github/workflows/submit.yml` is the old Plasmo/pnpm workflow and will not work; replace in slice 10.
- `npm audit`: 4 high findings in `node-forge` (transitive dev dependency of `web-ext`); not shipped in the extension.
- CI workflow not yet run on GitHub (nothing pushed).

## Next priorities
1. Slice 4 — contenteditable support (FR-001, FR-007), manual Gmail/LinkedIn checklist.

## Last reviewed
2026-10-18 — slices 0–3 checked with `npm run validate`.
