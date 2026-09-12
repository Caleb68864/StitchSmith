import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { validateSeams, clothSpacingFor, hasNonFinite, CLOTH_VERTEX_BUDGET } from '../viewer/validate.js';
import { ViewerErrorBoundary } from '../viewer/ViewerErrorBoundary.js';
import { ViewerLegend } from '../viewer/Legend.js';
import { FoldPreview3D } from '../FoldPreview3D.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';

function rect(id: string, w: number, h: number): Piece {
  return { id, name: id, mirror: false, quantity: 1, paths: [{ id: `${id}-o`, closed: true, edges: [
    { kind: 'straight', id: `${id}-0`, role: 'cut', start: { x: 0, y: 0 }, end: { x: w, y: 0 } },
    { kind: 'straight', id: `${id}-1`, role: 'cut', start: { x: w, y: 0 }, end: { x: w, y: h } },
    { kind: 'straight', id: `${id}-2`, role: 'cut', start: { x: w, y: h }, end: { x: 0, y: h } },
    { kind: 'straight', id: `${id}-3`, role: 'cut', start: { x: 0, y: h }, end: { x: 0, y: 0 } },
  ] }] };
}

describe('viewer guards', () => {
  it('validateSeams drops seams on missing pieces, zero-length and non-finite seams, keeps the rest', () => {
    const line = (pieceId: string, x0: number, y0: number, x1: number, y1: number) => ({ pieceId, from: { x: x0, y: y0 }, to: { x: x1, y: y1 } });
    const r = validateSeams([
      { label: 'good', a: line('a', 0, 0, 0, 100), b: line('b', 0, 0, 0, 100) },
      { label: 'ghost', a: line('a', 0, 0, 0, 100), b: line('zzz', 0, 0, 0, 100) },
      { label: 'dot', a: line('a', 5, 5, 5, 5), b: line('b', 5, 5, 5, 5) },
      { a: line('a', 0, 0, NaN, 100), b: line('b', 0, 0, 0, 100) },
    ], ['a', 'b']);
    expect(r.seams.map((s) => s.label)).toEqual(['good']);
    expect(r.skipped).toEqual(['ghost: piece "zzz" is not in the scene', 'dot: zero length', 'seam 4: non-finite coordinates']);
  });
  it('clothSpacingFor keeps 8 mm for a pouch and coarsens a huge pattern to the vertex budget', () => {
    expect(clothSpacingFor([rect('a', 200, 150)])).toEqual({ spacing: 8, capped: false, estimate: 200 * 150 / 64 });
    const huge = clothSpacingFor([rect('a', 3000, 3000), rect('b', 3000, 3000)]);
    expect(huge.capped).toBe(true);
    expect(huge.spacing).toBeGreaterThan(8);
    expect((2 * 3000 * 3000) / (huge.spacing * huge.spacing)).toBeLessThanOrEqual(CLOTH_VERTEX_BUDGET);
  });
  it('hasNonFinite catches NaN and Infinity anywhere in the buffer', () => {
    expect(hasNonFinite(new Float64Array([0, 1, 2]))).toBe(false);
    expect(hasNonFinite(new Float64Array([0, NaN, 2]))).toBe(true);
    expect(hasNonFinite([0, 1, Infinity])).toBe(true);
  });
});

describe('ViewerErrorBoundary', () => {
  it('shows "3D check failed" with the reason and retries on demand', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {});
    let boom = true;
    function Bad() { if (boom) throw new Error('gusset too short'); return <p>fine now</p>; }
    render(<ViewerErrorBoundary><Bad /></ViewerErrorBoundary>);
    expect(screen.getByTestId('viewer-error').textContent).toContain('3D check failed: gusset too short');
    boom = false;
    fireEvent.click(screen.getByRole('button', { name: /try again/i }));
    expect(screen.getByText('fine now')).toBeTruthy();
    spy.mockRestore();
  });
});

describe('ViewerLegend', () => {
  it('lists swatches, open for a few pieces and collapsed past eight', () => {
    const few = render(<ViewerLegend entries={[{ id: 'a', name: 'Body', color: 0x4f7cac }]} />);
    expect((few.getByTestId('viewer-legend') as HTMLDetailsElement).open).toBe(true);
    expect(few.getByText('Body')).toBeTruthy();
    few.unmount();
    const many = render(<ViewerLegend entries={Array.from({ length: 9 }, (_, i) => ({ id: `p${i}`, name: `Piece ${i}`, color: i }))} />);
    expect((many.getByTestId('viewer-legend') as HTMLDetailsElement).open).toBe(false);
  });
});

describe('FoldPreview3D without WebGL', () => {
  it('says so and never mounts the viewer when getContext returns null, across repeated mounts', async () => {
    const orig = HTMLCanvasElement.prototype.getContext;
    HTMLCanvasElement.prototype.getContext = (() => null) as unknown as typeof orig;
    try {
      for (let i = 0; i < 20; i++) {
        const r = render(<FoldPreview3D pattern={{ id: 'p', name: 'p', pieces: [rect('a', 100, 100)] }} />);
        await screen.findByText(/needs WebGL/i);
        r.unmount();
      }
    } finally {
      HTMLCanvasElement.prototype.getContext = orig;
    }
  });
});
