import { describe, it, expect } from 'vitest';
import { buildShoulderStraps } from '../modules/shoulderStraps.js';
import { buildPattern } from '../buildPattern.js';
import { resolveInputs, defaultStrapPadLength, strapTailLength } from '../inputs.js';
import { getPreset } from '../stylePresets.js';
import type { TriZipInputs } from '../types.js';
import { renderHtml } from '../../../lib/pattern-engine/instructions/compile.js';

const inputs: TriZipInputs = { height: 500, width: 300, depth: 150, units: 'mm', stylePreset: 'hiking' };

describe('tri-zip shoulder straps on the strap engine', () => {
  it('pad length defaults to 0.75 × height, clamped; tail takes the gusset depth', () => {
    expect(defaultStrapPadLength(500)).toBe(375);
    expect(defaultStrapPadLength(200)).toBe(250);
    expect(defaultStrapPadLength(1000)).toBe(550);
    // 500 − 375 + 150 + 200
    expect(strapTailLength(500, 375, 150)).toBe(475);
    // a deeper gusset makes every strap longer while the pad stays put
    expect(strapTailLength(500, 375, 225) - strapTailLength(500, 375, 150)).toBe(75);
  });

  it('resolves strap defaults and honours overrides', () => {
    const r = resolveInputs(inputs, getPreset('hiking'));
    expect(r.strap_architecture).toBe('foam_sandwich_mesh');
    expect(r.strap_edge_finish).toBe('bound');
    expect(r.strap_webbing_width).toBe(25);
    expect(r.strap_pad_length).toBe(375);
    expect(r.strap_tail_length).toBe(475);
    const o = resolveInputs({ ...inputs, strap_pad_length: 300, strap_architecture: 'webbing_tacked_ends', strap_webbing_width: 38 }, getPreset('hiking'));
    expect(o.strap_pad_length).toBe(300);
    expect(o.strap_tail_length).toBe(550);
    expect(o.strap_architecture).toBe('webbing_tacked_ends');
  });

  it('hiking preset (s_curve, 65 mm, 12 mm foam) emits a mirrored pair with foam, mesh and webbing', () => {
    const r = resolveInputs(inputs, getPreset('hiking'));
    const m = buildShoulderStraps(r);
    const shell = m.pieces.find((p) => p.id === 'shoulder-strap')!;
    expect(shell.quantity).toBe(2);
    expect(shell.mirror).toBe(true);
    expect(shell.paths[0].edges.filter((e) => e.kind === 'bezier')).toHaveLength(4);
    expect(m.pieces.map((p) => p.id)).toEqual([
      'shoulder-strap', 'shoulder-strap-inner', 'shoulder-strap-foam', 'shoulder-strap-webbing-tail', 'shoulder-strap-webbing-top',
    ]);
    expect(m.steps[0].id).toBe('tri-zip.shoulder-straps.cut');
    expect(m.steps.map((s) => s.id)).toContain('tri-zip.shoulder-straps.assemble');
    expect(m.steps[m.steps.length - 1].body).toMatch(/Hardware: 2 × 1" ladderlock/);
  });

  it('tactical preset (straight) has a rectangular shell', () => {
    const r = resolveInputs({ ...inputs, stylePreset: 'tactical' }, getPreset('tactical'));
    const shell = buildShoulderStraps(r).pieces[0];
    expect(shell.paths[0].edges.every((e) => e.kind === 'straight')).toBe(true);
  });

  it('the whole backpack still builds, with strap steps referenced by the back panel and final assembly', () => {
    const result = buildPattern(inputs, getPreset('hiking'));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = new Set(result.value.steps.map((s) => s.id));
    for (const s of result.value.steps) for (const d of s.dependsOn) expect(ids.has(d)).toBe(true);
    expect(renderHtml(result.value.steps).ok).toBe(true);
    expect(result.value.pieces.find((p) => p.id === 'shoulder-strap-foam')).toBeDefined();
  });
});
