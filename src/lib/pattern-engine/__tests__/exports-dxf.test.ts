import { describe, it, expect } from 'vitest';
import { exportPatternToDxf } from '../exports/dxf.js';
import type { Pattern } from '../graph/Pattern.js';

function makeEmptyPattern(): Pattern {
  return {
    id: 'dxf-test',
    name: 'DXF Test Pattern',
    pieces: [],
  };
}

function makePatternWithPieces(): Pattern {
  return {
    id: 'dxf-full',
    name: 'DXF Full Pattern',
    pieces: [
      {
        id: 'piece-alpha',
        name: 'Piece Alpha',
        mirror: false,
        quantity: 1,
        paths: [
          {
            id: 'straight-path',
            closed: true,
            edges: [
              { kind: 'straight', id: 'sp-e0', role: 'cut', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
              { kind: 'straight', id: 'sp-e1', role: 'cut', start: { x: 100, y: 0 }, end: { x: 100, y: 50 } },
              { kind: 'straight', id: 'sp-e2', role: 'cut', start: { x: 100, y: 50 }, end: { x: 0, y: 0 } },
            ],
          },
        ],
      },
      {
        id: 'piece-beta',
        name: 'Piece Beta',
        mirror: false,
        quantity: 2,
        paths: [
          {
            id: 'arc-path',
            closed: false,
            edges: [
              {
                kind: 'arc',
                id: 'ap-e0',
                role: 'cut',
                start: { x: 10, y: 0 },
                end: { x: -10, y: 0 },
                center: { x: 0, y: 0 },
                radius: 10,
                clockwise: false,
              },
            ],
          },
          {
            id: 'bezier-path',
            closed: false,
            edges: [
              {
                kind: 'bezier',
                id: 'bp-e0',
                role: 'cut',
                start: { x: 0, y: 0 },
                end: { x: 50, y: 50 },
                cp1: { x: 0, y: 25 },
                cp2: { x: 25, y: 50 },
              },
            ],
          },
        ],
      },
    ],
  };
}

describe('exportPatternToDxf', () => {
  it('starts with 0\\nSECTION\\n2\\nHEADER', () => {
    const dxf = exportPatternToDxf(makeEmptyPattern());
    expect(dxf).toMatch(/^0\nSECTION\n2\nHEADER/);
  });

  it('ends with 0\\nEOF', () => {
    const dxf = exportPatternToDxf(makeEmptyPattern());
    expect(dxf).toMatch(/0\nEOF$/);
  });

  it('returns a string', () => {
    const dxf = exportPatternToDxf(makeEmptyPattern());
    expect(typeof dxf).toBe('string');
  });

  it('contains ENTITIES section', () => {
    const dxf = exportPatternToDxf(makePatternWithPieces());
    expect(dxf).toContain('0\nSECTION\n2\nENTITIES');
    expect(dxf).toContain('0\nENDSEC');
  });

  it('produces LINE entities for straight edges', () => {
    const dxf = exportPatternToDxf(makePatternWithPieces());
    expect(dxf).toContain('0\nLINE');
  });

  it('produces ARC entities for arc edges with group code 0=ARC', () => {
    const dxf = exportPatternToDxf(makePatternWithPieces());
    expect(dxf).toContain('0\nARC');
  });

  it('produces LWPOLYLINE entities for bezier edges', () => {
    const dxf = exportPatternToDxf(makePatternWithPieces());
    expect(dxf).toContain('0\nLWPOLYLINE');
  });

  it('uses piece id as layer name in LINE entities', () => {
    const dxf = exportPatternToDxf(makePatternWithPieces());
    expect(dxf).toContain('8\npiece-alpha');
  });

  it('uses piece id as layer name in ARC entities', () => {
    const dxf = exportPatternToDxf(makePatternWithPieces());
    expect(dxf).toContain('8\npiece-beta');
  });

  it('includes LAYER table entries for each piece', () => {
    const dxf = exportPatternToDxf(makePatternWithPieces());
    expect(dxf).toContain('2\npiece-alpha');
    expect(dxf).toContain('2\npiece-beta');
  });

  it('handles empty pattern (no pieces)', () => {
    const dxf = exportPatternToDxf(makeEmptyPattern());
    expect(dxf).toMatch(/^0\nSECTION\n2\nHEADER/);
    expect(dxf).toMatch(/0\nEOF$/);
  });

  it('ARC has center coordinates (group code 10, 20)', () => {
    const dxf = exportPatternToDxf(makePatternWithPieces());
    const arcIdx = dxf.indexOf('0\nARC');
    expect(arcIdx).toBeGreaterThan(-1);
    const arcSection = dxf.slice(arcIdx, arcIdx + 200);
    expect(arcSection).toContain('10\n0');
    expect(arcSection).toContain('20\n0');
  });

  it('ARC has radius (group code 40)', () => {
    const dxf = exportPatternToDxf(makePatternWithPieces());
    const arcIdx = dxf.indexOf('0\nARC');
    const arcSection = dxf.slice(arcIdx, arcIdx + 200);
    expect(arcSection).toContain('40\n10');
  });

  it('LWPOLYLINE has configurable segment count', () => {
    const dxf16 = exportPatternToDxf(makePatternWithPieces(), { bezierSegments: 16 });
    const dxf32 = exportPatternToDxf(makePatternWithPieces(), { bezierSegments: 32 });
    // 16 segments → 17 vertices, 32 segments → 33 vertices
    expect(dxf16).toContain('90\n17');
    expect(dxf32).toContain('90\n33');
  });

  it('handles clockwise arc by swapping start/end angles in DXF', () => {
    const pattern: Pattern = {
      id: 'cw-test',
      name: 'CW Arc Test',
      pieces: [
        {
          id: 'cw-piece',
          name: 'CW Piece',
          mirror: false,
          quantity: 1,
          paths: [
            {
              id: 'cw-path',
              closed: false,
              edges: [
                {
                  kind: 'arc',
                  id: 'cw-e0',
                  role: 'cut',
                  start: { x: 10, y: 0 },
                  end: { x: -10, y: 0 },
                  center: { x: 0, y: 0 },
                  radius: 10,
                  clockwise: true,
                },
              ],
            },
          ],
        },
      ],
    };
    const dxf = exportPatternToDxf(pattern);
    expect(dxf).toContain('0\nARC');
  });
});
