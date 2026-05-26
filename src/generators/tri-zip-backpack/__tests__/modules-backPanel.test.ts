import { describe, it, expect } from 'vitest';
import { buildBackPanel } from '../modules/backPanel.js';
import { resolveInputs } from '../inputs.js';
import { STYLE_PRESETS } from '../stylePresets.js';
import type { ResolvedInputs } from '../types.js';
import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';

function makeResolved(overrides: Partial<ResolvedInputs> = {}): ResolvedInputs {
  const preset = STYLE_PRESETS['urban_assault'];
  const base = resolveInputs(
    { height: 510, width: 300, depth: 200, units: 'mm', stylePreset: 'urban_assault' },
    preset,
  );
  return { ...base, ...overrides };
}

describe('buildBackPanel', () => {
  it('returns a single back-panel piece', () => {
    const result = buildBackPanel(makeResolved());
    expect(result.pieces).toHaveLength(1);
    expect(result.pieces[0].id).toBe('back-panel');
  });

  it('piece has mirror: false and quantity: 1', () => {
    const result = buildBackPanel(makeResolved());
    expect(result.pieces[0].mirror).toBe(false);
    expect(result.pieces[0].quantity).toBe(1);
  });

  it('produces a closed outline path', () => {
    const result = buildBackPanel(makeResolved());
    const outline = result.pieces[0].paths.find(p => p.id === 'back-panel-outline');
    expect(outline).toBeDefined();
    expect(outline?.closed).toBe(true);
  });

  it('rounded shape has arc edges in the outline path', () => {
    const result = buildBackPanel(makeResolved({ back_panel_shape: 'rounded' }));
    const outline = result.pieces[0].paths.find(p => p.id === 'back-panel-outline');
    expect(outline).toBeDefined();
    const arcs = outline!.edges.filter((e: Edge) => e.kind === 'arc');
    expect(arcs.length).toBeGreaterThan(0);
  });

  it('square shape has only straight edges', () => {
    const result = buildBackPanel(makeResolved({ back_panel_shape: 'square' }));
    const outline = result.pieces[0].paths.find(p => p.id === 'back-panel-outline');
    expect(outline).toBeDefined();
    const nonStraight = outline!.edges.filter((e: Edge) => e.kind !== 'straight');
    expect(nonStraight.length).toBe(0);
  });

  it('tactical shape produces a polygon with more than 4 edges', () => {
    const result = buildBackPanel(makeResolved({ back_panel_shape: 'tactical' }));
    const outline = result.pieces[0].paths.find(p => p.id === 'back-panel-outline');
    expect(outline).toBeDefined();
    expect(outline!.edges.length).toBeGreaterThan(4);
  });

  it('contributes construction steps', () => {
    const result = buildBackPanel(makeResolved());
    expect(result.steps.length).toBeGreaterThan(0);
    expect(result.steps[0].id).toMatch(/back-panel/);
  });

  it('bounding box roughly matches width × height', () => {
    const width = 300;
    const height = 510;
    const result = buildBackPanel(makeResolved({ width, height, back_panel_shape: 'square' }));
    const outline = result.pieces[0].paths[0];

    const allPoints = outline.edges.flatMap((e: Edge) => [e.start, e.end]);
    const xs = allPoints.map(p => p.x);
    const ys = allPoints.map(p => p.y);
    const bboxW = Math.max(...xs) - Math.min(...xs);
    const bboxH = Math.max(...ys) - Math.min(...ys);

    expect(bboxW).toBeCloseTo(width, 1);
    expect(bboxH).toBeCloseTo(height, 1);
  });
});
