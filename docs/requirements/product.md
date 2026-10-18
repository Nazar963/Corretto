---
id: REQ-PRODUCT
status: proposed   # proposed | approved — only the human sets "approved"
---

# Product Requirements — Corretto

Cross-browser extension (Chrome, Brave, Edge, Firefox). A button on text fields sends the text to an LLM chosen by the user (BYOK) and offers 3 rewrites in the same language; picking one replaces the text.

Origin labels: **[T]** told by the user · **[A]** assumption · **[P]** proposed by Claude, approved by the user in chat on 2026-10-18.
This file stays `proposed` until the user changes the status.

## Users
- General public writing emails and social posts [T]. Non-technical: onboarding needs step-by-step help [T].
- Expected scale: ~50 users in the first 6 months [T].

## FR-001: Detect text fields
Supported: `<textarea>`, `<input type=text|search>` [A], `contenteditable` [T]; includes fields added after load [A] and fields in iframes (all frames) [T].

### Acceptance criteria
- AC-001: Given a fixture page with each supported field, when a field is focused and meets FR-002, then a button appears.
- AC-002: Given a field inserted by script after load, when it is focused, then the button appears within 500 ms.
- AC-003: Given a supported field inside an iframe, when it is focused, then the button appears.

## FR-002: Button visibility [P]
The button appears on the focused field once its text reaches the minimum length (default 3 words or 15 characters, configurable). It stays while the field has focus and ~2 s after blur, anchored to the field's bottom-right corner, following scroll and resize.

### Acceptance criteria
- AC-001: Given text below the minimum, then no button; when the minimum is reached, then the button appears.
- AC-002: When the button is clicked, then the field keeps focus and selection.
- AC-003: The button does not cover the field's scrollbar and is not in the page Tab order.

## FR-003: Excluded fields [T/A]
Never show a button on `password`, `email`, `tel`, `url`, `number`, `hidden` inputs; readonly or disabled fields; fields with `autocomplete` `cc-*`, `one-time-code`, `current-password`, `new-password`.

### Acceptance criteria
- AC-001: Given a fixture for each excluded case, when focused with long text, then no button appears.

## FR-004: Text scope [T]
Use the selection inside the field if non-empty, otherwise the whole field.

### Acceptance criteria
- AC-001: Given a selection, then only the selected text is sent and later replaced.
- AC-002: Given no selection, then the whole field is sent and replaced.

## FR-005: Three alternatives [T]
Fixed tones: **Minimal fix**, **More fluid**, **More formal**. Users cannot choose a tone [T]. Same meaning and same language as the input [T].

### Acceptance criteria
- AC-001: Given a mock provider response, then the parser yields exactly three labelled texts or a typed error.
- AC-002: Given a manual set of ~20 sentences in at least 6 languages (incl. one mixed), then every output is in the input's language.

## FR-006: Results popup [T]
Shows the 3 labelled options as plain text [T]. Arrow keys, Enter, Esc, and click-outside work [A].

### Acceptance criteria
- AC-001: When an option is picked by mouse or keyboard, then it replaces the text.
- AC-002: When Esc is pressed or the user clicks outside, then the popup closes and the text is unchanged.

## FR-007: Replacement [T]
Replace the selection or whole field so the site's code sees the change.

### Acceptance criteria
- AC-001: Given a React-controlled fixture, when replaced, then the component state holds the new text.
- AC-002: Manual checklist passes on Gmail, LinkedIn, X and Outlook web [A].

## FR-008: Undo [T]
A toast "Replaced · Undo" for 10 s [A]; native Ctrl+Z where the browser supports it [A]. If the user edits after replacement, the Undo button disappears [A].

### Acceptance criteria
- AC-001: When Undo is clicked, then the exact original text and caret position are restored, for each field kind.
- AC-002: Given an edit after replacement, then the Undo button is gone.

## FR-009: Loading and error states [T]
Spinner with Cancel. Errors: no key, invalid key (401), rate limit (429), timeout, local server unreachable, unreadable output, text too long. Each has a plain message and an action (Retry / Open settings).

### Acceptance criteria
- AC-001: For each error, triggered via the mock provider, the matching message and action are shown.
- AC-002: When Cancel is clicked, then the request is aborted and the text is unchanged.

## FR-010: Keyboard shortcut [T]
Default `Alt+Shift+C` [P], changeable in the browser's shortcut settings [A].

### Acceptance criteria
- AC-001: Given a focused eligible field, when the shortcut is pressed, then the popup opens for it.

## FR-011: Settings [T]
Provider, API key, model, base URL (local/custom), minimum length, site list. "Test connection" button [A].

### Acceptance criteria
- AC-001: Settings persist across browser restarts.
- AC-002: "Test connection" reports success or the specific error.

## FR-012: Per-site off switch [T]
Toggle from the toolbar popup; listed in options.

### Acceptance criteria
- AC-001: When a site is turned off, then its buttons disappear immediately and other sites are unaffected.

## FR-013: Sensitive sites blocked by default [T/P]
A short built-in list of domain patterns (major banks, health portals, government ID sites), editable by the user. Known to be incomplete; accepted by the user.

### Acceptance criteria
- AC-001: Given a listed domain, then no button appears.
- AC-002: The user can add and remove entries.

## FR-014: Onboarding guide [T]
Opens on first install; step-by-step instructions and links per provider, with privacy notes on free tiers [A].

### Acceptance criteria
- AC-001: Opens on first install only.
- AC-002: Each provider guide ends with a successful "Test connection".

## FR-015: Providers [T]
Free tiers (Google Gemini, Groq, OpenRouter free models, Mistral) [A]; paid (OpenAI, Anthropic) [A]; local (Ollama, LM Studio) [A]; any custom OpenAI-compatible endpoint [A].

### Acceptance criteria
- AC-001: Each adapter passes contract tests against recorded responses.
- AC-002: One manual call per provider succeeds.

## FR-016: No history [T]
Corrected text is never stored.

### Acceptance criteria
- AC-001: After a full flow, extension storage contains only settings.

## FR-017: English UI, i18n-ready [T/A]
All UI strings in `_locales/`.

### Acceptance criteria
- AC-001: No hard-coded user-facing strings outside `_locales`.

## Non-functional requirements
- **Privacy / GDPR:** zero telemetry, no backend [T]. Text is sent only after an explicit click or shortcut [A], only to the chosen provider [T], never stored [T]. Privacy policy on GitHub Pages [T], EU/GDPR jurisdiction [T]; states that free tiers may train on text [A].
- **Security:** key in `storage.local`, never `storage.sync` [A]; key read only by the background, never sent to content scripts [A]; stored unencrypted, disclosed in the policy [A]; model output rendered via `textContent` only [A]; no remote code [A]; provider hosts are optional permissions requested on selection [P].
- **Performance:** content script < ~30 KB gzipped [A]; no network until click [A]; no typing lag [A]; max input 5,000 characters [A]; timeout 30 s cloud / 120 s local [A].
- **Compatibility:** Chrome, Brave, Edge latest 2 versions; Firefox 128 ESR+; MV3 everywhere [A].
- **Accessibility:** ARIA labels, keyboard-operable popup, WCAG AA contrast, light/dark [A].

## Business rules
- Always free [T]. BYOK only [T]. No accounts [A].
- Users accept their provider's terms [A].
- Stores: Chrome Web Store (also serves Brave), Firefox AMO, Edge Add-ons [T]. Developer accounts provided by the user when needed [T].

## Out of scope (for now) [T]
- Google Docs, Office Online, Notion canvas, Figma and other canvas/custom-model editors.
- Real-time underlining.
- Mobile browsers, Safari.
- Accounts, backend, sync.
- Preserving rich-text formatting in replacements (plain text only).
- User-chosen tones; correction history; explanations/diffs [T].

## Open questions
- Firefox AMO `data_collection_permissions`: does sending text to the user-chosen provider count as "website content"? Verify before submission.
- Exact free-tier data-use terms per provider for the privacy policy and onboarding (verify before release).
- Icon/branding: placeholder for now [T].
