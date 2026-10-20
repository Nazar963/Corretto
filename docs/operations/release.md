# Release: store listings, packaging, submission

Draft for slice 10. Nothing here has been submitted. Items marked **TODO (user)** need the user's accounts or decisions.

## Before the first submission — checklist
- [x] Icon from the user's artwork (`store/brand/icon-artwork.jpg`), built by `python3 scripts/make-brand.py` into `public/icon/{16,32,48,96,128}.png` (16/32 use a closer crop; 16 px is only roughly legible, normal for detailed art) and `store/brand/icon-512.png`.
- [x] Small promo tile (440×280): `store/promo/small-tile-440x280.png` (user's icon, name and what it does; rendered from `store/brand/promo-tile.html`). Chosen by the user 2026-10-20 over a crop of `store/brand/promo-artwork.jpg`, which showed the Chrome logo and "Chrome AI features".
- [x] Contact address in `site/privacy.html`: nizarjandalybusiness@gmail.com (given by the user 2026-10-20).
- [ ] **TODO (user)**: enable GitHub Pages (Settings → Pages → Source: GitHub Actions), push `main`, set the effective date in `site/privacy.html`; the policy URL will be `https://<user>.github.io/<repo>/privacy.html`.
- [x] Version 1.0.0 (`package.json`, manifest).
- [ ] **TODO (user)**: developer accounts: Chrome Web Store (one-time fee), Microsoft Partner Center (Edge), addons.mozilla.org.
- [ ] Have the privacy policy reviewed; it was drafted by Claude and is not legal advice.
- [ ] Check provider privacy-policy links and free-tier data terms (onboarding note is deliberately general).
- [ ] Check unverified default models (Groq, OpenRouter, Mistral, OpenAI, Anthropic) with real keys; Gemini is verified.
- [ ] Manual checks still open: [site checklist](manual-checklist.md), real permission prompt in the setup guide, Firefox extension pages and shortcut, branded Chrome.

## Listing text (all stores)
- **Name**: Corretto
- **Short description** (Chrome ≤ 132 chars; 129): Rewrite text in any field into 3 clearer versions (minimal fix, more fluid, more formal) with your own AI key. Free, no tracking.
- **Category**: Chrome/Edge "Productivity"; Firefox "Productivity" or "Language Support" if offered (confirm at upload).
- **Detailed description**:

> Corretto helps you write clearer text anywhere on the web: emails, posts, messages, forms.
>
> Type in any text field and a small Corretto button appears. Click it (or press Alt+Shift+C) to get three rewrites of your text, in the same language you wrote it in:
> • Minimal fix: spelling, grammar and punctuation only
> • More fluid: reads more naturally
> • More formal: more polished
>
> Pick one and it replaces your text. Changed your mind? Click Undo or press Ctrl+Z. Select part of your text to rewrite only that part.
>
> Bring your own AI: Google Gemini, Groq, Mistral and OpenRouter (free tiers), OpenAI and Anthropic, or a model on your own computer with Ollama or LM Studio. A short setup guide walks you through getting a key.
>
> Private by design: Corretto has no server and collects no data. Your text goes only to the provider you chose, only when you click. It never appears on password or payment fields, stays off banking, health and government sites by default, and can be turned off on any site from the toolbar.
>
> Works in Gmail, LinkedIn and most websites with normal text fields. Not supported: Google Docs and other editors that draw text themselves.

## Chrome Web Store / Edge Add-ons forms
- **Single purpose**: Rewrite text that the user typed in a web page's text field into three alternative versions, using the AI provider the user configured, and replace the text with the version the user picks.
- **Permission justifications**:
  - Host access to all sites (content script on `<all_urls>`): needed to show the rewrite button in text fields on any website and to replace the text when the user picks a rewrite. The script does nothing until the user focuses a text field and does not read pages otherwise.
  - `storage`: stores the user's provider settings, API key and display preferences on the device.
  - Optional host permissions (`https://*/*`, `http://localhost/*`, `http://127.0.0.1/*`): requested only for the origin of the AI provider the user selects (or their local server), to send the text there.
- **Remote code**: No. All code is in the package.
- **Data usage disclosures**: handles *Website content* and *Personal communications* (the text the user chooses to rewrite), sent only to the user's chosen AI provider when the user asks. Not sold, not used for unrelated purposes, not used for creditworthiness or lending. No other categories.
- **Privacy policy URL**: the GitHub Pages URL above.
- **Screenshots** (1280×800, `npm run screenshots` → `store/screenshots/`): suggestions, replaced with undo, setup guide, settings. The same command renders the recommended promo tile.

## Firefox (AMO)
- Manifest declares `data_collection_permissions.required: ["websiteContent", "personalCommunications"]` (user's decision 2026-10-20) and `strict_min_version: 140`. Mark the listing as Firefox desktop only (Android out of scope).
- **Source code**: AMO requires sources for bundled code. `npm run zip:firefox` writes both the add-on zip and `corretto-<version>-sources.zip` to `.output/`.
- **Reviewer notes** (paste):
  > Built with WXT (Vite) and Preact. Build: Node 22+, `npm ci`, `npm run zip:firefox`; the add-on is `.output/firefox-mv3`.
  > The `UNSAFE_VAR_ASSIGNMENT` lint warning is inside Preact's runtime (`dangerouslySetInnerHTML` support); Corretto's own code never assigns `innerHTML`, and model output is rendered with `textContent`.
  > To test without an account: install Ollama locally, pull any small model, choose "Ollama" in the setup guide. Or use a free Google Gemini key.

## Packaging
- `npm run zip` → `.output/corretto-<version>-chrome.zip` (Chrome Web Store, Edge Add-ons; Brave uses the Chrome Web Store).
- `npm run zip:firefox` → `.output/corretto-<version>-firefox.zip` and `-sources.zip`.

## Submission workflow
`.github/workflows/submit.yml` (manual trigger only) runs lint, typecheck, unit tests, zips, the size check and `wxt submit` (publish-browser-extension 6.2). It defaults to a **dry run** that only checks credentials. Firefox is submitted as desktop-only (`FIREFOX_COMPATIBILITY=firefox`). Chrome uses Web Store API v2 with a service account (the v1.1 OAuth refresh-token flow is marked deprecated in the tool).

Repository secrets it expects (names only; values come from each store's developer console):
`CHROME_EXTENSION_ID`, `CHROME_PUBLISHER_ID`, `CHROME_SERVICE_ACCOUNT_CLIENT_EMAIL`, `CHROME_SERVICE_ACCOUNT_PRIVATE_KEY`, `FIREFOX_EXTENSION_ID`, `FIREFOX_JWT_ISSUER`, `FIREFOX_JWT_SECRET`, `EDGE_PRODUCT_ID`, `EDGE_CLIENT_ID`, `EDGE_API_KEY`.

The first upload to each store is done by hand in the store's web form (listing, screenshots, disclosures, privacy URL); the workflow is for later updates. Neither the workflow nor the GitHub Pages workflow has run yet (nothing pushed).

## Verified locally (2026-10-20)
- `npm run zip` / `npm run zip:firefox` produce `corretto-1.0.0-chrome.zip` (94 KB), `-firefox.zip` (94 KB) and `-sources.zip` (docs, store assets, site and Claude settings excluded). The sources-zip rebuild check was done on 0.0.1, before the icon change.
- Rebuilding from the sources zip (`npm ci`, `npx wxt build -b firefox`) gives output identical to the project build (`diff -rq`).
- `web-ext lint`: 0 errors; 1 warning (Preact runtime `innerHTML`, explained in reviewer notes).
