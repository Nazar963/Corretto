// Popup with loading / results / error states, and the "Replaced · Undo" toast (FR-006, FR-008, FR-009).
// Rendered in a shadow root like the button (docs/adr/0006-ui-isolation.md); text is set via
// textContent only, never innerHTML, because it comes from the model (docs/requirements NFR security).

import { TONES, type Rewrites, type Tone } from './messages';
import { SHADOW_MODE } from './shadow';
import type { Strings } from './strings';

export const PANEL_TAG = 'corretto-panel';
export const TOAST_MS = 10_000;
const MARGIN = 8;
const OFFSET = 6;

export type DismissReason = 'escape' | 'outside';

type Rect = Pick<DOMRect, 'top' | 'right' | 'bottom' | 'left'>;

/** Below the anchor, right-aligned with it; flipped above when it does not fit; kept in the viewport. */
export function computePanelPosition(
  anchor: Rect,
  size: { width: number; height: number },
  viewport: { width: number; height: number },
): { left: number; top: number } {
  const maxLeft = Math.max(MARGIN, viewport.width - size.width - MARGIN);
  const left = Math.min(Math.max(anchor.right - size.width, MARGIN), maxLeft);
  const below = anchor.bottom + OFFSET;
  const above = anchor.top - OFFSET - size.height;
  let top: number;
  if (below + size.height <= viewport.height - MARGIN) top = below;
  else if (above >= MARGIN) top = above;
  else top = Math.max(MARGIN, viewport.height - size.height - MARGIN);
  return { left, top };
}

const STYLE = `
  :host { all: initial; }
  .panel {
    box-sizing: border-box;
    width: min(360px, calc(100vw - ${2 * MARGIN}px));
    font: 14px/1.4 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
    color: #111827;
    background: #fff;
    border: 1px solid #d1d5db;
    border-radius: 10px;
    box-shadow: 0 8px 24px rgb(0 0 0 / 0.18);
    padding: 6px;
    overflow-y: auto;
  }
  .row { display: flex; align-items: center; gap: 8px; padding: 8px; }
  .grow { flex: 1; }
  .option {
    all: unset;
    box-sizing: border-box;
    display: block;
    width: 100%;
    padding: 8px;
    border-radius: 6px;
    cursor: pointer;
  }
  .option:hover, .option:focus-visible, .option.active { background: #eff6ff; outline: 2px solid #2563eb; outline-offset: -2px; }
  .label { display: block; font-size: 11px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; color: #4b5563; }
  .detail { display: block; margin-top: 2px; font-size: 12px; color: #4b5563; overflow-wrap: anywhere; }
  .text { display: block; white-space: pre-wrap; overflow-wrap: anywhere; max-height: 8.4em; overflow: auto; }
  .action {
    all: unset;
    cursor: pointer;
    padding: 4px 10px;
    border-radius: 6px;
    font-weight: 600;
    color: #1d4ed8;
  }
  .action:hover, .action:focus-visible { background: #eff6ff; outline: 2px solid #2563eb; outline-offset: -2px; }
  .spinner {
    width: 16px; height: 16px; border-radius: 50%;
    border: 2px solid #bfdbfe; border-top-color: #2563eb;
    animation: spin 0.8s linear infinite;
  }
  @keyframes spin { to { transform: rotate(360deg); } }
  @media (prefers-reduced-motion: reduce) { .spinner { animation-duration: 2.4s; } }
  @media (prefers-color-scheme: dark) {
    .panel { color: #f3f4f6; background: #1f2937; border-color: #374151; }
    .label, .detail { color: #9ca3af; }
    .option:hover, .option:focus-visible, .option.active, .action:hover, .action:focus-visible { background: #1e3a8a; outline-color: #60a5fa; }
    .action { color: #93c5fd; }
    .spinner { border-color: #1e3a8a; border-top-color: #60a5fa; }
  }
`;

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: { className?: string; text?: string } = {},
  children: Node[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.className) node.className = props.className;
  if (props.text !== undefined) node.textContent = props.text;
  node.append(...children);
  return node;
}

function actionButton(text: string, onClick: () => void): HTMLButtonElement {
  const button = el('button', { className: 'action', text });
  button.type = 'button';
  button.addEventListener('click', onClick);
  return button;
}

type State = 'closed' | 'popup' | 'toast';

export class Panel {
  readonly host: HTMLElement;
  private readonly root: ShadowRoot;
  private readonly content: HTMLDivElement;
  private state: State = 'closed';
  private anchor: HTMLElement | null = null;
  private onDismiss: ((reason: DismissReason) => void) | null = null;
  private onToastClose: (() => void) | null = null;
  private toastTimer: ReturnType<typeof setTimeout> | undefined;
  private listeners: AbortController | null = null;
  /** Highlighted option for keyboard choice; focus itself stays in the field. */
  private active = 0;

  constructor(private readonly strings: Strings) {
    this.host = document.createElement(PANEL_TAG);
    Object.assign(this.host.style, { position: 'fixed', zIndex: '2147483647', display: 'none' });
    const root = (this.root = this.host.attachShadow({ mode: SHADOW_MODE }));
    const style = el('style', { text: STYLE });
    this.content = el('div', { className: 'panel' });
    this.content.setAttribute('role', 'dialog');
    this.content.setAttribute('aria-label', strings.panelLabel);
    root.append(style, this.content);
    // Never take focus from the page's field: editors such as WhatsApp's restore their own
    // cursor when they regain focus, which would undo the selection Corretto replaces.
    root.addEventListener('mousedown', (event) => event.preventDefault());
  }

  get isOpen(): boolean {
    return this.state !== 'closed';
  }

  showLoading(anchor: HTMLElement, handlers: { onCancel: () => void; onDismiss: (reason: DismissReason) => void }) {
    const row = el('div', { className: 'row' }, [
      el('div', { className: 'spinner' }),
      el('span', { className: 'grow', text: this.strings.loading }),
      actionButton(this.strings.cancel, handlers.onCancel),
    ]);
    row.setAttribute('role', 'status');
    this.open('popup', anchor, [row], handlers.onDismiss);
  }

  showResults(
    anchor: HTMLElement,
    rewrites: Rewrites,
    handlers: { onPick: (tone: Tone) => void; onDismiss: (reason: DismissReason) => void },
  ) {
    const labels: Record<Tone, string> = {
      minimal: this.strings.toneMinimal,
      fluent: this.strings.toneFluent,
      formal: this.strings.toneFormal,
    };
    const options = TONES.map((tone) => {
      const option = el('button', { className: 'option' }, [
        el('span', { className: 'label', text: labels[tone] }),
        el('span', { className: 'text', text: rewrites[tone] }),
      ]);
      option.type = 'button';
      option.dataset.tone = tone;
      option.addEventListener('click', () => handlers.onPick(tone));
      return option;
    });
    this.open('popup', anchor, options, handlers.onDismiss);
    this.highlight(0);
  }

  showError(
    anchor: HTMLElement,
    message: string,
    handlers: {
      /** The provider's own explanation, shown under the message (plain text). */
      detail?: string;
      action: { label: string; run: () => void } | null;
      onDismiss: (reason: DismissReason) => void;
    },
  ) {
    const text = el('span', { className: 'grow', text: message });
    if (handlers.detail) text.append(el('span', { className: 'detail', text: handlers.detail }));
    const row = el('div', { className: 'row' }, [text]);
    if (handlers.action) row.append(actionButton(handlers.action.label, handlers.action.run));
    row.setAttribute('role', 'alert');
    this.open('popup', anchor, [row], handlers.onDismiss);
  }

  /** Non-modal: does not take focus and ignores outside clicks; closes itself after TOAST_MS. */
  showToast(anchor: HTMLElement, handlers: { onUndo: () => void; onClose: () => void }) {
    const row = el('div', { className: 'row' }, [
      el('span', { className: 'grow', text: this.strings.replaced }),
      actionButton(this.strings.undo, handlers.onUndo),
    ]);
    row.setAttribute('role', 'status');
    this.open('toast', anchor, [row], null);
    this.onToastClose = handlers.onClose;
    this.toastTimer = setTimeout(() => this.close(), TOAST_MS);
  }

  close(): void {
    if (this.state === 'closed') return;
    const onToastClose = this.onToastClose;
    this.state = 'closed';
    this.anchor = null;
    this.onDismiss = null;
    this.onToastClose = null;
    clearTimeout(this.toastTimer);
    this.listeners?.abort();
    this.listeners = null;
    this.host.style.display = 'none';
    this.content.replaceChildren();
    onToastClose?.();
  }

  destroy(): void {
    this.close();
    this.host.remove();
  }

  private open(state: State, anchor: HTMLElement, children: Node[], onDismiss: ((r: DismissReason) => void) | null) {
    this.close();
    this.state = state;
    this.anchor = anchor;
    this.onDismiss = onDismiss;
    this.content.replaceChildren(...children);
    if (!this.host.isConnected) document.documentElement.append(this.host);
    this.host.style.display = 'block';
    this.position();

    this.listeners = new AbortController();
    const { signal } = this.listeners;
    const reposition = () => this.position();
    window.addEventListener('scroll', reposition, { capture: true, passive: true, signal });
    window.addEventListener('resize', reposition, { passive: true, signal });
    if (state === 'popup') {
      document.addEventListener(
        'pointerdown',
        (event) => {
          if (!event.composedPath().includes(this.host)) this.dismiss('outside');
        },
        { capture: true, signal },
      );
      // Keys arrive at the field, which keeps focus. Handle them first (window, capture) and
      // stop them, so the page does not also act on them (Enter would send a WhatsApp message).
      window.addEventListener('keydown', (event) => this.onKeydown(event), { capture: true, signal });
    }
  }

  private dismiss(reason: DismissReason) {
    const onDismiss = this.onDismiss;
    this.close();
    onDismiss?.(reason);
  }

  private onKeydown(event: KeyboardEvent) {
    if (this.state !== 'popup') return;
    const options = [...this.content.querySelectorAll<HTMLButtonElement>('.option')];
    const consume = () => {
      event.preventDefault();
      event.stopImmediatePropagation();
    };
    if (event.key === 'Escape') {
      consume();
      this.dismiss('escape');
    } else if (options.length > 0 && (event.key === 'ArrowDown' || event.key === 'ArrowUp')) {
      consume();
      const step = event.key === 'ArrowDown' ? 1 : -1;
      this.highlight((this.active + step + options.length) % options.length);
    } else if (options.length > 0 && event.key === 'Enter' && !event.isComposing) {
      consume();
      options[this.active]?.click();
    }
  }

  private highlight(index: number) {
    const options = [...this.content.querySelectorAll<HTMLButtonElement>('.option')];
    this.active = index;
    options.forEach((option, i) => {
      option.classList.toggle('active', i === index);
      option.setAttribute('aria-current', String(i === index));
    });
    options[index]?.scrollIntoView({ block: 'nearest' });
  }

  private position() {
    if (!this.anchor) return;
    // Never taller than the frame (small iframes, chat widgets): scroll inside instead.
    this.content.style.maxHeight = `${Math.max(80, window.innerHeight - 2 * MARGIN)}px`;
    const size = this.content.getBoundingClientRect();
    const { left, top } = computePanelPosition(this.anchor.getBoundingClientRect(), size, {
      width: window.innerWidth,
      height: window.innerHeight,
    });
    this.host.style.left = `${left}px`;
    this.host.style.top = `${top}px`;
  }
}
