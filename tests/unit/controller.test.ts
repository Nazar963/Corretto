import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { HOST_TAG } from '@/lib/button';
import { HIDE_DELAY_MS, startController } from '@/lib/controller';

function host(): HTMLElement | null {
  return document.querySelector(HOST_TAG);
}

function visible(): boolean {
  const el = host();
  return !!el && el.style.display !== 'none';
}

function type(field: HTMLTextAreaElement | HTMLInputElement, value: string) {
  field.value = value;
  field.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
}

describe('controller', () => {
  let abort: AbortController;

  beforeEach(() => {
    vi.useFakeTimers();
    document.body.innerHTML = '<textarea id="t"></textarea><input id="p" type="password"><input id="other">';
    for (const el of document.querySelectorAll<HTMLElement>('textarea, input')) {
      // happy-dom has no layout; give fields a size so the button is not treated as off-screen.
      el.getBoundingClientRect = () => DOMRect.fromRect({ x: 10, y: 10, width: 300, height: 100 });
    }
    abort = new AbortController();
    startController({ label: 'Rewrite', onActivate: () => {}, signal: abort.signal });
  });

  afterEach(() => {
    abort.abort();
    vi.useRealTimers();
  });

  it('shows the button once the focused field reaches the minimum length', () => {
    const field = document.querySelector<HTMLTextAreaElement>('#t')!;
    field.focus();
    type(field, 'too short');
    expect(visible()).toBe(false);
    type(field, 'now this is long enough');
    expect(visible()).toBe(true);
  });

  it('never shows on an excluded field', () => {
    const field = document.querySelector<HTMLInputElement>('#p')!;
    field.focus();
    type(field, 'a long enough password value');
    expect(visible()).toBe(false);
  });

  it('keeps the button for the hide delay after blur, then hides it', () => {
    const field = document.querySelector<HTMLTextAreaElement>('#t')!;
    field.value = 'this text is long enough';
    field.focus();
    expect(visible()).toBe(true);
    field.blur();
    vi.advanceTimersByTime(HIDE_DELAY_MS - 100);
    expect(visible()).toBe(true);
    vi.advanceTimersByTime(200);
    expect(visible()).toBe(false);
  });

  it('still hides when focus moves to a non-field element', () => {
    const field = document.querySelector<HTMLTextAreaElement>('#t')!;
    field.value = 'this text is long enough';
    document.body.insertAdjacentHTML('beforeend', '<button id="b">x</button>');
    field.focus();
    document.querySelector<HTMLButtonElement>('#b')!.focus();
    vi.advanceTimersByTime(HIDE_DELAY_MS + 100);
    expect(visible()).toBe(false);
  });

  it('cancels the pending hide when the field is refocused', () => {
    const field = document.querySelector<HTMLTextAreaElement>('#t')!;
    field.value = 'this text is long enough';
    field.focus();
    field.blur();
    field.focus();
    vi.advanceTimersByTime(HIDE_DELAY_MS * 2);
    expect(visible()).toBe(true);
  });

  it('removes the button when the controller is stopped', () => {
    const field = document.querySelector<HTMLTextAreaElement>('#t')!;
    field.value = 'this text is long enough';
    field.focus();
    abort.abort();
    expect(host()).toBeNull();
  });
});
