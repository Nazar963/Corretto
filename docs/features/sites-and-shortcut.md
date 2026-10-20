# Display settings, sites and shortcut (slice 7)

Covers [FR-002 (configurable minimum), FR-010, FR-012, FR-013](../requirements/product.md) and the rest of FR-011.

## Behaviour
- **Prefs** (`lib/prefs.ts`): `{minWords, minChars, disabledSites, sensitiveSites}` under its own `storage.local` key `prefs`, separate from provider `settings`, so the content script reads and watches it without loading the API key. Damaged values are repaired on load.
- **Minimum length** (FR-002): default 3 words or 15 characters, editable in settings; the controller reads it on every check, so changes apply on the next keystroke.
- **Site matching** (`lib/sites.ts`): an entry matches the domain and its subdomains; a bare suffix (`bank`) matches a top-level domain. In iframes the top-level site also counts (same-origin parent, or Chromium's `ancestorOrigins`; Firefox exposes neither for cross-origin parents).
- **Sensitive sites** (FR-013, [ADR-0009](../adr/0009-sensitive-fields.md)): short default list (payments/banking, health records, government ID/tax; EU and US), user-editable in settings with "Restore default list". Known to be incomplete (accepted by the user).
- **Per-site off switch** (FR-012): toolbar popup (`entrypoints/popup/`) shows the site and a "Corretto on this site" checkbox. The popup asks the tab's content script (top frame) for the host, so no `tabs`/`activeTab` permission is needed; pages without a content script show "Corretto can't run on this page." Turning on removes every entry covering the site. The settings page lists disabled sites with Remove buttons. Changes apply immediately in open tabs (`storage.onChanged`).
- **Keyboard shortcut** (FR-010): manifest command `rewrite`, suggested `Alt+Shift+C`. Background sends `corretto/shortcut` to the tab; the frame with focus opens the popup for its focused eligible field (into open shadow roots), even below the minimum length; nothing happens on excluded/empty fields or sites turned off. Settings show the current shortcut and where to change it.
- **Fix**: a field that already has focus when the controller starts (autofocused compose boxes, site switched back on) now gets the button; before, it needed a refocus.

## Evidence
- Unit: `tests/unit/sites.test.ts`, `tests/unit/prefs.test.ts`, `tests/unit/controller.test.ts` (live minimum, already-focused field).
- E2E: `tests/e2e/sites.spec.ts` (minimum, sensitive incl. iframe, popup toggle, shortcut incl. iframe and exclusions, settings section), `tests/e2e/field-button.spec.ts` (autofocus). The shortcut is triggered through the background's handler, exposed only in the e2e build, because Playwright cannot press browser-level shortcuts.
- `npm run validate` exit 0 on 2026-10-20: 156 unit, 90 e2e passed; content script 7.9 KB gzipped.

## Not verified
- Whether a normal install assigns `Alt+Shift+C`: Chrome did not assign it to the command-line-loaded test extension (`commands.getAll` shortcut empty). Check after loading unpacked by hand and after store install.
- Pressing the real shortcut (only the handler is tested).
- Firefox behaviour (slice 9).
