// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPaddedStrap, DEFAULT_WEBBING_INSERTION_MM } from '../index.js';
import type { PaddedStrapSpec } from '../types.js';
import { strapOutline, defaultBottomWidth } from '../geometry.js';
import { makeEdgeIdGen } from '../../pattern-engine/graph/Edge.js';
import { renderHtml } from '../../pattern-engine/instructions/compile.js';
import { patternToSvg } from '../../pattern-engine/exports/svg.js';
import { computeSeamAllowancePolygon } from '../../pattern-engine/geometry/offset.js';

const base: PaddedStrapSpec = {
  padLength_mm: 400,
  padWidth_mm: 60,
  foamThickness_mm: 8,
  curve: 'j_curve',
  architecture: 'foam_sandwich_mesh',
  edgeFinish: 'bound',
  webbingWidth_mm: 25,
  tailLength_mm: 450,
  seamAllowance_mm: 10,
  gussetDepth_mm: 150,
};

function ids(r: ReturnType<typeof buildPaddedStrap>): string[] {
  return r.pieces.map((p) => p.id);
}

describe('strapOutline', () => {
  it('straight is a rectangle with four straight edges', () => {
    const p = strapOutline({ width: 50, length: 300, curve: 'straight' }, makeEdgeIdGen('t'), 'o');
    expect(p.edges).toHaveLength(4);
    expect(p.edges.every((e) => e.kind === 'straight')).toBe(true);
    expect(p.closed).toBe(true);
  });

  it('j_curve is straight for the top 40 % then sweeps inward with beziers', () => {
    const p = strapOutline({ width: 60, length: 400, curve: 'j_curve', bottomWidth: 40, sweep: 18 }, makeEdgeIdGen('t'), 'o');
    expect(p.edges.filter((e) => e.kind === 'bezier')).toHaveLength(2);
    const outerStraight = p.edges[1];
    expect(outerStraight.end.y).toBeCloseTo(160, 6);
    const bottom = p.edges[3];
    expect(bottom.start.x - bottom.end.x).toBeCloseTo(40, 6);
    expect(bottom.end.x).toBeCloseTo(-18, 6); // inner edge swept inward
  });

  it('s_curve has four beziers and returns outward at the bottom', () => {
    const p = strapOutline({ width: 60, length: 400, curve: 's_curve', bottomWidth: 40, sweep: 18 }, makeEdgeIdGen('t'), 'o');
    expect(p.edges.filter((e) => e.kind === 'bezier')).toHaveLength(4);
    const bottom = p.edges.find((e) => e.kind === 'straight' && e.start.y === 400 && e.end.y === 400)!;
    expect(Math.min(bottom.start.x, bottom.end.x)).toBeGreaterThan(0);
  });

  it('every edge chains to the next so the outline is closed', () => {
    for (const curve of ['straight', 'j_curve', 's_curve'] as const) {
      const p = strapOutline({ width: 60, length: 400, curve, bottomWidth: 40, sweep: 18 }, makeEdgeIdGen('t'), 'o');
      for (let i = 0; i < p.edges.length; i++) {
        const a = p.edges[i];
        const b = p.edges[(i + 1) % p.edges.length];
        expect(a.end.x).toBeCloseTo(b.start.x, 9);
        expect(a.end.y).toBeCloseTo(b.start.y, 9);
      }
    }
  });

  it('bottom width tapers toward the webbing on curved pads only', () => {
    expect(defaultBottomWidth(60, 25, 'straight')).toBe(60);
    expect(defaultBottomWidth(60, 25, 'j_curve')).toBe(39);
    expect(defaultBottomWidth(40, 38, 'j_curve')).toBe(50); // never narrower than webbing + 12
  });
});

describe('buildPaddedStrap — foam sandwich, bound (vault standard)', () => {
  const r = buildPaddedStrap(base);

  it('emits shell, mesh backer, foam, tail and top-anchor webbing', () => {
    expect(ids(r)).toEqual(['shoulder-strap', 'shoulder-strap-inner', 'shoulder-strap-foam', 'shoulder-strap-webbing-tail', 'shoulder-strap-webbing-top']);
    for (const p of r.pieces.slice(0, 3)) {
      expect(p.quantity).toBe(2);
      expect(p.mirror).toBe(true);
    }
  });

  it('a bound pad carries explicit 0 seam allowance on every shell edge (binding adds none)', () => {
    const shell = r.pieces[0];
    for (const e of shell.paths[0].edges) expect(shell.seamAllowances?.[e.id]).toBe(0);
    const sa = computeSeamAllowancePolygon(shell, shell.paths[0], 10);
    expect(sa.ok).toBe(true);
    if (sa.ok) expect(sa.value).toBeNull();
  });

  it('foam is the shell outline inset 12.7 mm, on its own material; mesh is inset 6.35 mm', () => {
    expect(r.derived.foamWidth_mm).toBeCloseTo(60 - 2 * 12.7, 1);
    expect(r.derived.foamLength_mm).toBeCloseTo(400 - 2 * 12.7, 1);
    expect(r.pieces[2].materialId).toBe('foam-closed-cell');
    expect(r.pieces[1].materialId).toBe('spacer-mesh');
    const mesh = r.pieces[1].paths[0];
    expect(mesh.edges[0].start.x).toBeCloseTo(6.35, 6);
    expect(mesh.edges[0].start.y).toBeCloseTo(6.35, 6);
  });

  it('webbing tail = free tail + 1" insertion; top anchor = 100 + 1"', () => {
    const tail = r.pieces.find((p) => p.id === 'shoulder-strap-webbing-tail')!;
    const top = r.pieces.find((p) => p.id === 'shoulder-strap-webbing-top')!;
    expect(tail.paths[0].edges[1].end.y).toBeCloseTo(450 + DEFAULT_WEBBING_INSERTION_MM, 6);
    expect(top.paths[0].edges[1].end.y).toBeCloseTo(100 + DEFAULT_WEBBING_INSERTION_MM, 6);
    expect(r.derived.webbingPerStrap_mm).toBeCloseTo(450 + 100 + 2 * DEFAULT_WEBBING_INSERTION_MM, 6);
    expect(r.derived.gussetDepth_mm).toBe(150);
  });

  it('no foam in the needle path; steps compile; hardware lists ladderlocks and binding', () => {
    expect(r.derived.foamInNeedlePath).toBe(false);
    expect(r.steps.map((s) => s.id)).toEqual(['strap.cut', 'strap.webbing', 'strap.assemble', 'strap.hardware']);
    expect(renderHtml(r.steps).ok).toBe(true);
    expect(r.hardware.map((h) => h.id)).toEqual(['ladderlock', 'binding']);
    expect(r.hardware[0].quantity).toBe(2);
  });

  it('only the handed-pair warning fires for a well-proportioned strap', () => {
    expect(r.warnings).toHaveLength(1);
    expect(r.warnings[0]).toMatch(/mirrored pair/);
  });

  it('renders through the SVG exporter', () => {
    const svg = patternToSvg({ id: 'x', name: 'x', pieces: r.pieces }, { defaultSeamAllowance: 10 });
    expect(svg).toContain('<svg');
    expect(svg).toContain(' C '); // beziers survive
  });
});

describe('buildPaddedStrap — other architectures and finishes', () => {
  it('turned edges put the seam allowance on every shell edge (Convention A)', () => {
    const r = buildPaddedStrap({ ...base, edgeFinish: 'turned' });
    const shell = r.pieces[0];
    for (const e of shell.paths[0].edges) expect(shell.seamAllowances?.[e.id]).toBe(10);
    const sa = computeSeamAllowancePolygon(shell, shell.paths[0], 0);
    expect(sa.ok && sa.value && sa.value.length > 3).toBe(true);
    expect(r.derived.foamWidth_mm).toBeCloseTo(60 - 2 * 13, 1); // SA + 3 inset
  });

  it('tacked ends set the foam back past the 1" insertion so no needle hits foam', () => {
    const r = buildPaddedStrap({ ...base, architecture: 'webbing_tacked_ends' });
    expect(r.derived.foamLength_mm).toBeCloseTo(400 - 2 * (25.4 + 6), 1);
    expect(r.derived.foamInNeedlePath).toBe(false);
    expect(r.pieces[1].materialId).toBe('cordura-500');
    expect(r.steps.find((s) => s.id === 'strap.webbing')!.body).toMatch(/no needle ever passes through foam/);
  });

  it('quilted through-webbing emits one full-length run plus a cover strip and flags the machine', () => {
    const r = buildPaddedStrap({ ...base, architecture: 'webbing_through_quilted', webbingWidth_mm: 38 });
    expect(ids(r)).toContain('shoulder-strap-webbing');
    expect(ids(r)).toContain('shoulder-strap-cover');
    expect(r.derived.webbingPerStrap_mm).toBe(100 + 400 + 450);
    expect(r.derived.foamInNeedlePath).toBe(true);
    expect(r.derived.maxLayers).toBe(8);
    expect(r.warnings.some((w) => w.includes('walking-foot'))).toBe(true);
  });

  it('crushable sleeve emits a turned tube with a fold line and continuous webbing', () => {
    const r = buildPaddedStrap({ ...base, architecture: 'crushable_sleeve' });
    expect(ids(r)).toEqual(['shoulder-strap', 'shoulder-strap-webbing']);
    const tube = r.pieces[0];
    expect(tube.paths[0].edges[0].end.x).toBeCloseTo(2 * 60 + 2 * 10, 6);
    expect(tube.paths[1].edges[0].role).toBe('fold');
    expect(r.derived.foamLength_mm).toBe(0);
  });

  it('slick webbing emits one piece and insists on stow/detach', () => {
    const r = buildPaddedStrap({ ...base, architecture: 'none' });
    expect(ids(r)).toEqual(['shoulder-strap']);
    expect(r.pieces[0].quantity).toBe(2);
    expect(r.warnings.some((w) => w.includes('detachable'))).toBe(true);
    expect(r.steps).toHaveLength(2);
  });

  it('side-release hardware lists buckles and tri-glides, male on the bag side', () => {
    const r = buildPaddedStrap({ ...base, hardware: 'side_release', webbingWidth_mm: 50.8 });
    expect(r.hardware.map((h) => h.id)).toEqual(['side-release', 'tri-glide', 'binding']);
    expect(r.hardware[0].name).toBe('2" side-release buckle');
    expect(r.hardware[0].notes).toMatch(/bag side/);
  });

  it('id prefixes and piece ids are honoured', () => {
    const r = buildPaddedStrap({ ...base, idPrefix: 'tri-zip.shoulder-straps.', pieceId: 'shoulder-strap', name: 'Shoulder strap' });
    expect(r.steps[0].id).toBe('tri-zip.shoulder-straps.cut');
    expect(r.steps.map((s) => s.id)).toContain('tri-zip.shoulder-straps.assemble');
    expect(r.pieces[0].id).toBe('shoulder-strap');
  });

  it('guidance warnings fire on bad widths, foam and short tails', () => {
    const r = buildPaddedStrap({ ...base, padWidth_mm: 30, foamThickness_mm: 2, tailLength_mm: 100, curve: 'straight' });
    expect(r.warnings.some((w) => w.includes('ultralight minimum'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('too thin'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('gusset depth'))).toBe(true);
    expect(r.warnings.some((w) => w.includes('mirrored pair'))).toBe(false);
  });

  it('rejects non-finite and non-positive inputs', () => {
    expect(() => buildPaddedStrap({ ...base, padLength_mm: NaN })).toThrow(/finite/);
    expect(() => buildPaddedStrap({ ...base, padWidth_mm: 0 })).toThrow(/positive/);
  });
});
