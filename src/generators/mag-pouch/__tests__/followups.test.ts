// @vitest-environment node
/**
 * Roadmap follow-ups: one-piece lid pull channel, hourglass aesthetic, MALICE mount.
 * Vault: rigs/subgun-lid-pull-channel.md, mag-pouches/mag-pouch-hourglass-aesthetic.md.
 */
import { describe, it, expect } from 'vitest';
import { resolveMagPouch } from '../resolve.js';
import { buildPattern } from '../buildPattern.js';
import { validateInputs } from '../inputs.js';
import type { MagPouchInputs } from '../types.js';
import { buildAttachment, maliceClipSize } from '../../../lib/pouch-engine/components/attachment.js';

function inputs(overrides: Partial<MagPouchInputs> = {}): MagPouchInputs {
  return {
    magazine: { mode: 'predefined', presetId: 'ar15_30_round', units: 'in' },
    retention: 'flap_velcro',
    attachment: 'pals',
    drainage: 'open_corner',
    seamAllowance: 0.375,
    construction: 'pleated_card',
    ...overrides,
  };
}

describe('one-piece lid pull channel', () => {
  it('adds 1.5" to a Velcro lid by default, nothing to a snap lid, and draws the 180° fold-back', () => {
    const velcro = resolveMagPouch(inputs());
    const snap = resolveMagPouch(inputs({ retention: 'flap_snap' }));
    expect(velcro.pullChannelDepthIn).toBe(1.5);
    expect(snap.pullChannelDepthIn).toBe(0);
    expect(velcro.flapLengthIn - snap.flapLengthIn).toBeCloseTo(1.5, 6);
    const built = buildPattern(inputs());
    const back = built.pattern.pieces.find((p) => p.id === 'back')!;
    expect(back.paths.some((p) => p.id === 'pull-channel-fold' && /180°/.test(p.label ?? ''))).toBe(true);
    expect(built.steps.some((s) => /pull channel/i.test(s.body))).toBe(true);
  });
  it('warns when the channel is under 1.5" or the hook purchase under 3", and validates the range', () => {
    expect(buildPattern(inputs({ pull_channel_depth: 1 })).warnings.some((w) => /Pull channel 1/.test(w))).toBe(true);
    expect(buildPattern(inputs()).warnings.some((w) => /Lid purchase/.test(w))).toBe(true);
    expect(buildPattern(inputs({ closure_overlap: 3 })).warnings.some((w) => /Lid purchase/.test(w))).toBe(false);
    expect(validateInputs(inputs({ pull_channel_depth: 6 })).ok).toBe(false);
    expect(buildPattern(inputs({ pull_channel_depth: 0 })).pattern.pieces.find((p) => p.id === 'back')!.paths.some((p) => p.id === 'pull-channel-fold')).toBe(false);
  });
});

describe('hourglass aesthetic', () => {
  it('is off by default; on, the face is cut 1/2" wider and inset seams are drawn with a labour warning', () => {
    const off = buildPattern(inputs());
    const on = buildPattern(inputs({ hourglass_aesthetic: true }));
    const w = (b: typeof on) => { const f = b.pattern.pieces.find((p) => p.id === 'face')!; return Math.max(...f.paths[0].edges.map((e) => e.end.x)); };
    expect(w(on) - w(off)).toBeCloseTo(0.5 * 25.4, 6);
    expect(on.pattern.pieces.find((p) => p.id === 'face')!.paths.some((p) => p.id === 'hourglass-left')).toBe(true);
    expect(on.warnings.some((x) => /Hourglass/.test(x))).toBe(true);
    expect(off.warnings.some((x) => /Hourglass/.test(x))).toBe(false);
  });
});

describe('MALICE clip mount', () => {
  it('keeps the sewn back rows, drops the mount straps, and counts clips by column with size by rows', () => {
    const a = buildAttachment({ style: 'malice', finishedHeight_mm: 150, finishedWidth_mm: 3 * 25.4 });
    expect(a.pieces.some((p) => p.id === 'pals-back-row')).toBe(true);
    expect(a.pieces.some((p) => p.id === 'pals-mount-strap')).toBe(false);
    expect(a.steps.some((s) => s.id === 'malice-clips')).toBe(true);
    expect(maliceClipSize(2)).toBe('short');
    expect(maliceClipSize(3)).toBe('long');
    const bom = buildPattern(inputs({ attachment: 'malice', cell_count: 2 })).bom;
    const clip = bom.hardware.find((h) => h.id === 'malice-clip')!;
    expect(clip.quantity).toBe(4);
    expect(bom.materials.some((m) => m.id === 'mount-strap-webbing')).toBe(false);
    expect(buildPattern(inputs({ attachment: 'malice' })).pattern.pieces.length).toBeGreaterThan(0);
  });
});
