---
id: ADR-0002
status: proposed   # proposed | accepted | superseded — only the human sets "accepted"
date: 2026-10-18
supersedes: []
---

# LLM calls only from the background; key never reaches content scripts

## Context
The API key is sensitive and provider APIs may not allow CORS from arbitrary page origins.

## Decision
Content scripts send the text to the background via runtime messaging. Only the background reads the key and calls the provider.

## Alternatives considered
- Calling from the content script: CORS failures and the key would be sent to every page's content script.

## Rationale
Smaller exposure of the key; extension-origin requests with host permissions avoid CORS problems.

## Consequences
- Messaging layer needs typed requests/responses and cancellation.
- Test: content-script code has no access path to the key (unit test on message handlers).

## Related
- [Requirements](../requirements/product.md)
- [Architecture](../architecture/system.md)
