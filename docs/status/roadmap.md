# Roadmap — incremental slices

Approved in chat 2026-10-18. Each slice ends with a check; progress is tracked in [current.md](current.md).

| Slice | Scope | Check |
|---|---|---|
| 0 | WXT scaffold, TypeScript, ESLint, Vitest, Playwright, `npm run validate`, CI | `validate` passes on an empty extension; Chrome and Firefox builds load |
| 1 | Field detector + button on textarea/input, exclusions (FR-001–003) | Fixture e2e |
| 2 | Mock provider, popup, replacement + undo for textarea/input (FR-004, 006–008) | e2e against mock |
| 3 | Background messaging, settings page, OpenAI-compatible adapter, error states (FR-009, 011) | Contract tests + manual Groq/Gemini call |
| 4 | contenteditable support (FR-001, 007) | Fixtures per replacement path; manual Gmail/LinkedIn checklist |
| 5 | Selection mode everywhere (FR-004) | e2e |
| 6 | Anthropic adapter, Ollama, LM Studio, custom URL (FR-015) | Contract tests + manual call each |
| 7 | Visibility rule, per-site off, sensitive list, shortcut (FR-002, 010, 012, 013) | e2e |
| 8 | Onboarding guide (FR-014) | Manual walkthrough per provider |
| 9 | Firefox/Brave/Edge pass, accessibility, size budget | `web-ext lint`, manual matrix, bundle-size check |
| 10 | Privacy policy (GitHub Pages), store listings, packaging, replace old Plasmo `submit.yml` | Store dry runs; verify AMO `data_collection_permissions` |
