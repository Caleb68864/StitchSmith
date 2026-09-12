import { describe, it, expect } from 'vitest';
import { patternToSvg } from '../exports/svg.js';
import type { Pattern } from '../graph/Pattern.js';
import type { Piece } from '../graph/Piece.js';

function makeSquarePiece(size: number): Piece {
  return {
    id: 'square',
    name: 'Square Piece',
    mirror: false,
    quantity: 1,
    paths: [
      {
        id: 'cut',
        closed: true,
        edges: [
          { kind: 'straight', id: 'sq-e0', role: 'cut', start: { x: 0, y: 0 }, end: { x: size, y: 0 } },
          { kind: 'straight', id: 'sq-e1', role: 'cut', start: { x: size, y: 0 }, end: { x: size, y: size } },
          { kind: 'straight', id: 'sq-e2', role: 'cut', start: { x: size, y: size }, end: { x: 0, y: size } },
          { kind: 'straight', id: 'sq-e3', role: 'cut', start: { x: 0, y: size }, end: { x: 0, y: 0 } },
        ],
      },
    ],
  };
}

const squarePattern: Pattern = {
  id: 'test',
  name: 'Test Pattern',
  pieces: [makeSquarePiece(100)],
};

describe('patternToSvg', () => {
  it('returns a string starting with <svg', () => {
    const svg = patternToSvg(squarePattern);
    expect(svg).toMatch(/^<svg /);
  });

  it('contains xmlns="http://www.w3.org/2000/svg"', () => {
    const svg = patternToSvg(squarePattern);
    expect(svg).toContain('xmlns="http://www.w3.org/2000/svg"');
  });

  it('contains <path elements for cut edges', () => {
    const svg = patternToSvg(squarePattern);
    expect(svg).toContain('<path');
  });

  it('contains M and L commands in path data for straight edges', () => {
    const svg = patternToSvg(squarePattern);
    // straight edges produce M x y L x y sequences
    expect(svg).toMatch(/d="[^"]*M \d/);
    expect(svg).toMatch(/d="[^"]*L \d/);
  });

  it('dimensions in viewBox reflect the piece bbox in mm', () => {
    const svg = patternToSvg(squarePattern, { margin: 0, pieceGap: 0 });
    // piece is 100mm wide; with margin=0, viewBox width should be at least 100
    const vbMatch = svg.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/);
    expect(vbMatch).not.toBeNull();
    if (!vbMatch) return;
    const w = parseFloat(vbMatch[1]);
    const h = parseFloat(vbMatch[2]);
    expect(w).toBeGreaterThanOrEqual(100);
    expect(h).toBeGreaterThanOrEqual(100);
  });

  it('includes the pattern name in a <title> element', () => {
    const svg = patternToSvg(squarePattern);
    expect(svg).toContain('<title>Test Pattern</title>');
  });

  it('handles empty pattern gracefully', () => {
    const empty: Pattern = { id: 'e', name: 'Empty', pieces: [] };
    const svg = patternToSvg(empty);
    expect(svg).toContain('<svg');
  });

  it('renders an SA outer cut line when defaultSeamAllowance > 0', () => {
    const svg = patternToSvg(squarePattern, { defaultSeamAllowance: 10 });
    expect(svg).toContain('stroke="#2e7d32"');
    expect(svg).toContain('stroke-dasharray="3,2"');
  });

  it('omits SA line when defaultSeamAllowance is 0 and no per-edge SA', () => {
    const svg = patternToSvg(squarePattern, { defaultSeamAllowance: 0 });
    expect(svg).not.toContain('stroke="#2e7d32"');
  });

  it('honors per-edge SA from Piece.seamAllowances even without default', () => {
    const piece = makeSquarePiece(100);
    piece.seamAllowances = { 'sq-e0': 5, 'sq-e1': 10, 'sq-e2': 10, 'sq-e3': 10 };
    const pattern: Pattern = { id: 't', name: 'T', pieces: [piece] };
    const svg = patternToSvg(pattern);
    expect(svg).toContain('stroke="#2e7d32"');
  });
});

describe('patternToSvg layout and annotations', () => {
  it('wraps pieces into rows at maxRowWidth and grows the height', () => {
    const pieces = Array.from({ length: 6 }, (_, i) => ({ ...makeSquarePiece(100), id: `sq${i}` }));
    const one = patternToSvg({ id: 'r', name: 'R', pieces }, { maxRowWidth: Infinity, margin: 0, pieceGap: 0 });
    const wrapped = patternToSvg({ id: 'r', name: 'R', pieces }, { maxRowWidth: 250, margin: 0, pieceGap: 0 });
    const vb = (s: string) => s.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!.slice(1, 3).map(Number);
    expect(vb(one)).toEqual([600, 100]);
    expect(vb(wrapped)).toEqual([200, 300]);
    expect(wrapped).toContain('translate(0,100)');
  });
  it('draws grain arrows, notch ticks and wrapped note text from annotations', () => {
    const piece = makeSquarePiece(100);
    piece.annotations = [
      { kind: 'grain', label: 'grain', point: { x: 50, y: 50 }, angle: 90 },
      { kind: 'notch', point: { x: 10, y: 0 } },
      { kind: 'label', label: 'A long note that should be wrapped onto more than one line of small text under the piece label so it stays legible', point: { x: 50, y: 50 } },
    ];
    const svg = patternToSvg({ id: 'a', name: 'A', pieces: [piece] });
    expect(svg).toContain('class="grain"');
    expect(svg).toContain('class="notch"');
    expect((svg.match(/<tspan/g) ?? []).length).toBeGreaterThan(3);
    expect(patternToSvg({ id: 'a', name: 'A', pieces: [piece] }, { showAnnotations: false })).not.toContain('class="grain"');
  });
});

describe('patternToSvg label placement', () => {
  it('wraps a long path label inside the piece and keeps it clear of the piece name', () => {
    const piece = makeSquarePiece(100);
    piece.paths.push({
      id: 'hem', closed: false,
      label: 'Hook strips 1.5 by 4.5 inches, two across with a half inch gap, on the outside of the back half, sewn before any fold, running across the width',
      edges: [{ kind: 'straight', id: 'hem-e', role: 'fold', start: { x: 0, y: 10 }, end: { x: 100, y: 10 } }],
    });
    const svg = patternToSvg({ id: 'l', name: 'L', pieces: [piece] }, { margin: 0, pieceGap: 0 });
    const xs = [...svg.matchAll(/<tspan x="([\d.-]+)"/g)].map((m) => Number(m[1]));
    // Nothing anchors outside the 100 mm piece.
    expect(Math.min(...xs)).toBeGreaterThanOrEqual(0);
    expect(Math.max(...xs)).toBeLessThanOrEqual(100);
    // The label is broken across lines rather than run on as one long string.
    const labelText = svg.slice(svg.indexOf('Hook strips'));
    expect((labelText.match(/<tspan/g) ?? []).length).toBeGreaterThan(1);
  });

  it('names every copy of a multi-quantity piece but repeats the note only once', () => {
    const piece = makeSquarePiece(50);
    piece.name = 'Hook strip';
    piece.quantity = 3;
    piece.annotations = [{ kind: 'label', label: 'Cut three, trim after sewing', point: { x: 25, y: 25 } }];
    const svg = patternToSvg({ id: 'q', name: 'Q', pieces: [piece] });
    expect((svg.match(/Hook strip/g) ?? []).length).toBe(3);
    expect((svg.match(/Cut three/g) ?? []).length).toBe(1);
  });
});
