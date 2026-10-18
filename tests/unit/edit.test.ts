import { beforeEach, describe, expect, it } from 'vitest';
import { applyRewrite, canUndo, captureTarget, replaceRange, undoReplacement } from '@/lib/edit';

let field: HTMLTextAreaElement;

beforeEach(() => {
  document.body.innerHTML = '<textarea></textarea>';
  field = document.querySelector('textarea')!;
  field.value = 'hello wrld, how are you';
});

describe('captureTarget (FR-004)', () => {
  it('uses the whole value when nothing is selected', () => {
    field.setSelectionRange(3, 3);
    expect(captureTarget(field)).toMatchObject({ start: 0, end: 23, text: 'hello wrld, how are you' });
  });

  it('uses the selection when there is one', () => {
    field.setSelectionRange(6, 10);
    expect(captureTarget(field)).toMatchObject({ start: 6, end: 10, text: 'wrld' });
  });

  it('ignores a whitespace-only selection', () => {
    field.setSelectionRange(5, 6);
    expect(captureTarget(field)).toMatchObject({ start: 0, end: 23 });
  });
});

describe('replaceRange (FR-007)', () => {
  it('replaces the range and fires an input event', () => {
    let inputs = 0;
    field.addEventListener('input', () => inputs++);
    replaceRange(field, 6, 10, 'world');
    expect(field.value).toBe('hello world, how are you');
    expect(inputs).toBe(1);
    expect(field.selectionStart).toBe(11);
  });
});

describe('undo (FR-008)', () => {
  it('restores the original text and selection', () => {
    field.setSelectionRange(6, 10);
    const replacement = applyRewrite(captureTarget(field), 'world');
    expect(field.value).toBe('hello world, how are you');
    expect(undoReplacement(replacement)).toBe(true);
    expect(field.value).toBe('hello wrld, how are you');
    expect([field.selectionStart, field.selectionEnd]).toEqual([6, 10]);
  });

  it('refuses to undo after the user edited the field', () => {
    const replacement = applyRewrite(captureTarget(field), 'Hello world, how are you?');
    field.value += '!';
    expect(canUndo(replacement)).toBe(false);
    expect(undoReplacement(replacement)).toBe(false);
    expect(field.value).toBe('Hello world, how are you?!');
  });
});
