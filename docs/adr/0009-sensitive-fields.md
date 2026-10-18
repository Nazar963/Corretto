---
id: ADR-0009
status: proposed   # proposed | accepted | superseded — only the human sets "accepted"
date: 2026-10-18
supersedes: []
---

# Sensitive-field and sensitive-site policy

## Context
Users must not accidentally send passwords, card data or health/banking content.

## Decision
Exclude fields per FR-003. Ship a short, user-editable default list of sensitive domain patterns (FR-013). Per-site off switch (FR-012).

## Alternatives considered
- Heuristic content detection: unreliable.
- No default list: simpler but riskier.

## Rationale
Accepted by the user as incomplete but useful.

## Consequences
- The default list needs occasional maintenance.
- Test: fixture per excluded field type; domain-matching unit tests.

## Related
- [Requirements](../requirements/product.md)
- [Architecture](../architecture/system.md)
