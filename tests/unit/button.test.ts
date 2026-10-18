import { describe, expect, it } from 'vitest';
import { BUTTON_SIZE, computeButtonPosition } from '@/lib/button';

const noInsets = { borderRight: 0, borderBottom: 0, scrollbarWidth: 0, scrollbarHeight: 0 };

describe('computeButtonPosition', () => {
  it('anchors to the bottom-right corner of a tall field', () => {
    const pos = computeButtonPosition({ top: 100, right: 500, bottom: 300, height: 200 }, noInsets);
    expect(pos).toEqual({ left: 500 - BUTTON_SIZE - 4, top: 300 - BUTTON_SIZE - 4 });
  });

  it('stays clear of borders and scrollbars', () => {
    const pos = computeButtonPosition(
      { top: 100, right: 500, bottom: 300, height: 200 },
      { borderRight: 2, borderBottom: 2, scrollbarWidth: 15, scrollbarHeight: 0 },
    );
    expect(pos.left).toBe(500 - 2 - 15 - BUTTON_SIZE - 4);
    expect(pos.top).toBe(300 - 2 - BUTTON_SIZE - 4);
  });

  it('centres vertically in a single-line input', () => {
    const pos = computeButtonPosition({ top: 100, right: 500, bottom: 130, height: 30 }, noInsets);
    expect(pos.top).toBe(100 + (30 - BUTTON_SIZE) / 2);
  });
});
