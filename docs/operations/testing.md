# Testing

- Entry point: `npm run validate` (defined in `package.json`). CI runs it on push to `main` and on PRs (`.github/workflows/ci.yml`).
- Unit: Vitest + happy-dom, `tests/unit/**/*.test.ts`, config `vitest.config.ts` (uses `WxtVitest` plugin).
- E2E: Playwright, `tests/e2e/`, loads `.output/chrome-mv3` into Chromium via `launchPersistentContext`. Requires `npm run build` first (validate does this).
- Firefox: `npm run lint:firefox` runs `web-ext lint` on `.output/firefox-mv3`. No automated Firefox e2e; manual smoke test planned for slice 9.
- Known lint warning: `MISSING_DATA_COLLECTION_PERMISSIONS` — open question in [requirements](../requirements/product.md), to resolve before AMO submission (slice 10).
