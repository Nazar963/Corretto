# Knowledge Index

Entry point for Claude Code and for humans. Keep this file short: it points to notes, it does not contain them.

## Project
**Corretto** — cross-browser extension that rewrites text in any field into 3 alternatives (minimal fix / more fluid / more formal) using the user's own LLM key.

## Notes
- Requirements: [product](requirements/product.md)
- Architecture: [system](architecture/system.md)
- Decisions (ADR, all proposed): [0001 WXT](adr/0001-wxt-framework.md) · [0002 background calls](adr/0002-llm-calls-in-background.md) · [0003 providers](adr/0003-provider-adapters.md) · [0004 output](adr/0004-output-contract.md) · [0005 replacement](adr/0005-text-replacement.md) · [0006 UI isolation](adr/0006-ui-isolation.md) · [0007 permissions](adr/0007-permissions.md) · [0008 privacy](adr/0008-privacy.md) · [0009 sensitive fields](adr/0009-sensitive-fields.md) · [0010 button visibility](adr/0010-button-visibility.md)
- Features: [field button](features/field-button.md) · [rewrite flow](features/rewrite-flow.md) · [providers and settings](features/provider-settings.md) · [contenteditable](features/contenteditable.md) · [sites and shortcut](features/sites-and-shortcut.md) · [setup guide](features/onboarding.md) · [browsers, a11y, size](features/browsers-a11y-size.md)
- Operations: [testing](operations/testing.md) · [manual site checklist](operations/manual-checklist.md) · [release](operations/release.md)
- Current status: [status/current.md](status/current.md) · [roadmap](status/roadmap.md)

## Retrieval rules
- Changing behaviour of a feature: read the requirement, the feature note and the relevant ADRs.
- Releasing: read [operations/release.md](operations/release.md). Public site: `site/` (not this vault).
- Code, migrations and tests win over notes; report contradictions.
