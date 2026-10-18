---
id: ADR-0007
status: proposed   # proposed | accepted | superseded — only the human sets "accepted"
date: 2026-10-18
supersedes: []
---

# Permission model

## Context
A persistent button on any site needs page access; provider hosts vary per user.

## Decision
Content script registered on `<all_urls>`, all frames. Provider hosts are `optional_host_permissions`, requested when the user selects a provider or custom URL.

## Alternatives considered
- `activeTab` only: cannot show a button without a click on the toolbar first.

## Rationale
Required for the core UX; optional permissions limit network reach to what the user chose.

## Consequences
- Chrome reviews broad host permissions more slowly.
- Test: request fails with a clear error when permission was denied.

## Related
- [Requirements](../requirements/product.md)
- [Architecture](../architecture/system.md)
