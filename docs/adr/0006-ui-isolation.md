---
id: ADR-0006
status: proposed   # proposed | accepted | superseded — only the human sets "accepted"
date: 2026-10-18
supersedes: []
---

# In-page UI in Shadow DOM; vanilla TS in pages, Preact in extension pages

## Context
Injected UI must not be broken by, or break, page styles, and must stay small.

## Decision
Button, popup and toast render in a closed Shadow DOM attached to a host element, written in vanilla TypeScript. Options, onboarding and toolbar popup pages use Preact.

## Alternatives considered
- Iframe overlay: stronger isolation, heavier, harder positioning.
- React everywhere: larger content script.

## Rationale
Keeps the content script under the size budget; Preact keeps extension pages pleasant to write.

## Consequences
- Two UI styles in one codebase.
- Test: size budget check in CI; fixture page with aggressive global CSS.

## Related
- [Requirements](../requirements/product.md)
- [Architecture](../architecture/system.md)
