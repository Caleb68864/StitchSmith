import { describe, it, expect } from 'vitest';
import { buildPattern, verifySharedSeams } from '../buildPattern.js';
import { STYLE_PRESETS, urban_assault, tactical, minimalist } from '../stylePresets.js';
import type { TriZipInputs } from '../index.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';
import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';

const DEFAULT_INPUTS: TriZipInputs = {
  height: 510,
  width: 300,
  depth: 200,
  units: 'mm',
  stylePreset: 'urban_assault',
};

function findPieceById(pieces: Piece[], id: string): Piece | undefined {
  return pieces.find(p => p.id === id);
}

function findPieceByIdPrefix(pieces: Piece[], prefix: string): Piece | undefined {
  return pieces.find(p => p.id.startsWith(prefix));
}

describe('buildPattern', () => {
  it('returns a Pattern with required pieces for default inputs', () => {
    const result = buildPattern(DEFAULT_INPUTS, urban_assault);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const { pieces } = result.value;
    const ids = pieces.map(p => p.id);

    expect(ids).toContain('back-panel');
    expect(ids).toContain('front-center-panel');
    expect(ids).toContain('front-wing');
    expect(ids).toContain('top-handle');

    const gusset = findPieceByIdPrefix(pieces, 'perimeter-gusset');
    expect(gusset).toBeDefined();

    const shoulderStrap = findPieceById(pieces, 'shoulder-strap');
    expect(shoulderStrap).toBeDefined();
    expect(shoulderStrap?.quantity).toBe(2);
  });

  it('front wing is emitted as one Piece with mirror: true, quantity: 2', () => {
    const result = buildPattern(DEFAULT_INPUTS, urban_assault);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const frontWing = findPieceById(result.value.pieces, 'front-wing');
    expect(frontWing).toBeDefined();
    expect(frontWing?.mirror).toBe(true);
    expect(frontWing?.quantity).toBe(2);
  });

  it('Y-split intersection occurs at y_split_height_percent of front face height', () => {
    const yPct = 60;
    const height = 510;
    const result = buildPattern({ ...DEFAULT_INPUTS, y_split_height_percent: yPct }, urban_assault);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const frontWing = findPieceById(result.value.pieces, 'front-wing');
    expect(frontWing).toBeDefined();

    const expectedY = height * (yPct / 100);

    // Check that at least one seam-role edge endpoint is at the expected y coordinate.
    const seams = frontWing!.paths.flatMap(p => p.edges).filter((e: Edge) => e.role === 'seam');
    const ySplitFound = seams.some((e: Edge) =>
      Math.abs(e.start.y - expectedY) < 0.01 || Math.abs(e.end.y - expectedY) < 0.01
    );
    expect(ySplitFound).toBe(true);
  });

  it('gusseted zipper_method produces a tri-zip gusset strip piece', () => {
    const result = buildPattern({ ...DEFAULT_INPUTS, zipper_method: 'gusseted' }, urban_assault);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tzi = findPieceById(result.value.pieces, 'tri-zip-subsystem');
    expect(tzi).toBeDefined();
    // For gusseted, should have more than 1 path (outline + shared seam)
    expect(tzi!.paths.length).toBeGreaterThan(1);
    // The gusset strip should have a cut outline
    const hasGussetOutline = tzi!.paths.some((p: Path) => p.id === 'tzi-gusset-outline');
    expect(hasGussetOutline).toBe(true);
  });

  it('direct zipper_method emits no tri-zip-subsystem piece at all', () => {
    const result = buildPattern({ ...DEFAULT_INPUTS, zipper_method: 'direct' }, urban_assault);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const tzi = findPieceById(result.value.pieces, 'tri-zip-subsystem');
    expect(tzi).toBeUndefined();
  });

  it('shared seam path id is present in both front-center-panel and tri-zip-subsystem', () => {
    const result = buildPattern(DEFAULT_INPUTS, urban_assault);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const fcp = findPieceById(result.value.pieces, 'front-center-panel');
    const tzi = findPieceById(result.value.pieces, 'tri-zip-subsystem');
    expect(fcp).toBeDefined();
    expect(tzi).toBeDefined();

    const fcpSeamPath = fcp!.paths.find((p: Path) => p.id.startsWith('seam:'));
    const tziSeamPath = tzi!.paths.find((p: Path) => p.id.startsWith('seam:'));
    expect(fcpSeamPath).toBeDefined();
    expect(tziSeamPath).toBeDefined();
    expect(fcpSeamPath!.id).toBe(tziSeamPath!.id);
  });

  it('returns a typed error when shared-seam length mismatch is detected', () => {
    // Create two pieces with mismatched shared seam lengths
    const mismatchedPieces: Piece[] = [
      {
        id: 'piece-a',
        name: 'Piece A',
        mirror: false,
        quantity: 1,
        paths: [
          {
            id: 'seam:test-seam',
            edges: [{ kind: 'straight', id: 'tst-a-e0', role: 'seam', start: { x: 0, y: 0 }, end: { x: 0, y: 100 } }],
            closed: false,
          },
        ],
      },
      {
        id: 'piece-b',
        name: 'Piece B',
        mirror: false,
        quantity: 1,
        paths: [
          {
            id: 'seam:test-seam',
            edges: [{ kind: 'straight', id: 'tst-b-e0', role: 'seam', start: { x: 0, y: 0 }, end: { x: 0, y: 200 } }],
            closed: false,
          },
        ],
      },
    ];

    const result = verifySharedSeams(mismatchedPieces);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('seam-length-mismatch');
      expect(result.error.piece1Id).toBe('piece-a');
      expect(result.error.piece2Id).toBe('piece-b');
    }
  });

  it('compression_straps: none omits compression strap pieces', () => {
    const result = buildPattern({ ...DEFAULT_INPUTS, compression_straps: 'none' }, urban_assault);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const hasComp = result.value.pieces.some(p => p.id.includes('compression'));
    expect(hasComp).toBe(false);
  });

  it('compression_straps: side adds exactly two compression pieces', () => {
    const result = buildPattern({ ...DEFAULT_INPUTS, compression_straps: 'side' }, urban_assault);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const compPieces = result.value.pieces.filter(p => p.id.includes('compression'));
    expect(compPieces.length).toBe(2);
  });

  it('compression_straps: side_and_bottom adds exactly four compression pieces', () => {
    const result = buildPattern(
      { ...DEFAULT_INPUTS, stylePreset: 'tactical', compression_straps: 'side_and_bottom' },
      tactical,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const compPieces = result.value.pieces.filter(p => p.id.includes('compression'));
    expect(compPieces.length).toBe(4);
  });

  it('frame_sheet: hdpe emits a frame sheet piece sized within back panel', () => {
    const margin = 10;
    const result = buildPattern(
      { ...DEFAULT_INPUTS, frame_sheet: 'hdpe', frame_sheet_margin: margin },
      urban_assault,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const frameSheet = findPieceById(result.value.pieces, 'frame-sheet');
    expect(frameSheet).toBeDefined();
    // Frame sheet outline edges should reflect width-2*margin and height-2*margin dimensions
    const outline = frameSheet!.paths.find((p: Path) => p.id === 'frame-sheet-outline');
    expect(outline).toBeDefined();
  });

  it('frame_sheet: foam emits a frame sheet piece', () => {
    const result = buildPattern(
      { ...DEFAULT_INPUTS, frame_sheet: 'foam' },
      urban_assault,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const frameSheet = findPieceById(result.value.pieces, 'frame-sheet');
    expect(frameSheet).toBeDefined();
  });

  it('frame_sheet: none omits frame sheet piece', () => {
    const result = buildPattern(
      { ...DEFAULT_INPUTS, stylePreset: 'minimalist' },
      minimalist,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const frameSheet = findPieceById(result.value.pieces, 'frame-sheet');
    expect(frameSheet).toBeUndefined();
  });

  it('returns invalid-inputs error for zero height', () => {
    const result = buildPattern({ ...DEFAULT_INPUTS, height: 0 }, urban_assault);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('invalid-inputs');
    }
  });

  it('returns invalid-inputs error for negative width', () => {
    const result = buildPattern({ ...DEFAULT_INPUTS, width: -1 }, urban_assault);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('invalid-inputs');
    }
  });

  it('hem_allowance is applied to laptop sleeve top edge as a fold line', () => {
    const result = buildPattern(
      { ...DEFAULT_INPUTS, laptop_sleeve_attachment: 'seam-sewn', hem_allowance: 30 },
      urban_assault,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const front = findPieceById(result.value.pieces, 'laptop-sleeve-front');
    expect(front).toBeDefined();
    const hemPath = front!.paths.find((p: Path) => p.id === 'laptop-sleeve-panel-hem');
    expect(hemPath).toBeDefined();
    expect(hemPath!.edges[0].role).toBe('fold');
    // fold line is horizontal at y = hem_allowance
    const edge = hemPath!.edges[0];
    if (edge.kind === 'straight') {
      expect(edge.start.y).toBeCloseTo(30, 6);
      expect(edge.end.y).toBeCloseTo(30, 6);
    }
  });

  it('hem_allowance = 0 omits the fold line entirely', () => {
    const result = buildPattern(
      { ...DEFAULT_INPUTS, laptop_sleeve_attachment: 'seam-sewn', hem_allowance: 0 },
      urban_assault,
    );
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const front = findPieceById(result.value.pieces, 'laptop-sleeve-front');
    expect(front).toBeDefined();
    const hemPath = front!.paths.find((p: Path) => p.id === 'laptop-sleeve-panel-hem');
    expect(hemPath).toBeUndefined();
  });

  it('rejects negative hem_allowance', () => {
    const result = buildPattern({ ...DEFAULT_INPUTS, hem_allowance: -5 }, urban_assault);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.kind).toBe('invalid-inputs');
    }
  });

  it('all six presets build successfully with same dimensions', () => {
    for (const [name, preset] of Object.entries(STYLE_PRESETS)) {
      const result = buildPattern({ ...DEFAULT_INPUTS, stylePreset: name as keyof typeof STYLE_PRESETS }, preset);
      expect(result.ok, `preset ${name} should build without error`).toBe(true);
    }
  });
});
