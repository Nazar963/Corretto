---
id: ADR-0005
status: proposed   # proposed | accepted | superseded — only the human sets "accepted"
date: 2026-10-18
supersedes: []
---

# Text replacement strategy and undo

## Context
Replacement must work in plain inputs and rich editors (Gmail, LinkedIn) and the site must see the change (FR-007, FR-008).

## Decision
Order: (1) `document.execCommand('insertText')` on the saved selection; (2) for textarea/input, `setRangeText` plus `input` event; (3) for contenteditable, Range replacement plus `beforeinput`/`input` events. Editor-specific adapters only when a target site fails. Undo: keep original text and selection; a toast restores them; native Ctrl+Z works where path (1) succeeded.

## Alternatives considered
- Setting value + synthetic events only: breaks rich editors.
- Editor-specific adapters first: high upfront cost.

## Rationale
`insertText` is deprecated but supported in all target browsers and keeps the native undo stack.

## Consequences
- Must detect which path worked; formatting in contenteditable is not preserved (out of scope).
- Test: fixtures per path, React-controlled fixture, manual site checklist.

## Related
- [Requirements](../requirements/product.md)
- [Architecture](../architecture/system.md)

## Refinements (slice 4, still proposed)
- `execCommand` does not fire `beforeinput`, so editors see the change through `input`/DOM mutations.
- Before replacing, check the field text (and, for contenteditable, the captured Range) is unchanged since capture; otherwise do nothing and ask the user to retry.
- contenteditable undo: try `execCommand('undo')`; if the text is not restored (editors that re-render break the native stack), insert the captured original text as plain text.
- Tests: `tests/e2e/contenteditable.spec.ts`, `tests/unit/edit.test.ts`.
