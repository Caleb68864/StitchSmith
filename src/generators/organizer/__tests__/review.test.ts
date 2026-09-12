// @vitest-environment node
/** Review pass: defects found reading the generator end to end (docs/reviews/generators.md). */
import { describe, it, expect } from 'vitest';
import { buildPattern, buildBom, resolveInputs, BODY_ID } from '../index.js';
import { makeDefaultOrganizerProject } from '../../../state/useOrganizerProject.js';

const IN = 25.4;
const DEF = makeDefaultOrganizerProject().inputs;

describe('organizer — review fixes', () => {
  it('the default project does not warn about its own Velcro length', () => {
    const b = buildPattern(DEF);
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    expect(b.value.warnings.find((w) => w.id === 'velcro-width'), 'default strip length is the clear width, which is the recommendation, not a fault').toBeUndefined();
    // One inch over the clear width still warns.
    const over = buildPattern({ ...DEF, velcro_strip_length: 4.75 });
    expect(over.ok && over.value.warnings.some((w) => w.id === 'velcro-width')).toBe(true);
  });

  it('the default project raises at most two notes and no warnings', () => {
    const b = buildPattern(DEF);
    if (!b.ok) return;
    expect(b.value.warnings.filter((w) => w.severity !== 'info')).toEqual([]);
    expect(b.value.warnings.length).toBeLessThanOrEqual(2);
  });

  it('the bifold body hems only its two raw ends and folds at the spine', () => {
    const r = resolveInputs({ ...DEF, bifold: true });
    // Two pockets of 5" front + 5" back plus one hem at each true end: 22", not 4 x (5 + 1).
    expect(r.body_cut_length).toBeCloseTo(22 * IN, 6);
    const b = buildPattern({ ...DEF, bifold: true });
    expect(b.ok).toBe(true);
    if (!b.ok) return;
    const body = b.value.pieces.find((p) => p.id === BODY_ID)!;
    const hems = body.paths.filter((p) => /-hem-/.test(p.id));
    expect(hems, 'a hem belongs on a raw edge; a bifold has two').toHaveLength(2);
    const hemYs = hems.map((p) => p.edges[0].start.y).sort((a, b2) => a - b2);
    expect(hemYs[0]).toBeCloseTo(1 * IN, 6);
    expect(hemYs[1]).toBeCloseTo(21 * IN, 6);
    expect(body.paths.some((p) => /spine/.test(p.id))).toBe(true);
    expect(body.paths.filter((p) => /bottom-fold/.test(p.id))).toHaveLength(2);
  });

  it('the BOM lists cut sizes, not finished sizes', () => {
    const rows = buildBom(DEF);
    const bodyRow = rows.find((x) => x.id === `piece-${BODY_ID}`)!;
    // Convention B: the organizer is drawn at cut size, so the BOM matches the drawing.
    expect(bodyRow.unit).toContain(`${Math.round(5 * IN)} × ${Math.round(12 * IN)}`);
  });
});
