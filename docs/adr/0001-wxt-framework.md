---
id: ADR-0001
status: proposed   # proposed | accepted | superseded — only the human sets "accepted"
date: 2026-10-18
supersedes: []
---

# WXT as extension framework, MV3 everywhere

## Context
One codebase must ship to Chrome, Brave, Edge and Firefox, with per-browser manifests and zips.

## Decision
Use WXT with TypeScript. Target Manifest V3 for all browsers (Firefox uses an event page background, which WXT handles).

## Alternatives considered
- Plasmo: React-first, maintenance noticeably slower since 2024.
- Plain Vite + webextension-polyfill: full control, but we write multi-browser manifest generation, packaging and dev reload ourselves.

## Rationale
Actively maintained, framework-agnostic, built-in cross-browser builds and zipping. Approved by the user in chat 2026-10-18.

## Consequences
- Build and packaging are WXT conventions (`entrypoints/`); upgrading WXT may need migration.
- Test: Chrome and Firefox builds both load and pass `npm run validate`.

## Related
- [Requirements](../requirements/product.md)
- [Architecture](../architecture/system.md)
