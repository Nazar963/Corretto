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

## Revision (2026-10-20, user's decision; still proposed)
- **Chromium builds** declare `host_permissions: ["<all_urls>"]` and `scripting`. On install and update the background injects the content script into tabs that were already open (Chromium does not do this itself), so the button works without refreshing Gmail, Notion, etc. Content scripts alone do not grant the host access `scripting.executeScript` needs.
- Same install warning as before (the all-sites content script already showed it). Consequence: provider hosts are already granted on Chromium, so Save/Test show no permission prompt there; the permission check stays for Firefox.
- **Firefox** is unchanged: optional provider host permissions; Firefox injects declared content scripts into open tabs itself.
- Tests: `tests/e2e/existing-tabs.spec.ts` (open page first, then install via CDP; fails without the injection, checked), `tests/e2e/provider.spec.ts`.
