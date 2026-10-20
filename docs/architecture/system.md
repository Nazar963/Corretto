# System architecture

Status: design (approved in chat 2026-10-18). Code is the source of truth once it exists.

```
Page (each frame)                       Extension
┌──────────────────────────┐   runtime   ┌───────────────────────────────┐
│ content script           │  messaging  │ background (SW / event page)  │
│  • field detector        │ ──────────▶ │  • settings + key (storage)   │
│  • button/popup/toast    │ ◀────────── │  • prompt builder             │
│    (Shadow DOM)          │             │  • provider adapters → fetch  │
│  • replacement + undo    │             │  • response parser/validator  │
└──────────────────────────┘             └───────────────────────────────┘
                     options page · onboarding page · toolbar popup
```

## Components
- **Content script** (`<all_urls>`, all frames): detects eligible fields, shows the button, captures text/selection, renders popup and toast, performs replacement and undo. Vanilla TS in a closed Shadow DOM. See [ADR-0005](../adr/0005-text-replacement.md), [ADR-0006](../adr/0006-ui-isolation.md), [ADR-0010](../adr/0010-button-visibility.md).
- **Background**: only place that reads the key and calls providers. See [ADR-0002](../adr/0002-llm-calls-in-background.md), [ADR-0003](../adr/0003-provider-adapters.md), [ADR-0004](../adr/0004-output-contract.md).
- **Extension pages** (Preact): options (slice 3), toolbar popup (slice 7); onboarding later.
- **Messaging**: a `runtime.connect` port per rewrite (closing it cancels the fetch); `runtime.sendMessage` for test-connection (extension pages only) and open-settings. See `lib/messages.ts`.
- **Storage**: `storage.local` only: `settings` (provider, key, model; background and extension pages) and `prefs` (minimum length, site lists; also read by content scripts). See [ADR-0008](../adr/0008-privacy.md).

## Stack
WXT + TypeScript ([ADR-0001](../adr/0001-wxt-framework.md)), Preact for extension pages, Vitest + happy-dom, Playwright (Chromium with extension loaded, local mock OpenAI-compatible server), `web-ext lint` for Firefox. npm.

## Permissions
See [ADR-0007](../adr/0007-permissions.md) and [ADR-0009](../adr/0009-sensitive-fields.md).
