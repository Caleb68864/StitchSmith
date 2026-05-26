import { describe, it, expect } from 'vitest';
import { boxedCornerStitchLine } from '../boxedCorner.js';

describe('boxedCornerStitchLine', () => {
  it('offset equals bottomWidth / 2', () => {
    const result = boxedCornerStitchLine({ panelWidth: 300, panelHeight: 500, bottomWidth: 100 });
    expect(result.stitchLineOffsetFromCorner).toBe(50);
  });

  it('trimAllowanceMm is always 9.5', () => {
    const result = boxedCornerStitchLine({ panelWidth: 300, panelHeight: 500, bottomWidth: 80 });
    expect(result.trimAllowanceMm).toBe(9.5);
  });

  it('returns two markers', () => {
    const result = boxedCornerStitchLine({ panelWidth: 300, panelHeight: 500, bottomWidth: 100 });
    expect(result.markers).toHaveLength(2);
  });

  it('markers are placed at offset and panelWidth - offset', () => {
    const result = boxedCornerStitchLine({ panelWidth: 300, panelHeight: 500, bottomWidth: 100 });
    expect(result.markers[0].x).toBe(50);
    expect(result.markers[1].x).toBe(250);
  });

  it('zero bottomWidth gives zero offset', () => {
    const result = boxedCornerStitchLine({ panelWidth: 200, panelHeight: 400, bottomWidth: 0 });
    expect(result.stitchLineOffsetFromCorner).toBe(0);
  });
});
