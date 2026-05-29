import { describe, it, expect } from 'vitest';
import { buildBom, computeCutDimensions } from '../bom.js';
import type { ResolvedInputs } from '../types.js';

const REF: ResolvedInputs = {
  finished_length: 180,
  finished_width: 100,
  finished_depth: 40,
  seam_allowance: 10,
  zip_gauge: '#3',
  grosgrain_width: 15.875,
  pull_loops: true,
  units: 'mm',
  preset: 'custom',
};

// ─── computeCutDimensions ─────────────────────────────────────────────────────

describe('computeCutDimensions', () => {
  it('cut_width = finished_length + 2×SA', () => {
    const { cutWidth } = computeCutDimensions(REF);
    expect(cutWidth).toBe(200); // 180 + 2×10
  });

  it('cut_height = finished_width + depth/2 + SA', () => {
    const { cutHeight } = computeCutDimensions(REF);
    expect(cutHeight).toBe(130); // 100 + 20 + 10
  });

  it('SA=0 produces finished_length as cut_width', () => {
    const r = { ...REF, seam_allowance: 0 };
    expect(computeCutDimensions(r).cutWidth).toBe(180);
  });
});

// ─── buildBom — descriptions ──────────────────────────────────────────────────

describe('buildBom — descriptions', () => {
  it('contains a row with YKK coil zipper #3', () => {
    const bom = buildBom(REF);
    expect(bom.some((r) => r.description.includes('YKK coil zipper #3'))).toBe(true);
  });

  it('contains a row with grosgrain ribbon', () => {
    const bom = buildBom(REF);
    expect(bom.some((r) => r.description.includes('grosgrain ribbon'))).toBe(true);
  });

  it('zipper description reflects zip_gauge #5', () => {
    const bom = buildBom({ ...REF, zip_gauge: '#5' });
    expect(bom.some((r) => r.description.includes('YKK coil zipper #5'))).toBe(true);
  });
});

// ─── buildBom — zipper length ─────────────────────────────────────────────────

describe('buildBom — zipper length', () => {
  it('zipper quantity = 250 mm for reference inputs', () => {
    const bom = buildBom(REF);
    const row = bom.find((r) => r.description.includes('YKK coil zipper'));
    expect(row).toBeDefined();
    expect(row!.quantity).toBe(250); // cut_width 200 + 25 = 225 → 250
  });

  it('zipper unit is mm', () => {
    const bom = buildBom(REF);
    const row = bom.find((r) => r.description.includes('YKK coil zipper'));
    expect(row!.unit).toBe('mm');
  });

  it('zipper rounds up to nearest 50', () => {
    // finished_length 160, SA 10 → cut_width 180; 180 + 25 = 205 → 250
    const bom = buildBom({ ...REF, finished_length: 160 });
    const row = bom.find((r) => r.description.includes('YKK coil zipper'));
    expect(row!.quantity).toBe(250);
  });

  it('larger pouch produces longer zipper', () => {
    // finished_length 250, SA 10 → cut_width 270; 270 + 25 = 295 → 300
    const bom = buildBom({ ...REF, finished_length: 250 });
    const row = bom.find((r) => r.description.includes('YKK coil zipper'));
    expect(row!.quantity).toBe(300);
  });
});

// ─── buildBom — grosgrain binding ────────────────────────────────────────────

describe('buildBom — grosgrain binding', () => {
  it('grosgrain binding quantity = 500 mm for reference inputs', () => {
    // perimeter = 2×130 + 200 - 2×40 = 380; ×1.1 = 418 → 500
    const bom = buildBom(REF);
    const row = bom.find((r) => r.description.includes('grosgrain ribbon'));
    expect(row).toBeDefined();
    expect(row!.quantity).toBe(500);
  });

  it('grosgrain binding unit is mm', () => {
    const bom = buildBom(REF);
    const row = bom.find((r) => r.description.includes('grosgrain ribbon'));
    expect(row!.unit).toBe('mm');
  });

  it('grosgrain binding quantity >= 2×cut_height + cut_width', () => {
    const { cutWidth, cutHeight } = computeCutDimensions(REF);
    const bom = buildBom(REF);
    const row = bom.find((r) => r.description.includes('grosgrain ribbon'));
    expect(row!.quantity).toBeGreaterThanOrEqual(2 * cutHeight + cutWidth);
  });

  it('grosgrain binding rounds up to nearest 100', () => {
    // Vary depth: finished_depth=20 → cut_height=110+10=120; perimeter=2×120+200-2×20=440; ×1.1=484→500
    const bom = buildBom({ ...REF, finished_depth: 20, finished_width: 110 });
    const row = bom.find((r) => r.description.includes('grosgrain ribbon'));
    expect(row!.quantity % 100).toBe(0);
  });
});

// ─── buildBom — pull loops ────────────────────────────────────────────────────

describe('buildBom — pull loops', () => {
  it('pull_loops: false → no pull-loop row', () => {
    const bom = buildBom({ ...REF, pull_loops: false });
    expect(bom.some((r) => r.id === 'pull-loops')).toBe(false);
  });

  it('pull_loops: true → exactly one pull-loop row', () => {
    const bom = buildBom(REF);
    const loops = bom.filter((r) => r.id === 'pull-loops');
    expect(loops).toHaveLength(1);
  });

  it('pull-loop row has quantity 2', () => {
    const bom = buildBom(REF);
    const row = bom.find((r) => r.id === 'pull-loops');
    expect(row!.quantity).toBe(2);
  });
});

// ─── buildBom — shell fabric ──────────────────────────────────────────────────

describe('buildBom — shell fabric', () => {
  it('shell fabric row quantity = 2 panels', () => {
    const bom = buildBom(REF);
    const row = bom.find((r) => r.id === 'shell-fabric');
    expect(row).toBeDefined();
    expect(row!.quantity).toBe(2);
  });

  it('shell fabric row unit = panels', () => {
    const bom = buildBom(REF);
    const row = bom.find((r) => r.id === 'shell-fabric');
    expect(row!.unit).toBe('panels');
  });
});
