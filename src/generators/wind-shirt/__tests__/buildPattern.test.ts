// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, validateInputs, resolveInputs, BACK_ID, FRONT_ID, SLEEVE_ID, BINDING_ID, PLACEHOLDERS } from '../index.js';
import type { WindShirtInputs } from '../types.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import { makeDefaultWindShirtProject } from '../../../state/useWindShirtProject.js';

const IN = 25.4;
const DEF: WindShirtInputs = makeDefaultWindShirtProject().inputs;
const built = (i: WindShirtInputs) => { const b = buildPattern(i); if (!b.ok) throw new Error(JSON.stringify(b.errors)); return b.value; };
const errorFields = (i: WindShirtInputs) => { const v = validateInputs(i); return v.ok ? [] : v.errors.map((e) => e.field); };
const piece = (ps: Piece[], id: string) => ps.find((p) => p.id === id)!;
/** Lengths of a piece's sew-line paths for one seam (`<piece>-<tag>-<i>`), in path order. */
const sew = (p: Piece, tag: string) => p.paths.filter((x) => x.id.startsWith(`${p.id}-${tag}-`)).map((x) => x.edges.reduce((s, e) => s + Math.hypot(e.end.x - e.start.x, e.end.y - e.start.y), 0));

describe('wind shirt — every seam pair matches', () => {
  for (const variant of [{ name: 'straight body', i: DEF }, { name: 'shaped body', i: { ...DEF, body: 'shaped' as const } }, { name: 'mm, no cap ease', i: { ...DEF, units: 'mm' as const, cap_ease: 0 } }]) {
    it(`${variant.name}: shoulders, sides, armhole to cap, underarm seams and the neck binding`, () => {
      const v = built(variant.i);
      const back = piece(v.pieces, BACK_ID), front = piece(v.pieces, FRONT_ID), sleeve = piece(v.pieces, SLEEVE_ID), binding = piece(v.pieces, BINDING_ID);
      // Shoulders: two on each piece, back to front.
      const sb = sew(back, 'shoulder'), sf = sew(front, 'shoulder');
      expect(sb).toHaveLength(2);
      sb.forEach((l, i) => expect(l).toBeCloseTo(sf[i], 6));
      // Sides.
      const db = sew(back, 'side'), df = sew(front, 'side');
      expect(db).toHaveLength(2);
      db.forEach((l, i) => expect(l).toBeCloseTo(df[i], 6));
      // Armhole (back + front, one side) against the sleeve cap, less the cap ease.
      const arm = sew(back, 'armhole')[0] + sew(front, 'armhole')[0];
      const cap = sew(sleeve, 'cap').reduce((a, b) => a + b, 0);
      const capEase = resolveInputs(variant.i).cap_ease;
      expect(Math.abs(cap - capEase - arm)).toBeLessThan(1);
      // The two underarm seams of the sleeve.
      const u = sew(sleeve, 'underseam');
      expect(u).toHaveLength(2);
      expect(u[0]).toBeCloseTo(u[1], 6);
      // Neck: back + front neckline (whole) = the binding's sew line.
      const neck = [...sew(back, 'neck'), ...sew(front, 'neck')].reduce((a, b) => a + b, 0);
      const bind = binding.paths.find((p) => p.id === `${BINDING_ID}-sew`)!.edges[0];
      expect(bind.end.x - bind.start.x).toBeCloseTo(neck, 3);
      expect(v.seams.binding).toBeCloseTo(neck, 3);
      // Convention B everywhere.
      for (const p of v.pieces) expect(Object.values(p.seamAllowances!).every((x) => x === 0)).toBe(true);
    });
  }
  it('the drafted body is the eased chest round, the sleeve the eased bicep and the neck the eased neck', () => {
    const v = built(DEF);
    const neck = [...sew(piece(v.pieces, BACK_ID), 'neck'), ...sew(piece(v.pieces, FRONT_ID), 'neck')].reduce((a, b) => a + b, 0);
    expect(neck).toBeCloseTo(16.5 * IN, 0);
    expect(v.steps.find((s) => s.id === 'shirt.sleeves')!.body).toMatch(/cap notch/);
    expect(v.hardware.find((h) => h.id === 'elastic')!.notes).toContain(`${Math.round(0.85 * 7 * IN)} mm`);
  });
  it('the default project leaves every measurement empty and drafts from the example body, flagged', () => {
    for (const p of PLACEHOLDERS) expect(DEF[p.field]).toBeUndefined();
    const m = built(DEF).warnings.find((w) => w.id === 'mock-derived')!.message;
    expect(m).toMatch(/example body \(one person, not a size chart\)/);
    expect(m).not.toMatch(/[;:] waist \(example body\)/);
  });
  it('errors name the field to fix', () => {
    expect(errorFields({ ...DEF, scye_depth: 20 })).toEqual(['scye_depth']);
    expect(errorFields({ ...DEF, shoulder_drop: 12 })).toEqual(['shoulder_drop']);
    expect(errorFields({ ...DEF, fabric_width: 20 })).toEqual(['fabric_width']);
    expect(errorFields({ ...DEF, zip_length: 30 })).toEqual(['zip_length']);
  });
  it('BOM: four pieces, the fabric length, zipper and elastic', () => {
    const rows = buildBom(DEF);
    expect(rows.filter((r) => r.id.startsWith('piece-'))).toHaveLength(4);
    expect(rows.find((r) => r.id === 'material-shirt-fabric')!.quantity).toBeGreaterThan(50 * IN);
    expect(rows.some((r) => r.id === 'hw-zipper')).toBe(true);
  });
});
