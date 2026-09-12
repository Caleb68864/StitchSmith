// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { patternToTiledHtml, computeTiles, SCALE_RULE_MM } from '../exports/tiledHtml.js';
import type { Pattern } from '../graph/Pattern.js';
import type { Piece } from '../graph/Piece.js';

function rect(id: string, w: number, h: number): Piece {
  return {
    id, name: id, mirror: false, quantity: 1,
    paths: [{ id: `${id}-o`, closed: true, edges: [
      { kind: 'straight', id: `${id}-0`, role: 'cut', start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
      { kind: 'straight', id: `${id}-1`, role: 'cut', start: { x: w, y: 0 }, end: { x: w, y: h } },
      { kind: 'straight', id: `${id}-2`, role: 'cut', start: { x: w, y: h }, end: { x: 0, y: h } },
      { kind: 'straight', id: `${id}-3`, role: 'cut', start: { x: 0, y: h }, end: { x: 0, y: 0 } },
    ] }],
    seamAllowances: { [`${id}-0`]: 0, [`${id}-1`]: 0, [`${id}-2`]: 0, [`${id}-3`]: 0 },
  };
}

describe('patternToTiledHtml', () => {
  const big: Pattern = { id: 'p', name: 'Big Pattern', pieces: [rect('body', 400, 500)] };

  it('puts the pattern itself on every page, not an empty viewport', () => {
    const html = patternToTiledHtml(big);
    const pages = html.split('<section class="page"').length - 1;
    expect(pages).toBeGreaterThan(1);
    // Every page carries the geometry, clipped by its own viewBox.
    expect((html.match(/<path /g) ?? []).length).toBeGreaterThanOrEqual(pages);
    expect((html.match(/id="piece-body"/g) ?? []).length).toBe(pages);
    expect(html).not.toMatch(/<svg[^>]*>\s*<!-- tile/);
  });

  it('gives each tile its own viewBox so the pages step across the pattern', () => {
    const html = patternToTiledHtml(big, { paperWidthMm: 210, paperHeightMm: 297, marginMm: 10, overlapMm: 10 });
    const boxes = [...html.matchAll(/viewBox="([\d.]+) ([\d.]+) ([\d.]+) ([\d.]+)"/g)].map((m) => m.slice(1).map(Number));
    expect(boxes.length).toBeGreaterThan(1);
    expect(boxes[0][0]).toBe(0);
    expect(boxes[0][1]).toBe(0);
    // Second column starts one step (print width less the overlap) to the right.
    const step = (210 - 20) - 10;
    expect(boxes[1][0]).toBeCloseTo(step, 5);
    // Every tile is the printable area.
    for (const b of boxes) { expect(b[2]).toBeCloseTo(190, 5); expect(b[3]).toBeCloseTo(277, 5); }
  });

  it('prints assembly labels, crop marks and a 50 mm scale rule on every page', () => {
    const html = patternToTiledHtml(big, { title: 'Clamshell' });
    const pages = html.split('<section class="page"').length - 1;
    expect((html.match(/class="rule-bar"/g) ?? []).length).toBe(pages);
    expect((html.match(/class="crop tl"/g) ?? []).length).toBe(pages);
    expect(html).toContain(`${SCALE_RULE_MM} mm — measure this before cutting`);
    expect(html).toContain('Clamshell — row 1 of');
    expect(html).toContain('column 1 of');
    expect(html).toContain('@page { size: 210mm 297mm; margin: 0; }');
  });

  it('a pattern smaller than one page is a single tile', () => {
    const html = patternToTiledHtml({ id: 's', name: 'Small', pieces: [rect('tab', 40, 60)] });
    expect(html.split('<section class="page"').length - 1).toBe(1);
    expect(computeTiles(40, 60, { paperWidthMm: 210, paperHeightMm: 297, marginMm: 10, overlapMm: 10, title: 't', defaultSeamAllowance: 0 })).toHaveLength(1);
  });

  it('escapes the title and passes the seam allowance through to the drawing', () => {
    const html = patternToTiledHtml(big, { title: '<script>x</script>' });
    expect(html).not.toContain('<script>x');
    expect(html).toContain('&lt;script&gt;');
    // A piece with no per-edge allowance picks the default up from the option.
    const finished = rect('panel', 300, 300);
    delete finished.seamAllowances;
    const withSa = patternToTiledHtml({ id: 'a', name: 'A', pieces: [finished] }, { defaultSeamAllowance: 10 });
    expect(withSa).toContain('stroke="#2e7d32"');
    expect(patternToTiledHtml({ id: 'a', name: 'A', pieces: [finished] })).not.toContain('stroke="#2e7d32"');
  });
});
