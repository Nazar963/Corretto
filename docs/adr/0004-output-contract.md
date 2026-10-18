---
id: ADR-0004
status: proposed   # proposed | accepted | superseded — only the human sets "accepted"
date: 2026-10-18
supersedes: []
---

# Output contract: JSON with three fixed tones

## Context
FR-005 needs exactly three rewrites in fixed tones; small local models produce malformed output more often.

## Decision
Ask for JSON `{"minimal": "...", "fluent": "...", "formal": "..."}`. Use the provider's JSON mode when the preset supports it. Parse tolerantly (strip code fences, extract the first JSON object), validate, and retry once on failure before showing an error.

## Alternatives considered
- Delimited plain text: simpler, but breaks more often.

## Rationale
JSON is easy to validate and widely supported via JSON mode.

## Consequences
- Test: parser unit tests with fenced, truncated, extra-key and wrong-type outputs.

## Related
- [Requirements](../requirements/product.md)
- [Architecture](../architecture/system.md)
