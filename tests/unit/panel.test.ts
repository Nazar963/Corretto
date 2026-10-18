import { afterEach, describe, expect, it, vi } from 'vitest';
import { computePanelPosition, Panel, TOAST_MS } from '@/lib/panel';
import type { Strings } from '@/lib/strings';

const viewport = { width: 1000, height: 800 };
const size = { width: 360, height: 200 };

describe('computePanelPosition', () => {
  it('places the panel below the anchor, right-aligned', () => {
    expect(computePanelPosition({ top: 100, right: 600, bottom: 200, left: 100 }, size, viewport)).toEqual({
      left: 240,
      top: 206,
    });
  });

  it('flips above when there is no room below', () => {
    const pos = computePanelPosition({ top: 500, right: 600, bottom: 700, left: 100 }, size, viewport);
    expect(pos.top).toBe(500 - 6 - 200);
  });

  it('stays inside the viewport horizontally', () => {
    expect(computePanelPosition({ top: 0, right: 100, bottom: 50, left: 0 }, size, viewport).left).toBe(8);
    expect(computePanelPosition({ top: 0, right: 1200, bottom: 50, left: 900 }, size, viewport).left).toBe(632);
  });

  it('pins to the bottom edge when it fits neither below nor above', () => {
    const pos = computePanelPosition({ top: 100, right: 600, bottom: 700, left: 100 }, size, viewport);
    expect(pos.top).toBe(800 - 200 - 8);
  });
});

describe('Panel toast', () => {
  afterEach(() => vi.useRealTimers());

  it('closes itself after TOAST_MS and reports it', () => {
    vi.useFakeTimers();
    const strings = new Proxy({}, { get: (_t, key) => String(key) }) as Strings;
    const panel = new Panel(strings);
    const anchor = document.createElement('textarea');
    document.body.append(anchor);
    const onClose = vi.fn();
    panel.showToast(anchor, { onUndo: () => {}, onClose });
    expect(panel.isOpen).toBe(true);
    vi.advanceTimersByTime(TOAST_MS);
    expect(panel.isOpen).toBe(false);
    expect(panel.host.style.display).toBe('none');
    expect(onClose).toHaveBeenCalledOnce();
    panel.destroy();
  });
});
