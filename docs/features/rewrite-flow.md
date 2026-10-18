# Rewrite flow (slice 2)

Covers [FR-004, FR-006, FR-007, FR-008](../requirements/product.md) for `<textarea>` and `<input type=text|search>`. Uses a **mock provider**; real providers and specific error messages (FR-009) come in slice 3.

## Behaviour
- Button click → `captureTarget` takes the non-blank selection, else the whole value (`lib/edit.ts`).
- Content script sends `{type: 'corretto/rewrite', text}` to the background (`lib/messages.ts`, `entrypoints/background.ts`), which currently answers from `lib/providers/mock.ts` (`[minimal] …`, `[fluent] …`, `[formal] …` after 400 ms).
- Popup (`lib/panel.ts`): loading row with Cancel → three labelled options (Minimal fix / More fluid / More formal). First option is focused; ↑/↓ move, Enter picks, Esc closes and restores focus + selection, outside click closes without moving focus. Late responses after Cancel/close are ignored (generation counter in `lib/flow.ts`).
- Replacement (`replaceRange`): `execCommand('insertText')` first, fallback `setRangeText` + `input` event ([ADR-0005](../adr/0005-text-replacement.md)).
- Toast "Replaced · Undo" for 10 s; Undo restores text and original selection; any later edit closes it. Native Ctrl+Z also works (insertText path).
- All model text is rendered with `textContent`; no `innerHTML` anywhere in injected UI.
- Error state currently shows one generic message with Retry.

## Fix included
- Focusing a non-field element after leaving a field no longer cancels the button's pending hide (`lib/controller.ts`; regression test in `tests/unit/controller.test.ts`).

## Evidence
- Unit: `tests/unit/edit.test.ts`, `tests/unit/panel.test.ts`, `tests/unit/controller.test.ts`.
- E2E: `tests/e2e/rewrite-flow.spec.ts` (fixtures `fields.html`, `controlled.html`, `react.html`). The React tests were checked to fail when replacement bypasses input events.
- `npm run validate` exit 0 on 2026-10-18: 55 unit, 34 e2e passed; content script 5.7 KB gzipped.

## Covered since
- FR-007 AC-001 is covered for a real React 19 controlled textarea (`tests/e2e/fixtures/react/main.js`), including state after re-render and after Undo.

## Not covered yet
- Firefox runtime behaviour, real sites, contenteditable.
