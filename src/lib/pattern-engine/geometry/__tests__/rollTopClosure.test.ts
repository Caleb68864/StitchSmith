import { describe, it, expect } from 'vitest';
import { rollTopClosure } from '../rollTopClosure.js';

describe('rollTopClosure', () => {
  it('returns at least 2 fold lines', () => {
    const result = rollTopClosure({ openingWidth: 200, collarHeight: 120, webbingWidthMm: 19 });
    expect(result.foldLines.length).toBeGreaterThanOrEqual(2);
  });

  it('fold lines have distinct y values', () => {
    const result = rollTopClosure({ openingWidth: 200, collarHeight: 120, webbingWidthMm: 19 });
    const ys = result.foldLines.map((f) => f.y);
    const unique = new Set(ys);
    expect(unique.size).toBe(ys.length);
  });

  it('webbingAttachment.x is near center (openingWidth / 2 - webbingWidth / 2)', () => {
    const result = rollTopClosure({ openingWidth: 200, collarHeight: 120, webbingWidthMm: 19 });
    // centered: (200 - 19) / 2 = 90.5
    expect(result.webbingAttachment.x).toBeCloseTo(90.5, 5);
  });

  it('fold lines are labeled top-of-collar and bottom-of-collar', () => {
    const result = rollTopClosure({ openingWidth: 200, collarHeight: 120, webbingWidthMm: 19 });
    const labels = result.foldLines.map((f) => f.label);
    expect(labels).toContain('top-of-collar');
    expect(labels).toContain('bottom-of-collar');
  });

  it('webbingAttachment.width equals webbingWidthMm', () => {
    const result = rollTopClosure({ openingWidth: 200, collarHeight: 120, webbingWidthMm: 19 });
    expect(result.webbingAttachment.width).toBe(19);
  });
});
