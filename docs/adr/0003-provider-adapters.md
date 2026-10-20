---
id: ADR-0003
status: proposed   # proposed | accepted | superseded — only the human sets "accepted"
date: 2026-10-18
supersedes: []
---

# Provider abstraction: OpenAI-compatible adapter plus Anthropic adapter

## Context
FR-015 requires free-tier, paid and local providers plus custom endpoints.

## Decision
Thin fetch-based adapters: one OpenAI-compatible adapter (Groq, OpenRouter, Mistral, Gemini's OpenAI-compatible endpoint, OpenAI, Ollama, LM Studio, custom URL) and one native Anthropic adapter. Provider presets (base URL, suggested model, key link) are data, not code.

## Alternatives considered
- One native adapter per provider: more code to maintain.
- Vercel AI SDK: handles structured output but adds a heavy dependency.

## Rationale
Most providers speak the OpenAI chat-completions format; models change often, so presets as data keep updates cheap.

## Consequences
- Provider-specific quirks (JSON mode support, headers) live in preset flags.
- Test: contract tests per adapter against recorded responses.

## Related
- [Requirements](../requirements/product.md)
- [Architecture](../architecture/system.md)

## Refinements (slice 6, still proposed)
- Anthropic: the Claude API guidance prefers the official SDK in TypeScript projects. On 2026-10-20 the user chose raw fetch to stay consistent with this ADR (no new dependency, same timeout/cancel/error handling, testable with the mock server).
- Structure: `lib/providers/common.ts` (shared HTTP/errors), one file per API style, `index.ts` dispatches on the preset's `api` field. Presets also declare `local` (no key, 120 s timeout) and `editableBaseUrl`.
- Tests: `tests/unit/providers.test.ts`.
