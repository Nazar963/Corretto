# Current Project Status

## Current milestone
Slice 0 — project scaffold (see [roadmap](roadmap.md)).

## Completed
- Planning: [requirements](../requirements/product.md), [architecture](../architecture/system.md), ADR-0001…0010 (all `proposed`), [roadmap](roadmap.md). Approved by the user in chat 2026-10-18; statuses left for the user to change.
- Slice 0 scaffold (uncommitted): WXT + TypeScript, ESLint, Vitest, Playwright, CI workflow, placeholder icons, `en` locale.
  Evidence: `npm run validate` exit 0 on 2026-10-18 — lint clean, typecheck clean, `tests/unit/locales.test.ts` 1 passed, Chrome and Firefox builds succeed, `web-ext lint` 0 errors / 1 warning, `tests/e2e/extension-loads.spec.ts` 1 passed.

## In progress
_Nothing._

## Blocked / open questions
- Firefox `data_collection_permissions` classification (verify before AMO submission).
- Free-tier data-use terms per provider (verify before release).
- `.github/workflows/submit.yml` is the old Plasmo/pnpm workflow and will not work; replace in slice 10.
- `npm audit`: 4 high findings in `node-forge` (transitive dev dependency of `web-ext`); not shipped in the extension.
- CI workflow not yet run on GitHub (nothing pushed).

## Next priorities
1. Slice 1 — field detector + button on textarea/input, exclusions (FR-001–003).

## Last reviewed
2026-10-18 — slice 0 checked with `npm run validate`.
