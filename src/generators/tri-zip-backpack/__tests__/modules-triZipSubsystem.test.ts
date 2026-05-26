import { describe, it, expect } from 'vitest';
import { buildTriZipSubsystem } from '../modules/triZipSubsystem.js';
import { buildFrontCenterPanel, SHARED_SEAM_PATH_ID } from '../modules/frontCenterPanel.js';
import { verifySharedSeams } from '../buildPattern.js';
import { resolveInputs } from '../inputs.js';
import { STYLE_PRESETS } from '../stylePresets.js';
import type { ResolvedInputs } from '../types.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';

function makeResolved(overrides: Partial<ResolvedInputs> = {}): ResolvedInputs {
  const preset = STYLE_PRESETS['urban_assault'];
  const base = resolveInputs(
    { height: 510, width: 300, depth: 200, units: 'mm', stylePreset: 'urban_assault' },
    preset,
  );
  return { ...base, ...overrides };
}

describe('buildTriZipSubsystem', () => {
  it('gusseted method emits a zipper-gusset strip piece with tzi-gusset-outline path', () => {
    const result = buildTriZipSubsystem(makeResolved({ zipper_method: 'gusseted' }));
    expect(result.pieces).toHaveLength(1);
    expect(result.pieces[0].id).toBe('tri-zip-subsystem');
    const hasGusset = result.pieces[0].paths.some((p: Path) => p.id === 'tzi-gusset-outline');
    expect(hasGusset).toBe(true);
  });

  it('direct method emits no piece and a null seamRef', () => {
    const result = buildTriZipSubsystem(makeResolved({ zipper_method: 'direct' }));
    expect(result.pieces).toHaveLength(0);
    expect(result.seamRef).toBeNull();
  });

  it('direct method still emits assembly steps for stitching the zipper directly', () => {
    const result = buildTriZipSubsystem(makeResolved({ zipper_method: 'direct' }));
    expect(result.steps.length).toBeGreaterThan(0);
  });

  it('gusseted includes the shared seam path on its piece', () => {
    const result = buildTriZipSubsystem(makeResolved({ zipper_method: 'gusseted' }));
    const hasSeam = result.pieces[0].paths.some((p: Path) => p.id === SHARED_SEAM_PATH_ID);
    expect(hasSeam, 'gusseted method should have shared seam path on its piece').toBe(true);
  });

  it('shared seam path id matches front-center-panel shared seam path id', () => {
    const r = makeResolved();
    const tziResult = buildTriZipSubsystem(r);
    const fcpResult = buildFrontCenterPanel(r);

    const tziSeam = tziResult.pieces[0].paths.find((p: Path) => p.id.startsWith('seam:'));
    const fcpSeam = fcpResult.pieces[0].paths.find((p: Path) => p.id.startsWith('seam:'));

    expect(tziSeam).toBeDefined();
    expect(fcpSeam).toBeDefined();
    expect(tziSeam!.id).toBe(fcpSeam!.id);
  });

  it('shared seam lengths match between fcp and tzi → verifySharedSeams passes', () => {
    const r = makeResolved();
    const tziResult = buildTriZipSubsystem(r);
    const fcpResult = buildFrontCenterPanel(r);

    const allPieces = [...fcpResult.pieces, ...tziResult.pieces];
    const check = verifySharedSeams(allPieces);
    expect(check.ok).toBe(true);
  });

  it('verifySharedSeams returns error when seam lengths mismatch', () => {
    const r = makeResolved({ height: 510 });
    const tziResult = buildTriZipSubsystem(r);

    // Tamper the shared seam path length in the tri-zip subsystem piece.
    const tziPiece = tziResult.pieces[0];
    const tamperedPiece = {
      ...tziPiece,
      paths: tziPiece.paths.map((p: Path) => {
        if (p.id !== SHARED_SEAM_PATH_ID) return p;
        // Change end y to create a mismatch
        return {
          ...p,
          edges: [{ ...p.edges[0], end: { x: 0, y: 999 } }],
        };
      }),
    };

    const r2 = makeResolved({ height: 510 });
    const fcpResult = buildFrontCenterPanel(r2);

    const check = verifySharedSeams([...fcpResult.pieces, tamperedPiece]);
    expect(check.ok).toBe(false);
    if (!check.ok) {
      expect(check.error.kind).toBe('seam-length-mismatch');
    }
  });

  it('returns assembly steps for the subsystem', () => {
    const result = buildTriZipSubsystem(makeResolved());
    expect(result.steps.length).toBeGreaterThan(0);
    const stepIds = result.steps.map(s => s.id);
    expect(stepIds.some(id => id.includes('tri-zip-subsystem'))).toBe(true);
  });

  it('seamRef has correct pieceId and pathId in gusseted mode', () => {
    const result = buildTriZipSubsystem(makeResolved());
    expect(result.seamRef).not.toBeNull();
    if (!result.seamRef) return;
    expect(result.seamRef.pieceId).toBe('tri-zip-subsystem');
    expect(result.seamRef.pathId).toBe(SHARED_SEAM_PATH_ID);
    expect(result.seamRef.length).toBeGreaterThan(0);
  });
});
