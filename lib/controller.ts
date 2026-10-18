// Decides when the button is shown (docs/adr/0010-button-visibility.md).
// Listens at document level, so fields added after load need no extra observer (FR-001 AC-002).

import { FieldButton } from './button';
import { DEFAULT_MINIMUM, fieldText, isEligibleField, meetsMinimumLength, type Field } from './fields';

/** How long the button stays after the field loses focus. */
export const HIDE_DELAY_MS = 2000;

export interface ControllerOptions {
  label: string;
  onActivate: (field: HTMLElement) => void;
  signal: AbortSignal;
}

function eventTarget(event: Event): Element | null {
  // composedPath()[0] reaches fields inside open shadow roots of the page.
  const target = event.composedPath()[0];
  return target instanceof Element ? target : null;
}

export function startController({ label, onActivate, signal }: ControllerOptions): FieldButton {
  const button = new FieldButton(label, onActivate);
  let current: Field | null = null;
  let hideTimer: ReturnType<typeof setTimeout> | undefined;

  const cancelHide = () => clearTimeout(hideTimer);

  const evaluate = () => {
    if (current && current.isConnected && meetsMinimumLength(fieldText(current), DEFAULT_MINIMUM)) {
      button.show(current);
    } else {
      button.hide();
    }
  };

  const listen = <K extends keyof DocumentEventMap>(type: K, handler: (event: DocumentEventMap[K]) => void) =>
    document.addEventListener(type, handler, { capture: true, passive: true, signal });

  listen('focusin', (event) => {
    const target = eventTarget(event);
    // Focus moving to a non-field (another control, our own UI) must not cancel a pending hide.
    if (!isEligibleField(target)) return;
    cancelHide();
    current = target;
    evaluate();
  });

  listen('focusout', (event) => {
    if (eventTarget(event) !== current) return;
    cancelHide();
    hideTimer = setTimeout(() => {
      current = null;
      button.hide();
    }, HIDE_DELAY_MS);
  });

  listen('input', (event) => {
    if (eventTarget(event) === current) evaluate();
  });

  const reposition = () => button.schedulePosition();
  window.addEventListener('scroll', reposition, { capture: true, passive: true, signal });
  window.addEventListener('resize', reposition, { passive: true, signal });

  signal.addEventListener('abort', () => {
    cancelHide();
    button.destroy();
  });
  return button;
}
