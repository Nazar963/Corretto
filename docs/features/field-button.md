# Field button (slice 1)

Covers [FR-001–FR-003](../requirements/product.md) for `<textarea>` and `<input type=text|search>`. contenteditable comes in slice 4.

## Behaviour
- Content script on `<all_urls>`, all frames, `document_idle` (`entrypoints/content.ts`).
- Document-level `focusin`/`focusout`/`input` listeners (capture), so fields added after load and fields in open shadow roots work without a MutationObserver (`lib/controller.ts`).
- Eligibility and exclusions: `lib/fields.ts` (`isEligibleField`). Minimum length: 3 words **or** 15 non-space characters (`DEFAULT_MINIMUM`); configurable in slice 7.
- Button: closed Shadow DOM under a `<corretto-button>` host, `position: fixed`, bottom-right inside the field, clear of borders/scrollbars, vertically centred for single-line inputs (`lib/button.ts`). `mousedown` is prevented so focus and selection stay in the field; `tabIndex = -1`.
- Hides 2 s after blur (`HIDE_DELAY_MS`), immediately when text drops below the minimum or the field scrolls off-screen.
- Click does nothing yet; popup arrives in slice 2.

## Evidence
- Unit: `tests/unit/fields.test.ts`, `tests/unit/button.test.ts`, `tests/unit/controller.test.ts`.
- E2E: `tests/e2e/field-button.spec.ts` (fixtures in `tests/e2e/fixtures/`, served via Playwright routing at `http://corretto.test`).
- `npm run validate` exit 0 on 2026-10-18: 43 unit tests, 19 e2e tests passed; content script 3.0 KB gzipped.

## Not covered yet
- Firefox runtime behaviour (only `web-ext lint`; manual check in slice 9).
- Real sites (Gmail etc.) — slice 4 checklist.
