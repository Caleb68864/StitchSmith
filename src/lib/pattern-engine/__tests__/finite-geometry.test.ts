import { describe, it, expect } from 'vitest';
import { assertFinitePattern } from '../graph/validate.js';
import { patternToSvg } from '../exports/svg.js';
import { exportPatternToDxf } from '../exports/dxf.js';
import { exportPatternToPdf } from '../exports/pdf.js';
import { patternToTiledHtml } from '../exports/tiledHtml.js';
import type { Pattern } from '../graph/Pattern.js';
import type { Piece } from '../graph/Piece.js';

function rect(id: string, w: number, h: number): Piece {
  return {
    id,
    name: id,
    quantity: 1,
    paths: [
      {
        id: `${id}:cut`,
        closed: true,
        edges: [
          { kind: 'straight', id: `${id}:e0`, role: 'cut', start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
          { kind: 'straight', id: `${id}:e1`, role: 'cut', start: { x: w, y: 0 }, end: { x: w, y: h } },
          { kind: 'straight', id: `${id}:e2`, role: 'cut', start: { x: w, y: h }, end: { x: 0, y: h } },
          { kind: 'straight', id: `${id}:e3`, role: 'cut', start: { x: 0, y: h }, end: { x: 0, y: 0 } },
        ],
      },
    ],
  } as Piece;
}

function pattern(...pieces: Piece[]): Pattern {
  return { id: 'p', name: 'Probe', pieces };
}

describe('assertFinitePattern', () => {
  it('accepts a well-formed pattern', () => {
    expect(() => assertFinitePattern(pattern(rect('a', 10, 10)))).not.toThrow();
  });

  it('names the piece and edge when a straight edge has a NaN coordinate', () => {
    const bad = rect('body', NaN, 10);
    expect(() => assertFinitePattern(pattern(bad))).toThrow(/body.*body:e0|body:e0.*body/);
  });

  it('rejects an infinite arc radius', () => {
    const p = rect('a', 10, 10);
    p.paths[0].edges[0] = {
      kind: 'arc', id: 'a:arc', role: 'cut',
      start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, center: { x: 5, y: 0 }, radius: Infinity, clockwise: false,
    };
    expect(() => assertFinitePattern(pattern(p))).toThrow(/a:arc/);
  });

  it('rejects a non-finite bezier control point', () => {
    const p = rect('a', 10, 10);
    p.paths[0].edges[0] = {
      kind: 'bezier', id: 'a:bz', role: 'cut',
      start: { x: 0, y: 0 }, end: { x: 10, y: 0 }, cp1: { x: NaN, y: 0 }, cp2: { x: 5, y: 0 },
    };
    expect(() => assertFinitePattern(pattern(p))).toThrow(/a:bz/);
  });

  it('rejects a non-finite per-edge seam allowance', () => {
    const p = rect('a', 10, 10);
    p.seamAllowances = { 'a:e0': Infinity };
    expect(() => assertFinitePattern(pattern(p))).toThrow(/a:e0/);
  });
});

describe('exporters refuse non-finite geometry instead of emitting NaN', () => {
  const bad = pattern(rect('body', NaN, 10));

  it('patternToSvg throws', () => {
    expect(() => patternToSvg(bad)).toThrow(/non-finite/);
  });

  it('exportPatternToDxf throws', () => {
    expect(() => exportPatternToDxf(bad)).toThrow(/non-finite/);
  });

  it('exportPatternToPdf rejects', async () => {
    await expect(exportPatternToPdf(bad)).rejects.toThrow(/non-finite/);
  });

  it('patternToTiledHtml throws', () => {
    expect(() => patternToTiledHtml(bad)).toThrow(/non-finite/);
  });

  it('a finite pattern still exports an SVG with numeric dimensions', () => {
    const svg = patternToSvg(pattern(rect('a', 100, 50)));
    expect(svg).not.toMatch(/NaN|Infinity/);
    expect(svg).toMatch(/width="\d/);
  });
});
