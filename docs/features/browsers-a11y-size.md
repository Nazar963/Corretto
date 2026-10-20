# Browsers, accessibility and size (slice 9)

Covers the compatibility, accessibility and performance NFRs in [requirements](../requirements/product.md).

## Browser results (2026-10-20, this machine)
| Browser | How | Result |
|---|---|---|
| Chromium (Playwright build) | `npm run test:e2e` (in `validate`, and CI) | 103/103 passed |
| Microsoft Edge 155 | `npm run test:e2e:edge` | 103/103 passed |
| Brave 154 | `npm run test:e2e:brave` | 103/103 passed |
| Firefox 157 (snap) | `npm run test:firefox` | 6/6 smoke tests passed |
| Google Chrome 155 | not run: branded Chrome no longer loads extensions from the command line | covered by the same Chromium engine; check by hand with "Load unpacked" |

- **Firefox smoke** (`tests/firefox/`): Playwright cannot load extensions in Firefox, so a small WebDriver client drives geckodriver. It installs `.output/firefox-mv3-e2e` as a temporary add-on and checks: the setup guide opens on install; the content script runs on web pages with `<all_urls>` and `127.0.0.1` granted; textarea rewrite, replace and undo; Esc; rich contenteditable replace and undo restoring markup; **selection inside a shadow-root editor** (the open question from slice 5; it works).
- geckodriver cannot script extension pages, so the e2e builds include a test-only hook (content script `postMessage` → background) to configure settings. It is guarded by `import.meta.env.MODE === 'e2e'`; shipped builds were checked to contain neither the hook nor open shadow roots.
- Firefox runner path: `FIREFOX_BINARY` (default `/snap/firefox/current/usr/lib/firefox/firefox`). `CORRETTO_BROWSER` points the Playwright suite at another Chromium-based browser.

## Accessibility
- `tests/e2e/a11y.spec.ts` runs axe-core (`@axe-core/playwright` 4.13.0, dev dependency added for the WCAG AA requirement) with WCAG 2.0/2.1 A and AA rules on the settings page, setup guide steps 1–3, toolbar popup, and the injected button plus popup states (loading, results, toast, error), in **light and dark** mode.
- Found and fixed: dark-mode primary buttons had white text on light blue (contrast failure); new `--on-accent` token.
- Already in place: labelled button and dialog, focus on first option, arrow keys/Enter/Esc, `role=status/alert`, reduced-motion spinner. The in-page button is outside the Tab order by design; keyboard users use the shortcut.
- Not covered by axe: screen-reader announcement quality and real keyboard-only use on real sites (manual).

## Size budget
- `scripts/check-size.mjs` (`npm run size`, part of `validate`): content script ≤ 30 KB gzipped (NFR), whole extension ≤ 300 KB gzipped (assumption, catches an accidental heavy dependency).
- Now: content script 7.7 KB, background 3.8 KB, Preact runtime 5.6 KB, total 30.7 KB gzipped (Chrome and Firefox builds).

## Not verified
- Google Chrome branded build and the Chrome Web Store install (manual).
- Firefox: popup per-site switch, keyboard shortcut, setup guide UI and settings page UI (geckodriver cannot drive extension pages); Firefox `ancestorOrigins` gap for cross-origin iframes (documented in [sites and shortcut](sites-and-shortcut.md)).
- Edge/Brave/Firefox runs are local only; CI runs Chromium only.
