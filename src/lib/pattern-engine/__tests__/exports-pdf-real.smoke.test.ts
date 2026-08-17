import { describe, it, expect } from 'vitest';
import { exportPatternToPdf } from '../exports/pdf.js';
import type { Pattern } from '../graph/Pattern.js';

// Uses the real pdf-lib (no mock) to make sure the SA drawing options
// (dashArray, colors) are accepted at runtime and produce a larger document.
describe('exportPatternToPdf (real pdf-lib smoke)', () => {
  const pattern: Pattern = {
    id: 'smoke',
    name: 'Smoke',
    pieces: [
      {
        id: 'sq',
        name: 'Square',
        mirror: false,
        quantity: 1,
        paths: [
          {
            id: 'sq-path',
            closed: true,
            edges: [
              { kind: 'straight', id: 'e0', role: 'cut', start: { x: 0, y: 0 }, end: { x: 100, y: 0 } },
              { kind: 'straight', id: 'e1', role: 'cut', start: { x: 100, y: 0 }, end: { x: 100, y: 100 } },
              { kind: 'straight', id: 'e2', role: 'cut', start: { x: 100, y: 100 }, end: { x: 0, y: 100 } },
              { kind: 'straight', id: 'e3', role: 'cut', start: { x: 0, y: 100 }, end: { x: 0, y: 0 } },
            ],
          },
        ],
      },
    ],
  };

  it('produces a valid PDF with and without SA', async () => {
    const noSa = await exportPatternToPdf(pattern);
    const withSa = await exportPatternToPdf(pattern, { defaultSeamAllowance: 10 });
    // jsdom's Blob lacks arrayBuffer(); the type + size delta is enough here.
    expect(withSa.type).toBe('application/pdf');
    expect(withSa.size).toBeGreaterThan(noSa.size);
  });
});
