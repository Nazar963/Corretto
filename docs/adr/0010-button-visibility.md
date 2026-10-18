---
id: ADR-0010
status: proposed   # proposed | accepted | superseded — only the human sets "accepted"
date: 2026-10-18
supersedes: []
---

# Button visibility rule

## Context
A button on every field is noisy; the user wants it persistent while working.

## Decision
Show on the focused field once text reaches the minimum (default 3 words or 15 characters, configurable); keep it while focused and ~2 s after blur; anchored bottom-right; not in the Tab order.

## Alternatives considered
- Always visible on every field.
- Hover-only.

## Rationale
Approved by the user in chat 2026-10-18.

## Consequences
- Positioning must track scroll, resize and layout changes.
- Test: e2e for threshold, focus/blur and focus retention on click.

## Related
- [Requirements](../requirements/product.md)
- [Architecture](../architecture/system.md)
