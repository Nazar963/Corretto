# Testing

- Entry point: `npm run validate` (defined in `package.json`). CI runs it on push to `main` and on PRs (`.github/workflows/ci.yml`).
- Unit: Vitest + happy-dom, `tests/unit/**/*.test.ts`, config `vitest.config.ts` (uses `WxtVitest` plugin).
- E2E: Playwright, `tests/e2e/`. `extension-loads.spec.ts` loads the shipped build `.output/chrome-mv3`; all other specs load `.output/chrome-mv3-e2e` (`npm run build:e2e`, WXT `--mode e2e`), where shadow roots are `open` so Playwright can see the UI (`lib/shadow.ts`). Shipped builds keep `closed` roots. validate builds both. Fixture pages live in `tests/e2e/fixtures/` and are served at `http://corretto.test` through `context.route` (`tests/e2e/helpers.ts`), so content scripts run on them as on a normal http page.
- Firefox: `npm run lint:firefox` runs `web-ext lint` on `.output/firefox-mv3`. No automated Firefox e2e; manual smoke test planned for slice 9.
- Known lint warning: `MISSING_DATA_COLLECTION_PERMISSIONS` — open question in [requirements](../requirements/product.md), to resolve before AMO submission (slice 10).
- React fixture: `react`/`react-dom` 19.3.1 are dev dependencies used only by `tests/e2e/fixtures/react/main.js`. `tests/e2e/global-setup.ts` bundles it with Vite (8.3.4, declared explicitly; already required by vitest and WXT) into `.output/e2e-fixtures/react.js`, served at `/react.js`. Not part of the extension bundle.
