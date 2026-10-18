---
id: ADR-0008
status: proposed   # proposed | accepted | superseded — only the human sets "accepted"
date: 2026-10-18
supersedes: []
---

# Privacy: zero telemetry, no backend, nothing stored

## Context
Public release under EU/GDPR, always free, BYOK.

## Decision
No telemetry or analytics. No backend. Corrected text is never stored. Settings and key in `storage.local` (never `storage.sync`); key stored unencrypted and disclosed in the privacy policy.

## Alternatives considered
- Anonymous error reporting: rejected by the user.
- Encrypting the key: impossible without a user password prompt.

## Rationale
Simplest compliant posture; nothing to secure server-side.

## Consequences
- Bug reports depend on users describing issues.
- Test: storage contains only settings after a full flow.

## Related
- [Requirements](../requirements/product.md)
- [Architecture](../architecture/system.md)
