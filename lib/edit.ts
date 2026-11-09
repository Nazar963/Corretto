// Capture, replacement and undo (FR-004, FR-007, FR-008).
// Strategy and fallback order: docs/adr/0005-text-replacement.md.
// Replacements are plain text; rich formatting in the replaced range is not kept (out of scope).

import { debugLog } from './debug';
import { isTextField, type Field, type TextField } from './fields';

export type ReplaceMethod = 'insertText' | 'paste' | 'setRangeText' | 'range';

export interface Replacement {
  method: ReplaceMethod;
  /** Whether `undo` can still restore the original text (the field is unchanged since). */
  canUndo(): boolean;
  /** Restore the original text and selection. Resolves false if the field was edited since. */
  undo(): Promise<boolean>;
}

export interface Target {
  field: Field;
  /** Text sent to the provider: the selection, or the whole field (FR-004). */
  text: string;
  /** Put focus and the original selection back (Esc, Cancel). */
  restoreSelection(): void;
  /** Replace the captured range, or resolve null if the field changed since capture. */
  replace(text: string): Promise<Replacement | null>;
}

export function captureTarget(field: Field): Target {
  return isTextField(field) ? captureTextField(field) : captureEditable(field);
}

/** Whitespace-insensitive comparison; innerText formatting varies between engines and editors. */
function normalize(text: string): string {
  return text.replace(/\s+/g, ' ').trim();
}

function tryInsertText(text: string): boolean {
  try {
    // Deprecated but supported in every target browser; keeps native undo and editor state (ADR-0005).
    return document.execCommand('insertText', false, text);
  } catch {
    return false;
  }
}

// ---------------------------------------------------------------------------
// <textarea> / <input>

/** Replace `[start, end)` with `text`: insertText first, then setRangeText + input event. */
export function replaceRange(field: TextField, start: number, end: number, text: string): ReplaceMethod {
  const before = field.value;
  const expected = before.slice(0, start) + text + before.slice(end);
  field.focus();
  field.setSelectionRange(start, end);
  if (tryInsertText(text) && field.value === expected) return 'insertText';
  field.value = before;
  field.setRangeText(text, start, end, 'end');
  const caret = start + text.length;
  field.setSelectionRange(caret, caret);
  field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: text }));
  return 'setRangeText';
}

function captureTextField(field: TextField): Target {
  const value = field.value;
  const selectionStart = field.selectionStart ?? 0;
  const selectionEnd = field.selectionEnd ?? selectionStart;
  const selected = value.slice(selectionStart, selectionEnd);
  const [start, end] = selected.trim() !== '' ? [selectionStart, selectionEnd] : [0, value.length];

  const restoreSelection = () => {
    field.focus();
    field.setSelectionRange(selectionStart, selectionEnd);
  };

  return {
    field,
    text: value.slice(start, end),
    restoreSelection,
    async replace(text) {
      // The user typed while the provider was working: offsets no longer match.
      if (!field.isConnected || field.value !== value) return null;
      const original = value.slice(start, end);
      const method = replaceRange(field, start, end, text);
      const after = field.value;
      const canUndo = () => field.isConnected && field.value === after;
      return {
        method,
        canUndo,
        async undo() {
          if (!canUndo()) return false;
          replaceRange(field, start, start + text.length, original);
          restoreSelection();
          return true;
        },
      };
    },
  };
}

// ---------------------------------------------------------------------------
// contenteditable

/**
 * Model-driven editors (Lexical in WhatsApp/Messenger, ProseMirror, Slate, Draft.js) read the
 * DOM selection on `selectionchange` and commit their own edits asynchronously.
 */
export const settle = (): Promise<void> => new Promise((resolve) => setTimeout(resolve, 0));

/** The next frame, or a short timeout where frames are throttled (hidden tabs, offscreen iframes). */
function nextFrame(win: Window): Promise<void> {
  return new Promise((resolve) => {
    const timer = setTimeout(resolve, 50);
    win.requestAnimationFrame(() => {
      clearTimeout(timer);
      resolve();
    });
  });
}

/**
 * Select `range` and wait until the editor has taken it in: the browser's `selectionchange`
 * (whose order relative to timers is not guaranteed), then a frame for editors that sync their
 * selection on the next frame. Inserting earlier puts the text at the editor's old caret:
 * "appends instead of replaces" on WhatsApp Web.
 */
async function selectAndSync(host: HTMLElement, range: Range): Promise<void> {
  const doc = host.ownerDocument;
  const changed = new Promise<void>((resolve) => {
    // No event comes when the selection was already exactly this range.
    const timer = setTimeout(resolve, 150);
    doc.addEventListener(
      'selectionchange',
      () => {
        clearTimeout(timer);
        resolve();
      },
      { once: true },
    );
  });
  select(host, range);
  await changed;
  await nextFrame(doc.defaultView ?? window);
  await settle();
}

/** Poll for up to `timeoutMs` (frame by frame) until `done()` holds; resolves whether it did. */
async function waitUntil(host: HTMLElement, done: () => boolean, timeoutMs = 500): Promise<boolean> {
  const end = Date.now() + timeoutMs;
  const win = host.ownerDocument.defaultView ?? window;
  await settle();
  while (!done()) {
    if (Date.now() >= end) return false;
    await nextFrame(win);
  }
  return true;
}

function selectionIn(host: HTMLElement): Range | null {
  const selection = host.ownerDocument.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  return host.contains(range.commonAncestorContainer) ? range.cloneRange() : null;
}

function select(host: HTMLElement, range: Range) {
  const selection = host.ownerDocument.getSelection();
  selection?.removeAllRanges();
  selection?.addRange(range);
}

/**
 * The whole text, from the first character of the first text node to the end of the last one.
 * Editors map that to their own model; a range on the host element itself (selectNodeContents)
 * is ignored by Lexical, which is why whole-message rewrites failed on WhatsApp.
 */
function wholeTextRange(host: HTMLElement): Range {
  const doc = host.ownerDocument;
  const range = doc.createRange();
  const walker = doc.createTreeWalker(host, NodeFilter.SHOW_TEXT);
  const first = walker.nextNode() as Text | null;
  if (!first) {
    range.selectNodeContents(host);
    return range;
  }
  let last = first;
  for (let node = walker.nextNode(); node; node = walker.nextNode()) last = node as Text;
  range.setStart(first, 0);
  range.setEnd(last, last.length);
  return range;
}

/** Hand the text to the editor as a paste: editors that ignore insertText handle paste themselves. */
function tryPaste(host: HTMLElement, text: string): boolean {
  try {
    const data = new DataTransfer();
    data.setData('text/plain', text);
    host.dispatchEvent(new ClipboardEvent('paste', { clipboardData: data, bubbles: true, cancelable: true }));
    return true;
  } catch {
    return false;
  }
}

/** Plain text as nodes, with <br> for line breaks. */
function textFragment(doc: Document, text: string): DocumentFragment {
  const fragment = doc.createDocumentFragment();
  text.split('\n').forEach((line, index) => {
    if (index > 0) fragment.append(doc.createElement('br'));
    if (line) fragment.append(doc.createTextNode(line));
  });
  return fragment;
}

/**
 * Put `text` in place of `rangeFor()` through the editor's own input paths: insertText, then a
 * paste event. Each attempt reselects (editors may have re-rendered) and is checked after the
 * editor has had its turn. Resolves the method that worked, or null if the editor took neither.
 */
async function insertThroughEditor(
  host: HTMLElement,
  rangeFor: () => Range,
  text: string,
  whole: boolean,
): Promise<'insertText' | 'paste' | null> {
  const before = normalize(host.innerText);
  const wanted = normalize(text);
  // Whole field: it must now equal the new text ("contains" is not enough: a rewrite often
  // contains the original, e.g. one that only adds a full stop). Selection: it must have
  // changed and contain the new text.
  const took = (now: string) => (whole ? now === wanted : now !== before && now.includes(wanted));
  const attempts = [
    ['insertText', () => tryInsertText(text)],
    ['paste', () => tryPaste(host, text)],
  ] as const;
  for (const [method, attempt] of attempts) {
    const focusedBefore = host.ownerDocument.activeElement === host || host.contains(host.ownerDocument.activeElement);
    host.focus({ preventScroll: true });
    await selectAndSync(host, rangeFor());
    debugLog(method, {
      whole,
      focusedBefore,
      selected: host.ownerDocument.getSelection()?.toString(),
      before,
      wanted,
    });
    const ran = attempt();
    const took_ = ran && (await waitUntil(host, () => took(normalize(host.innerText))));
    debugLog(method, { ran, took: took_, now: normalize(host.innerText) });
    if (!ran) continue;
    if (took_) return method;
    // Something changed, but not into the new text: stop rather than stack more edits on top.
    if (normalize(host.innerText) !== before) return null;
  }
  return null;
}

function captureEditable(host: HTMLElement): Target {
  const doc = host.ownerDocument;
  const saved = selectionIn(host);
  const selectedText = saved && !saved.collapsed ? (doc.getSelection()?.toString() ?? '') : '';
  const useSelection = selectedText.trim() !== '';
  const range = useSelection ? saved! : wholeTextRange(host);
  const snapshot = host.innerText;
  debugLog('capture', {
    editor: [...host.attributes].map((a) => `${a.name}=${a.value}`).join(' ').slice(0, 300),
    useSelection,
    selectedText,
    snapshot,
  });

  const restoreSelection = () => {
    host.focus({ preventScroll: true });
    if (saved && saved.startContainer.isConnected && host.contains(saved.commonAncestorContainer)) select(host, saved);
  };

  return {
    field: host,
    text: useSelection ? selectedText : snapshot,
    restoreSelection,
    async replace(text) {
      // Editors re-render often; only replace if the text and the range are still what we sent.
      const intact = range.startContainer.isConnected && host.contains(range.commonAncestorContainer);
      if (!host.isConnected || normalize(host.innerText) !== normalize(snapshot)) return null;
      if (useSelection && !intact) return null;

      const method = await insertThroughEditor(host, () => (useSelection ? range : wholeTextRange(host)), text, !useSelection);
      if (method) {
        const after = host.innerText;
        const canUndo = () => host.isConnected && host.innerText === after;
        return {
          method,
          canUndo,
          async undo() {
            if (!canUndo()) return false;
            if (method === 'insertText') {
              host.focus({ preventScroll: true });
              try {
                // Native undo keeps formatting where the browser's undo stack is intact.
                document.execCommand('undo');
              } catch {
                // Handled by the check below.
              }
              await settle();
            }
            if (normalize(host.innerText) !== normalize(snapshot)) {
              // Editors that re-render their DOM, or that took a paste, keep their own history:
              // put the original wording back through the same input paths (as plain text).
              await insertThroughEditor(host, () => wholeTextRange(host), snapshot, true);
              if (normalize(host.innerText) !== normalize(snapshot)) return false;
            }
            restoreSelection();
            return true;
          },
        };
      }

      // Last resort: edit the DOM directly and tell the page with an input event.
      if (normalize(host.innerText) !== normalize(snapshot)) return null;
      // The whole element here (not the text-to-text range), so block structure comes back intact on undo.
      const target = useSelection ? range : doc.createRange();
      if (!useSelection) target.selectNodeContents(host);
      const removed = target.extractContents();
      const inserted = textFragment(doc, text);
      const nodes = [...inserted.childNodes];
      target.insertNode(inserted);
      if (nodes.length > 0) {
        const caret = doc.createRange();
        caret.setStartAfter(nodes.at(-1)!);
        caret.collapse(true);
        select(host, caret);
      }
      host.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: text }));
      const after = host.innerText;
      const canUndo = () => host.isConnected && host.innerText === after && nodes.every((node) => node.isConnected);
      return {
        method: 'range',
        canUndo,
        async undo() {
          if (!canUndo()) return false;
          const first = nodes[0];
          const restore = doc.createRange();
          if (first) restore.setStartBefore(first);
          else restore.setStart(target.startContainer, target.startOffset);
          nodes.forEach((node) => node.parentNode?.removeChild(node));
          restore.insertNode(removed);
          host.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'historyUndo' }));
          restoreSelection();
          return true;
        },
      };
    },
  };
}
