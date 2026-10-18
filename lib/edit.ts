// Capture, replacement and undo for <textarea>/<input> (FR-004, FR-007, FR-008).
// Strategy and fallback order: docs/adr/0005-text-replacement.md.

import type { TextField } from './fields';

export interface Target {
  field: TextField;
  /** Range that will be replaced: the selection, or the whole value. */
  start: number;
  end: number;
  text: string;
  /** Selection at capture time, restored on cancel and undo. */
  selectionStart: number;
  selectionEnd: number;
}

export interface Replacement {
  field: TextField;
  start: number;
  /** Text that was replaced, and the text that replaced it. */
  original: string;
  inserted: string;
  /** Whole value right after replacement; undo is only safe while it is unchanged. */
  after: string;
  selectionStart: number;
  selectionEnd: number;
  method: 'insertText' | 'setRangeText';
}

/** Selection inside the field if it has non-blank text, otherwise the whole value (FR-004). */
export function captureTarget(field: TextField): Target {
  const value = field.value;
  const selectionStart = field.selectionStart ?? 0;
  const selectionEnd = field.selectionEnd ?? selectionStart;
  const selected = value.slice(selectionStart, selectionEnd);
  if (selected.trim() !== '') {
    return { field, start: selectionStart, end: selectionEnd, text: selected, selectionStart, selectionEnd };
  }
  return { field, start: 0, end: value.length, text: value, selectionStart, selectionEnd };
}

/**
 * Replace `[start, end)` with `text`. Tries `insertText` first so the native undo stack
 * and rich-editor bookkeeping keep working; falls back to `setRangeText` + `input` event.
 */
export function replaceRange(field: TextField, start: number, end: number, text: string): Replacement['method'] {
  const before = field.value;
  const expected = before.slice(0, start) + text + before.slice(end);
  field.focus();
  field.setSelectionRange(start, end);
  try {
    // Deprecated but supported in every target browser (ADR-0005).
    if (document.execCommand('insertText', false, text) && field.value === expected) return 'insertText';
  } catch {
    // Fall through to the fallback.
  }
  field.value = before;
  field.setRangeText(text, start, end, 'end');
  const caret = start + text.length;
  field.setSelectionRange(caret, caret);
  field.dispatchEvent(new InputEvent('input', { bubbles: true, inputType: 'insertReplacementText', data: text }));
  return 'setRangeText';
}

export function applyRewrite(target: Target, text: string): Replacement {
  const { field, start, end } = target;
  const original = field.value.slice(start, end);
  const method = replaceRange(field, start, end, text);
  return {
    field,
    start,
    original,
    inserted: text,
    after: field.value,
    selectionStart: target.selectionStart,
    selectionEnd: target.selectionEnd,
    method,
  };
}

/** Whether `undoReplacement` can still restore the original text. */
export function canUndo(replacement: Replacement): boolean {
  return replacement.field.isConnected && replacement.field.value === replacement.after;
}

/** Restore the original text and selection. Returns false if the field was edited since. */
export function undoReplacement(replacement: Replacement): boolean {
  if (!canUndo(replacement)) return false;
  const { field, start, inserted, original } = replacement;
  replaceRange(field, start, start + inserted.length, original);
  field.setSelectionRange(replacement.selectionStart, replacement.selectionEnd);
  return true;
}
