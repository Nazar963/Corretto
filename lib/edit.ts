// Capture, replacement and undo (FR-004, FR-007, FR-008).
// Strategy and fallback order: docs/adr/0005-text-replacement.md.
// Replacements are plain text; rich formatting in the replaced range is not kept (out of scope).

import { isTextField, type Field, type TextField } from './fields';

export type ReplaceMethod = 'insertText' | 'setRangeText' | 'range';

export interface Replacement {
  method: ReplaceMethod;
  /** Whether `undo` can still restore the original text (the field is unchanged since). */
  canUndo(): boolean;
  /** Restore the original text and selection. Returns false if the field was edited since. */
  undo(): boolean;
}

export interface Target {
  field: Field;
  /** Text sent to the provider: the selection, or the whole field (FR-004). */
  text: string;
  /** Put focus and the original selection back (Esc, Cancel). */
  restoreSelection(): void;
  /** Replace the captured range, or return null if the field changed since capture. */
  replace(text: string): Replacement | null;
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
    replace(text) {
      // The user typed while the provider was working: offsets no longer match.
      if (!field.isConnected || field.value !== value) return null;
      const original = value.slice(start, end);
      const method = replaceRange(field, start, end, text);
      const after = field.value;
      const canUndo = () => field.isConnected && field.value === after;
      return {
        method,
        canUndo,
        undo() {
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

/** Plain text as nodes, with <br> for line breaks. */
function textFragment(doc: Document, text: string): DocumentFragment {
  const fragment = doc.createDocumentFragment();
  text.split('\n').forEach((line, index) => {
    if (index > 0) fragment.append(doc.createElement('br'));
    if (line) fragment.append(doc.createTextNode(line));
  });
  return fragment;
}

function captureEditable(host: HTMLElement): Target {
  const doc = host.ownerDocument;
  const saved = selectionIn(host);
  const selectedText = saved && !saved.collapsed ? (doc.getSelection()?.toString() ?? '') : '';
  const useSelection = selectedText.trim() !== '';
  const whole = (): Range => {
    const range = doc.createRange();
    range.selectNodeContents(host);
    return range;
  };
  const range = useSelection ? saved! : whole();
  const snapshot = host.innerText;

  const restoreSelection = () => {
    host.focus({ preventScroll: true });
    if (saved && saved.startContainer.isConnected && host.contains(saved.commonAncestorContainer)) select(host, saved);
  };

  return {
    field: host,
    text: useSelection ? selectedText : snapshot,
    restoreSelection,
    replace(text) {
      // Editors re-render often; only replace if the text and the range are still what we sent.
      const intact = range.startContainer.isConnected && host.contains(range.commonAncestorContainer);
      if (!host.isConnected || !intact || normalize(host.innerText) !== normalize(snapshot)) return null;

      host.focus({ preventScroll: true });
      select(host, useSelection ? range : whole());
      if (tryInsertText(text) && normalize(host.innerText).includes(normalize(text))) {
        const after = host.innerText;
        const canUndo = () => host.isConnected && host.innerText === after;
        return {
          method: 'insertText',
          canUndo,
          undo() {
            if (!canUndo()) return false;
            host.focus({ preventScroll: true });
            // Native undo also reaches editors with their own history (beforeinput historyUndo).
            try {
              document.execCommand('undo');
            } catch {
              // Handled by the check below.
            }
            if (normalize(host.innerText) !== normalize(snapshot)) {
              // Editors that re-render their DOM can break the native undo stack.
              // Fall back to the original wording as plain text; formatting may be lost.
              select(host, whole());
              tryInsertText(snapshot);
              if (normalize(host.innerText) !== normalize(snapshot)) return false;
            }
            restoreSelection();
            return true;
          },
        };
      }

      // Fallback: edit the DOM directly and tell the page with an input event.
      const target = useSelection ? range : whole();
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
        undo() {
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

