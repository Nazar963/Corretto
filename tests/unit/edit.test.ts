import { beforeEach, describe, expect, it } from 'vitest';
import { captureTarget, replaceRange } from '@/lib/edit';

describe('textarea', () => {
  let field: HTMLTextAreaElement;

  beforeEach(() => {
    document.body.innerHTML = '<textarea></textarea>';
    field = document.querySelector('textarea')!;
    field.value = 'hello wrld, how are you';
  });

  describe('captureTarget (FR-004)', () => {
    it('uses the whole value when nothing is selected', () => {
      field.setSelectionRange(3, 3);
      expect(captureTarget(field).text).toBe('hello wrld, how are you');
    });

    it('uses the selection when there is one', () => {
      field.setSelectionRange(6, 10);
      expect(captureTarget(field).text).toBe('wrld');
    });

    it('ignores a whitespace-only selection', () => {
      field.setSelectionRange(5, 6);
      expect(captureTarget(field).text).toBe('hello wrld, how are you');
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

  it('replaces only the captured selection', () => {
    field.setSelectionRange(6, 10);
    captureTarget(field).replace('world');
    expect(field.value).toBe('hello world, how are you');
  });

  it('refuses to replace if the user typed while waiting', () => {
    const target = captureTarget(field);
    field.value += '!';
    expect(target.replace('Hello world.')).toBeNull();
    expect(field.value).toBe('hello wrld, how are you!');
  });

  describe('undo (FR-008)', () => {
    it('restores the original text and selection', () => {
      field.setSelectionRange(6, 10);
      const replacement = captureTarget(field).replace('world')!;
      expect(field.value).toBe('hello world, how are you');
      expect(replacement.undo()).toBe(true);
      expect(field.value).toBe('hello wrld, how are you');
      expect([field.selectionStart, field.selectionEnd]).toEqual([6, 10]);
    });

    it('refuses to undo after the user edited the field', () => {
      const replacement = captureTarget(field).replace('Hello world, how are you?')!;
      field.value += '!';
      expect(replacement.canUndo()).toBe(false);
      expect(replacement.undo()).toBe(false);
      expect(field.value).toBe('Hello world, how are you?!');
    });
  });
});

// happy-dom has no execCommand, so these exercise the Range fallback path (ADR-0005).
describe('contenteditable (fallback path)', () => {
  let host: HTMLElement;

  beforeEach(() => {
    document.body.innerHTML = '<div contenteditable="true"><p>Hello <b>wrld</b>, how</p><p>are you</p></div>';
    host = document.querySelector('[contenteditable]')!;
  });

  function selectText(node: Node, start: number, end: number) {
    const range = document.createRange();
    range.setStart(node, start);
    range.setEnd(node, end);
    const selection = document.getSelection()!;
    selection.removeAllRanges();
    selection.addRange(range);
  }

  it('captures the whole text with block breaks', () => {
    expect(captureTarget(host).text).toBe('Hello wrld, how\nare you');
  });

  it('captures and replaces only the selection', () => {
    selectText(host.querySelector('b')!.firstChild!, 0, 4);
    const target = captureTarget(host);
    expect(target.text).toBe('wrld');
    const replacement = target.replace('world')!;
    expect(replacement.method).toBe('range');
    expect(host.innerText).toBe('Hello world, how\nare you');
  });

  it('replaces the whole content as plain text with line breaks and fires input', () => {
    let inputs = 0;
    host.addEventListener('input', () => inputs++);
    captureTarget(host).replace('Hello world,\nhow are you?');
    expect(host.innerHTML).toBe('Hello world,<br>how are you?');
    expect(inputs).toBe(1);
  });

  it('undo puts the original nodes back, formatting included', () => {
    const original = host.innerHTML;
    const replacement = captureTarget(host).replace('Hello world, how are you?')!;
    expect(replacement.undo()).toBe(true);
    expect(host.innerHTML).toBe(original);
  });

  it('refuses to undo after an edit', () => {
    const replacement = captureTarget(host).replace('Hello world.')!;
    host.append('!');
    expect(replacement.canUndo()).toBe(false);
    expect(replacement.undo()).toBe(false);
  });

  it('refuses to replace if the text changed while waiting', () => {
    const target = captureTarget(host);
    host.querySelector('p')!.append(' extra');
    expect(target.replace('Hello world.')).toBeNull();
  });

  it('refuses to replace if the editor re-rendered the selected nodes', () => {
    selectText(host.querySelector('b')!.firstChild!, 0, 4);
    const target = captureTarget(host);
    host.innerHTML = '<p>Hello <b>wrld</b>, how</p><p>are you</p>'; // same text, new nodes
    expect(target.replace('world')).toBeNull();
  });
});
