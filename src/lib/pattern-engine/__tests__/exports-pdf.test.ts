import { describe, it, expect, vi, beforeEach } from 'vitest';

vi.mock('pdf-lib', () => {
  const mockPage = {
    drawLine: vi.fn(),
    drawRectangle: vi.fn(),
    drawText: vi.fn(),
    getSize: vi.fn(() => ({ width: 595.28, height: 841.89 })),
  };
  const mockDoc = {
    addPage: vi.fn(() => mockPage),
    save: vi.fn(() =>
      Promise.resolve(
        new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2d, 0x31, 0x2e, 0x34]),
      ),
    ),
  };
  return {
    PDFDocument: {
      create: vi.fn(() => Promise.resolve(mockDoc)),
    },
    rgb: vi.fn((r: number, g: number, b: number) => ({ r, g, b, type: 'RGB' })),
    degrees: vi.fn((d: number) => d),
    LineCapStyle: { Butt: 0, Round: 1, Projecting: 2 },
  };
});

import { exportPatternToPdf } from '../exports/pdf.js';
import type { Pattern } from '../graph/Pattern.js';

function makePattern(overrides: Partial<Pattern> = {}): Pattern {
  return {
    id: 'test-pattern',
    name: 'Test Pattern',
    pieces: [],
    ...overrides,
  };
}

describe('exportPatternToPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns a Blob', async () => {
    const pattern = makePattern();
    const blob = await exportPatternToPdf(pattern);
    expect(blob).toBeInstanceOf(Blob);
  });

  it('returns a Blob with MIME type application/pdf', async () => {
    const pattern = makePattern();
    const blob = await exportPatternToPdf(pattern);
    expect(blob.type).toBe('application/pdf');
  });

  it('creates one page per piece plus one for empty patterns', async () => {
    const { PDFDocument } = await import('pdf-lib');
    const pattern = makePattern({
      pieces: [
        {
          id: 'p1',
          name: 'Piece 1',
          mirror: false,
          quantity: 1,
          paths: [
            {
              id: 'path1',
              closed: true,
              edges: [
                { kind: 'straight', id: 'p1-e0', role: 'cut', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
                { kind: 'straight', id: 'p1-e1', role: 'cut', start: { x: 100, y: 0 }, end: { x: 100, y: 100 } },
                { kind: 'straight', id: 'p1-e2', role: 'cut', start: { x: 100, y: 100 }, end: { x: 0, y: 0 } },
              ],
            },
          ],
        },
      ],
    });

    await exportPatternToPdf(pattern);
    const mockDoc = await (PDFDocument.create as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    expect(mockDoc.addPage).toHaveBeenCalledTimes(1);
  });

  function squarePiece() {
    return {
      id: 'sq',
      name: 'Square',
      mirror: false,
      quantity: 1,
      paths: [
        {
          id: 'sq-path',
          closed: true,
          edges: [
            { kind: 'straight' as const, id: 'sq-e0', role: 'cut' as const, start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
            { kind: 'straight' as const, id: 'sq-e1', role: 'cut' as const, start: { x: 100, y: 0 }, end: { x: 100, y: 100 } },
            { kind: 'straight' as const, id: 'sq-e2', role: 'cut' as const, start: { x: 100, y: 100 }, end: { x: 0, y: 100 } },
            { kind: 'straight' as const, id: 'sq-e3', role: 'cut' as const, start: { x: 0, y: 100 }, end: { x: 0, y: 0 } },
          ],
        },
      ],
    };
  }

  async function drawLineCalls() {
    const { PDFDocument } = await import('pdf-lib');
    const mockDoc = await (PDFDocument.create as ReturnType<typeof vi.fn>).mock.results[0]?.value;
    const page = mockDoc.addPage.mock.results[0]?.value;
    return page.drawLine.mock.calls as Array<[Record<string, unknown>]>;
  }

  it('draws only the body cut line when defaultSeamAllowance is 0', async () => {
    await exportPatternToPdf(makePattern({ pieces: [squarePiece()] }));
    const calls = await drawLineCalls();
    // 4 body edges + 8 crop mark lines; no dashed SA lines.
    expect(calls.filter((c) => c[0].dashArray !== undefined)).toHaveLength(0);
  });

  it('draws a dashed SA-offset cut line distinct from the body line', async () => {
    await exportPatternToPdf(makePattern({ pieces: [squarePiece()] }), { defaultSeamAllowance: 10 });
    const calls = await drawLineCalls();
    const saLines = calls.filter((c) => c[0].dashArray !== undefined);
    // Square offset by 10 mm is still a 4-vertex polygon.
    expect(saLines).toHaveLength(4);
    const bodyLines = calls.filter((c) => c[0].dashArray === undefined && c[0].thickness === 0.5);
    expect(bodyLines).toHaveLength(4);
    // SA line is styled differently (thinner) so it reads as the outer cut line.
    expect(saLines[0][0].thickness).not.toBe(bodyLines[0][0].thickness);
  });

  it('offsets the body so the SA outer line stays inside the page margin', async () => {
    const MM_TO_PT = 72 / 25.4;
    await exportPatternToPdf(makePattern({ pieces: [squarePiece()] }), { marginMm: 15, defaultSeamAllowance: 10 });
    const calls = await drawLineCalls();
    const saLines = calls.filter((c) => c[0].dashArray !== undefined);
    const minX = Math.min(...saLines.map((c) => (c[0].start as { x: number }).x));
    // SA outer line's left edge sits at the margin (15 mm), body at 25 mm.
    expect(minX).toBeCloseTo(15 * MM_TO_PT, 3);
    const bodyLines = calls.filter((c) => c[0].dashArray === undefined && c[0].thickness === 0.5);
    const bodyMinX = Math.min(...bodyLines.map((c) => (c[0].start as { x: number }).x));
    expect(bodyMinX).toBeCloseTo(25 * MM_TO_PT, 3);
  });

  it('handles empty pattern without error', async () => {
    const pattern = makePattern({ pieces: [] });
    await expect(exportPatternToPdf(pattern)).resolves.toBeInstanceOf(Blob);
  });

  it('handles a piece with arc edges', async () => {
    const pattern = makePattern({
      pieces: [
        {
          id: 'arc-piece',
          name: 'Arc Piece',
          mirror: false,
          quantity: 1,
          paths: [
            {
              id: 'arc-path',
              closed: false,
              edges: [
                {
                  kind: 'arc',
                  id: 'arc-e0',
                  role: 'cut',
                  start: { x: 10, y: 0 },
                  end: { x: -10, y: 0 },
                  center: { x: 0, y: 0 },
                  radius: 10,
                  clockwise: false,
                },
              ],
            },
          ],
        },
      ],
    });

    await expect(exportPatternToPdf(pattern)).resolves.toBeInstanceOf(Blob);
  });

  it('handles a piece with bezier edges', async () => {
    const pattern = makePattern({
      pieces: [
        {
          id: 'bezier-piece',
          name: 'Bezier Piece',
          mirror: false,
          quantity: 1,
          paths: [
            {
              id: 'bezier-path',
              closed: false,
              edges: [
                {
                  kind: 'bezier',
                  id: 'bez-e0',
                  role: 'cut',
                  start: { x: 0, y: 0 },
                  end: { x: 100, y: 100 },
                  cp1: { x: 0, y: 50 },
                  cp2: { x: 50, y: 100 },
                },
              ],
            },
          ],
        },
      ],
    });

    await expect(exportPatternToPdf(pattern)).resolves.toBeInstanceOf(Blob);
  });
});
