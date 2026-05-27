// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildDrainage, GROMMET_EXPOSURE_WARNING } from '../components/drainage.js';
import type { Piece } from '../../pattern-engine/graph/Piece.js';
import type { StraightEdge } from '../../pattern-engine/graph/Edge.js';
import type { DrainageStyle } from '../components/drainage.js';

// ─── Fixtures ─────────────────────────────────────────────────────────────────

function makeSE(id: string, sx: number, sy: number, ex: number, ey: number): StraightEdge {
  return { kind: 'straight', id, role: 'stitch', start: { x: sx, y: sy }, end: { x: ex, y: ey } };
}

function makeBodyPiece(id = 'body'): Piece {
  return {
    id,
    name: 'Body',
    mirror: false,
    quantity: 1,
    paths: [
      {
        id: `${id}-outline`,
        closed: true,
        edges: [
          makeSE(`${id}-top`, 0, 0, 100, 0),
          makeSE(`${id}-right`, 100, 0, 100, 150),
          makeSE(`${id}-bottom`, 100, 150, 0, 150),
          makeSE(`${id}-left`, 0, 150, 0, 0),
        ],
      },
    ],
    annotations: [],
  };
}

// ─── open_corner ──────────────────────────────────────────────────────────────

describe('buildDrainage open_corner', () => {
  it('adds a notched-corner annotation to the body piece', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({ style: 'open_corner', bodyPiece: body });
    expect(result.piecePatches.annotations?.length).toBeGreaterThan(0);
    const labels = result.piecePatches.annotations!.map((a) =>
      (a.label ?? '').toLowerCase(),
    );
    const hasNotchLabel = labels.some(
      (l) => l.includes('notch') || l.includes('corner') || l.includes('drainage'),
    );
    expect(hasNotchLabel).toBe(true);
  });

  it('does not add a new piece (only patches body)', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({ style: 'open_corner', bodyPiece: body });
    expect(result.piecePatches.id).toBe(body.id);
  });

  it('emits at least one drainage step', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({ style: 'open_corner', bodyPiece: body });
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('emits no warnings for open_corner', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({ style: 'open_corner', bodyPiece: body });
    expect(result.warnings).toHaveLength(0);
  });
});

// ─── sewn_closed ──────────────────────────────────────────────────────────────

describe('buildDrainage sewn_closed', () => {
  it('returns the body piece unmodified (no new annotations)', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({ style: 'sewn_closed', bodyPiece: body });
    expect(result.piecePatches.id).toBe(body.id);
    expect(result.piecePatches.annotations).toEqual(body.annotations);
  });

  it('emits the topstitch step', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({ style: 'sewn_closed', bodyPiece: body });
    expect(result.steps.length).toBeGreaterThan(0);
    const bodyTexts = result.steps.map((s) => s.body.toLowerCase());
    const hasTopstitch = bodyTexts.some(
      (b) => b.includes('topstitch') || b.includes('closed'),
    );
    expect(hasTopstitch).toBe(true);
  });

  it('topstitch step mentions 6 mm seam allowance', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({ style: 'sewn_closed', bodyPiece: body });
    const allText = result.steps.map((s) => s.body).join(' ').toLowerCase();
    expect(allText.includes('6 mm')).toBe(true);
  });

  it('emits no warnings for sewn_closed', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({ style: 'sewn_closed', bodyPiece: body });
    expect(result.warnings).toHaveLength(0);
  });
});

// ─── grommet ──────────────────────────────────────────────────────────────────

describe('buildDrainage grommet', () => {
  it('adds a grommet annotation at the bottom of the body piece', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({ style: 'grommet', bodyPiece: body });
    expect(result.piecePatches.annotations?.length).toBeGreaterThan(0);
    const labels = result.piecePatches.annotations!.map((a) =>
      (a.label ?? '').toLowerCase(),
    );
    const hasGrommetLabel = labels.some(
      (l) => l.includes('grommet') || l.includes('bottom-center'),
    );
    expect(hasGrommetLabel).toBe(true);
  });

  it('emits a grommet installation step', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({ style: 'grommet', bodyPiece: body });
    expect(result.steps.length).toBeGreaterThan(0);
    const bodyTexts = result.steps.map((s) => s.body.toLowerCase());
    expect(bodyTexts.some((b) => b.includes('grommet'))).toBe(true);
  });

  it('defaults to #0 grommet size when not specified', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({ style: 'grommet', bodyPiece: body });
    const allAnnotationText = (result.piecePatches.annotations ?? [])
      .map((a) => a.label ?? '')
      .join(' ');
    expect(allAnnotationText.includes('#0')).toBe(true);
  });

  it('uses #00 when specified', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({
      style: 'grommet',
      bodyPiece: body,
      grommetSize: '#00',
    });
    const allAnnotationText = (result.piecePatches.annotations ?? [])
      .map((a) => a.label ?? '')
      .join(' ');
    expect(allAnnotationText.includes('#00')).toBe(true);
  });

  // ── Exposure warning (M11) ──────────────────────────────────────────────────

  it('[M11] emits GROMMET_EXPOSURE_WARNING when exposed_percentage > 0.85', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({
      style: 'grommet',
      bodyPiece: body,
      exposed_percentage: 0.9,
    });
    expect(result.warnings.length).toBeGreaterThan(0);
    const found = result.warnings.some((w) =>
      w.includes('insufficient retention fabric'),
    );
    expect(found).toBe(true);
  });

  it('[M11] warning text references insufficient retention fabric', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({
      style: 'grommet',
      bodyPiece: body,
      exposed_percentage: 0.9,
    });
    expect(result.warnings.join(' ')).toContain('insufficient retention fabric');
  });

  it('[M11] ABSENCE of warning when exposed_percentage <= 0.85', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({
      style: 'grommet',
      bodyPiece: body,
      exposed_percentage: 0.7,
    });
    expect(result.warnings).toHaveLength(0);
  });

  it('[M11] exactly at threshold 0.85 does NOT emit warning', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({
      style: 'grommet',
      bodyPiece: body,
      exposed_percentage: 0.85,
    });
    expect(result.warnings).toHaveLength(0);
  });

  it('[M11] GROMMET_EXPOSURE_WARNING export matches expected copy', () => {
    expect(GROMMET_EXPOSURE_WARNING).toContain('insufficient retention fabric');
  });

  it('no warning when exposed_percentage is absent', () => {
    const body = makeBodyPiece();
    const result = buildDrainage({ style: 'grommet', bodyPiece: body });
    expect(result.warnings).toHaveLength(0);
  });
});

// ─── All style combinations compile and return the right shape ────────────────

describe('buildDrainage return shape', () => {
  const styles: DrainageStyle[] = ['open_corner', 'sewn_closed', 'grommet'];

  for (const style of styles) {
    it(`${style} returns { piecePatches, steps, warnings }`, () => {
      const body = makeBodyPiece();
      const result = buildDrainage({ style, bodyPiece: body });
      expect(result.piecePatches).toBeDefined();
      expect(Array.isArray(result.steps)).toBe(true);
      expect(Array.isArray(result.warnings)).toBe(true);
    });
  }
});
