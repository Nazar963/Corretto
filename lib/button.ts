// In-page button rendered in a closed Shadow DOM (docs/adr/0006-ui-isolation.md),
// anchored to the field's bottom-right corner (docs/adr/0010-button-visibility.md).

export const BUTTON_SIZE = 24;
const GAP = 4;

/** Tag of the host element; also used by tests to find the button. */
export const HOST_TAG = 'corretto-button';

export interface FieldInsets {
  borderRight: number;
  borderBottom: number;
  scrollbarWidth: number;
  scrollbarHeight: number;
}

/**
 * Viewport position of the button for a field.
 * Sits inside the bottom-right corner, clear of borders and scrollbars;
 * fields too short for that (single-line inputs) get it vertically centred.
 */
export function computeButtonPosition(
  rect: Pick<DOMRect, 'top' | 'right' | 'bottom' | 'height'>,
  insets: FieldInsets,
): { left: number; top: number } {
  const left = rect.right - insets.borderRight - insets.scrollbarWidth - BUTTON_SIZE - GAP;
  const tall = rect.height >= BUTTON_SIZE + 2 * GAP + insets.borderBottom + insets.scrollbarHeight;
  const top = tall
    ? rect.bottom - insets.borderBottom - insets.scrollbarHeight - BUTTON_SIZE - GAP
    : rect.top + (rect.height - BUTTON_SIZE) / 2;
  return { left, top };
}

function measureInsets(field: HTMLElement): FieldInsets {
  const style = getComputedStyle(field);
  const borderLeft = parseFloat(style.borderLeftWidth) || 0;
  const borderRight = parseFloat(style.borderRightWidth) || 0;
  const borderTop = parseFloat(style.borderTopWidth) || 0;
  const borderBottom = parseFloat(style.borderBottomWidth) || 0;
  return {
    borderRight,
    borderBottom,
    scrollbarWidth: Math.max(0, field.offsetWidth - field.clientWidth - borderLeft - borderRight),
    scrollbarHeight: Math.max(0, field.offsetHeight - field.clientHeight - borderTop - borderBottom),
  };
}

const STYLE = `
  :host { all: initial; }
  button {
    all: unset;
    box-sizing: border-box;
    width: ${BUTTON_SIZE}px;
    height: ${BUTTON_SIZE}px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    cursor: pointer;
    background: #2563eb;
    color: #fff;
    box-shadow: 0 1px 3px rgb(0 0 0 / 0.3);
    opacity: 0.85;
    transition: opacity 120ms;
  }
  button:hover { opacity: 1; }
  svg { width: 14px; height: 14px; }
  @media (prefers-color-scheme: dark) {
    button { background: #60a5fa; color: #0b1220; }
  }
`;

const SVG_NS = 'http://www.w3.org/2000/svg';

// Simple pen glyph; placeholder until branding exists. Built with DOM APIs, not innerHTML,
// so store linters (web-ext UNSAFE_VAR_ASSIGNMENT) stay clean.
function createIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  const attrs = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    'stroke-width': '2.2',
    'stroke-linecap': 'round',
    'stroke-linejoin': 'round',
    'aria-hidden': 'true',
  };
  for (const [name, value] of Object.entries(attrs)) svg.setAttribute(name, value);
  for (const d of ['M12 20h9', 'M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z']) {
    const path = document.createElementNS(SVG_NS, 'path');
    path.setAttribute('d', d);
    svg.append(path);
  }
  return svg;
}

export class FieldButton {
  readonly host: HTMLElement;
  private field: HTMLElement | null = null;
  private frame = 0;
  private readonly resizeObserver = new ResizeObserver(() => this.schedulePosition());

  constructor(label: string, onActivate: (field: HTMLElement) => void) {
    this.host = document.createElement(HOST_TAG);
    Object.assign(this.host.style, {
      position: 'fixed',
      zIndex: '2147483647',
      width: `${BUTTON_SIZE}px`,
      height: `${BUTTON_SIZE}px`,
      display: 'none',
    });
    const root = this.host.attachShadow({ mode: 'closed' });
    const style = document.createElement('style');
    style.textContent = STYLE;
    root.append(style);
    const button = document.createElement('button');
    button.type = 'button';
    button.tabIndex = -1; // Stay out of the page's Tab order (FR-002 AC-003).
    button.setAttribute('aria-label', label);
    button.title = label;
    button.append(createIcon());
    // Keep focus and selection in the field (FR-002 AC-002).
    button.addEventListener('mousedown', (event) => event.preventDefault());
    button.addEventListener('click', () => {
      if (this.field) onActivate(this.field);
    });
    root.append(button);
  }

  get attachedField(): HTMLElement | null {
    return this.field;
  }

  show(field: HTMLElement): void {
    if (this.field !== field) {
      if (this.field) this.resizeObserver.unobserve(this.field);
      this.field = field;
      this.resizeObserver.observe(field);
    }
    if (!this.host.isConnected) document.documentElement.append(this.host);
    this.position();
  }

  hide(): void {
    if (this.field) this.resizeObserver.unobserve(this.field);
    this.field = null;
    this.host.style.display = 'none';
  }

  schedulePosition(): void {
    if (this.frame || !this.field) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      this.position();
    });
  }

  destroy(): void {
    this.hide();
    cancelAnimationFrame(this.frame);
    this.resizeObserver.disconnect();
    this.host.remove();
  }

  private position(): void {
    const field = this.field;
    if (!field) return;
    const rect = field.getBoundingClientRect();
    const offscreen =
      !field.isConnected ||
      rect.width === 0 ||
      rect.bottom < 0 ||
      rect.top > window.innerHeight ||
      rect.right < 0 ||
      rect.left > window.innerWidth;
    if (offscreen) {
      this.host.style.display = 'none';
      return;
    }
    const { left, top } = computeButtonPosition(rect, measureInsets(field));
    this.host.style.left = `${left}px`;
    this.host.style.top = `${top}px`;
    this.host.style.display = 'block';
  }
}
