import { describe, it, expect } from 'vitest';
import { buildPattern } from '../buildPattern.js';
import { DEFAULT_COLLAR_HEIGHT_MM, DEFAULT_TOP_HEM_MM, DEFAULT_BOTTOM_SEAM_MM, DEFAULT_BUCKLE_SIZE_MM } from '../defaults.js';

const BASE_INPUTS = {
  bottom_length: 200,
  bottom_width: 100,
  height_when_rolled: 300,
  units: 'mm' as const,
};

describe('buildPattern', () => {
  it('returns ok: true for valid inputs', () => {
    const result = buildPattern(BASE_INPUTS);
    expect(result.ok).toBe(true);
  });

  it('returns at least one piece', () => {
    const result = buildPattern(BASE_INPUTS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.pieces.length).toBeGreaterThanOrEqual(1);
  });

  it('body panel cutHeight equals height_when_rolled + collar_height + top_hem + bottom_seam', () => {
    const result = buildPattern(BASE_INPUTS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const expectedCutHeight = 300 + DEFAULT_COLLAR_HEIGHT_MM + DEFAULT_TOP_HEM_MM + DEFAULT_BOTTOM_SEAM_MM;
    expect(expectedCutHeight).toBeCloseTo(454.9, 2);

    const bodyPanel = result.value.pieces.find(p => p.id === 'body-panel');
    expect(bodyPanel).toBeDefined();

    // Find the outline path and check its height from edge endpoints
    const outline = bodyPanel!.paths.find(p => p.id === 'body-panel-outline');
    expect(outline).toBeDefined();
    const maxY = Math.max(...outline!.edges.flatMap(e => [e.start.y, e.end.y]));
    expect(maxY).toBeCloseTo(expectedCutHeight, 2);
  });

  it('BOM hardware list contains a buckle with correct size', () => {
    const result = buildPattern(BASE_INPUTS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const buckle = result.value.bom.hardware.find(h => h.type === 'buckle');
    expect(buckle).toBeDefined();
    expect(buckle!.sizeMm).toBe(DEFAULT_BUCKLE_SIZE_MM);
  });

  it('BOM materials contains at least one fabric entry', () => {
    const result = buildPattern(BASE_INPUTS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const fabric = result.value.bom.materials.find(m => m.type === 'fabric');
    expect(fabric).toBeDefined();
  });

  it('BOM materials contains at least one webbing entry', () => {
    const result = buildPattern(BASE_INPUTS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const webbing = result.value.bom.materials.find(m => m.type === 'webbing');
    expect(webbing).toBeDefined();
  });

  it('returns invalid-inputs error for bottom_length = 0', () => {
    const result = buildPattern({ ...BASE_INPUTS, bottom_length: 0 });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.kind).toBe('invalid-inputs');
  });

  it('returns steps for all construction phases', () => {
    const result = buildPattern(BASE_INPUTS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const stepIds = result.value.steps.map(s => s.id);
    expect(stepIds).toContain('roll-top-sack.cut-panels');
    expect(stepIds).toContain('roll-top-sack.french-seam-sides');
    expect(stepIds).toContain('roll-top-sack.box-corners');
    expect(stepIds).toContain('roll-top-sack.attach-webbing');
  });

  it('inch inputs produce same cutHeight as equivalent mm inputs (within 0.01mm)', () => {
    const mmResult = buildPattern({ bottom_length: 8 * 25.4, bottom_width: 4 * 25.4, height_when_rolled: 12 * 25.4, units: 'mm' });
    const inResult = buildPattern({ bottom_length: 8, bottom_width: 4, height_when_rolled: 12, units: 'in' });
    expect(mmResult.ok && inResult.ok).toBe(true);
    if (!mmResult.ok || !inResult.ok) return;

    const mmPanel = mmResult.value.pieces.find(p => p.id === 'body-panel')!;
    const inPanel = inResult.value.pieces.find(p => p.id === 'body-panel')!;

    const mmOutline = mmPanel.paths.find(p => p.id === 'body-panel-outline')!;
    const inOutline = inPanel.paths.find(p => p.id === 'body-panel-outline')!;

    const mmMaxY = Math.max(...mmOutline.edges.flatMap(e => [e.start.y, e.end.y]));
    const inMaxY = Math.max(...inOutline.edges.flatMap(e => [e.start.y, e.end.y]));
    expect(Math.abs(mmMaxY - inMaxY)).toBeLessThan(0.01);
  });

  it('body panel has fold paths for top hem and collar', () => {
    const result = buildPattern(BASE_INPUTS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'body-panel')!;
    const foldPaths = panel.paths.filter(p => p.edges.some(e => e.role === 'fold'));
    expect(foldPaths.length).toBeGreaterThanOrEqual(2);
  });

  it('body panel quantity is 2 (two-panel construction)', () => {
    const result = buildPattern(BASE_INPUTS);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const panel = result.value.pieces.find(p => p.id === 'body-panel');
    expect(panel).toBeDefined();
    expect(panel!.quantity).toBe(2);
  });
});
