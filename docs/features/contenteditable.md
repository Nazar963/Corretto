# contenteditable support (slice 4)

Extends [FR-001, FR-004, FR-007, FR-008](../requirements/product.md) to rich editors (Gmail, LinkedIn, …).

## Behaviour
- **Detection** (`lib/fields.ts`): the *editing host* only (`isContentEditable` and parent not editable), incl. `contenteditable=""`, `plaintext-only`, and an editable iframe `<body>`. Excluded: `aria-readonly="true"`, `aria-disabled="true"`. Text for the minimum-length rule is `innerText`.
- **Capture** (`lib/edit.ts`): non-blank selection inside the host → that `Range` and `Selection.toString()`; otherwise the whole host and `innerText`.
- **Stale check (all field kinds)**: if the text changed while the provider was working (user typed, editor re-rendered the selected nodes), nothing is replaced and the popup says "The text changed while Corretto was working" with Retry.
- **Replace**: select the range, `execCommand('insertText')`; success if the host text now contains the new text. Fallback: replace the Range with text nodes + `<br>` and dispatch `input` ([ADR-0005](../adr/0005-text-replacement.md)). Result is plain text; formatting inside the replaced range is lost (out of scope).
- **Undo**: insertText path → `execCommand('undo')`; if the text is not exactly back (editors that re-render break the native stack), select all and insert the captured original text. Fallback path → put the original nodes back. Ctrl+Z also works where the browser stack is intact.

## Evidence
- Unit (fallback path; happy-dom has no execCommand): `tests/unit/edit.test.ts`, `tests/unit/fields.test.ts`.
- E2E (native path in Chromium): `tests/e2e/contenteditable.spec.ts` with `fixtures/editable.html` (plain, empty attribute, plaintext-only, rich multi-paragraph, aria-readonly, a re-rendering "framework" editor, editable iframe body). Undo fallback was checked to be necessary: with it removed, the re-rendering-editor Undo test fails.
- `npm run validate` exit 0 on 2026-10-18: 109 unit, 66 e2e passed; content script 6.8 KB gzipped.

## Not verified
- **Real sites** (Gmail, LinkedIn, X, Outlook): need a signed-in user → [manual checklist](../operations/manual-checklist.md), not yet run.
- contenteditable inside a page's shadow root (selection APIs differ); Draft.js editors (X) are a known risk.
- Firefox runtime behaviour (slice 9).
