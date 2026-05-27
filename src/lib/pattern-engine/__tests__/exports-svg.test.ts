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
