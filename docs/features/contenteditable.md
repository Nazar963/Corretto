# contenteditable support (slice 4)

Extends [FR-001, FR-004, FR-007, FR-008](../requirements/product.md) to rich editors (Gmail, LinkedIn, …).

## Behaviour
- **Detection** (`lib/fields.ts`): the *editing host* only (`isContentEditable` and parent not editable), incl. `contenteditable=""`, `plaintext-only`, and an editable iframe `<body>`. Excluded: `aria-readonly="true"`, `aria-disabled="true"`. Text for the minimum-length rule is `innerText`.
- **Capture** (`lib/edit.ts`): non-blank selection inside the host → that `Range` and `Selection.toString()`; otherwise the whole host and `innerText`.
- **Stale check (all field kinds)**: if the text changed while the provider was working (user typed, editor re-rendered the selected nodes), nothing is replaced and the popup says "The text changed while Corretto was working" with Retry.
- **Replace**: select the range, `execCommand('insertText')`; success if the host text now contains the new text. Fallback: replace the Range with text nodes + `<br>` and dispatch `input` ([ADR-0005](../adr/0005-text-replacement.md)). Result is plain text; formatting inside the replaced range is lost (out of scope).
- **Undo**: insertText path → `execCommand('undo')`; if the text is not exactly back (editors that re-render break the native stack), select all and insert the captured original text. Fallback path → put the original nodes back. Ctrl+Z also works where the browser stack is intact.

## Model-driven editors (fix 2026-10-21)
Reported by the user: on WhatsApp Web the options appeared but picking one did not replace the text. WhatsApp uses **Lexical**, which keeps the text in its own model and re-renders the DOM.
- Whole-field replacements now select from the first character of the first text node to the end of the last one; a range on the host element itself is ignored by Lexical.
- Replacement and undo are asynchronous: after changing the selection and after inserting, the code yields one event-loop turn (`settle()`) so editors can process `selectionchange` and commit their update, then checks the result.
- Input paths in order: `insertText`, then a synthetic `paste` event (Lexical, ProseMirror, Slate, Draft.js handle paste in their own model), then the direct DOM edit. If an attempt changes the text into something else, it stops instead of stacking edits.
- Success check: whole field must **equal** the new text (a rewrite often contains the original, e.g. only adds a full stop; "contains" gave false positives); a selection must have changed and contain the new text.
- Undo: native undo first (insertText path); otherwise the original wording goes back through the same input paths.
- The button also re-checks on `keyup`, for editors that handle typing themselves and fire no `input` event (strict model editors; possibly Notion).
- The popup is capped to the frame height and scrolls inside small iframes.

## Evidence
- Unit (fallback path; happy-dom has no execCommand): `tests/unit/edit.test.ts`, `tests/unit/fields.test.ts`.
- E2E (native path in Chromium): `tests/e2e/contenteditable.spec.ts` with `fixtures/editable.html` (plain, empty attribute, plaintext-only, rich multi-paragraph, aria-readonly, a re-rendering "framework" editor, editable iframe body). Undo fallback was checked to be necessary: with it removed, the re-rendering-editor Undo test fails.
- `npm run validate` exit 0 on 2026-10-18: 109 unit, 66 e2e passed; content script 6.8 KB gzipped.
- 2026-10-21: `tests/e2e/lexical.spec.ts` with a real Lexical 0.52 plain-text editor (model checked, not just the DOM): whole replace failed before the fix (model kept the old text), passes after; selection and undo pass. Either insertText or paste alone works for Lexical once the selection and timing are right. `tests/e2e/contenteditable.spec.ts` strict editor (typing and paste only) needs the paste path (fails without it, checked). `npm run validate` exit 0 — 157 unit, 110 e2e; Edge 110, Brave 110; Firefox 6.

## Not verified
- **Real WhatsApp Web, Notion**: need the user's accounts; the Lexical fixture is a stand-in for WhatsApp, not proof.
- **Real sites** (Gmail, LinkedIn, X, Outlook): need a signed-in user → [manual checklist](../operations/manual-checklist.md), not yet run.
- contenteditable inside a page's shadow root (selection APIs differ); Draft.js editors (X) are a known risk.
- Firefox runtime behaviour (slice 9).
