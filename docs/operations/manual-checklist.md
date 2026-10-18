# Manual site checklist

Real sites need a signed-in user, so these checks are run by hand, not by CI.
Load the dev build: `npm run build`, then in Chrome/Brave open `chrome://extensions`, enable Developer mode, **Load unpacked** → `.output/chrome-mv3`. Configure a provider in the extension's settings first.

Record each run in [status/current.md](../status/current.md) with the date, browser version and result.

## For every site
| # | Step | Expected |
|---|---|---|
| 1 | Focus the editor, type ≥ 3 words | Button appears bottom-right inside the editor |
| 2 | Click the button | Loading, then 3 options in the same language |
| 3 | Pick an option | Text replaced; site shows it (no revert on next keystroke); toast "Replaced · Undo" |
| 4 | Click Undo | Original text back |
| 5 | Repeat 2–3, then Ctrl+Z | Original text back (if the site supports native undo) |
| 6 | Select one sentence, repeat 2–3 | Only the selection replaced |
| 7 | Send/save as a draft | Sent/saved text is the replaced text |

## Sites
| Site | Editor | Notes |
|---|---|---|
| Gmail compose (mail.google.com) | contenteditable `div[role=textbox]` | Check reply and new message; check draft saved |
| LinkedIn post and message (linkedin.com) | contenteditable (Quill-like) | Post box opens in a modal |
| X post (x.com) | Draft.js contenteditable | Known hard case for programmatic edits |
| Outlook web (outlook.live.com) | contenteditable | Check new mail body |
| GitHub comment (github.com) | `<textarea>` | Control case |
| Any form with a `<textarea>` | `<textarea>` | Control case |

Rich formatting inside the replaced range becomes plain text (accepted, out of scope).
