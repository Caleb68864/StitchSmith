import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type {
  TriZipInputs, StylePreset, ResolvedInputs, Result, BuildPatternError, SeamRef,
} from './types.js';
import { validateInputs, resolveInputs } from './inputs.js';
import { buildBackPanel } from './modules/backPanel.js';
import { buildFrontCenterPanel } from './modules/frontCenterPanel.js';
import { buildFrontWing } from './modules/frontWing.js';
import { buildPerimeterGusset } from './modules/perimeterGusset.js';
import { buildTriZipSubsystem } from './modules/triZipSubsystem.js';
import { buildShoulderStraps } from './modules/shoulderStraps.js';
import { buildSternumStrap } from './modules/sternumStrap.js';
import { buildHipBelt } from './modules/hipBelt.js';
import { buildTopHandle } from './modules/topHandle.js';
import { buildCompressionStraps } from './modules/compressionStraps.js';
import { buildFrameSheet } from './modules/frameSheet.js';
import { buildLaptopSleeve } from './modules/laptopSleeve.js';
import { finalAssemblySteps } from './steps.js';

function edgeLength(edge: import('../../lib/pattern-engine/graph/Edge.js').Edge): number {
  switch (edge.kind) {
    case 'straight': {
      const dx = edge.end.x - edge.start.x;
      const dy = edge.end.y - edge.start.y;
      return Math.sqrt(dx * dx + dy * dy);
    }
    case 'arc': {
      const dxS = edge.start.x - edge.center.x;
      const dyS = edge.start.y - edge.center.y;
      const dxE = edge.end.x - edge.center.x;
      const dyE = edge.end.y - edge.center.y;
      let startAngle = Math.atan2(dyS, dxS);
      let endAngle = Math.atan2(dyE, dxE);
      if (edge.clockwise && endAngle < startAngle) endAngle += 2 * Math.PI;
      if (!edge.clockwise && endAngle > startAngle) endAngle -= 2 * Math.PI;
      return Math.abs(endAngle - startAngle) * edge.radius;
    }
    case 'bezier': {
      // Sample 32 points along the cubic bezier for arc-length approximation.
      const N = 32;
      let len = 0;
      let px = edge.start.x, py = edge.start.y;
      for (let i = 1; i <= N; i++) {
        const t = i / N;
        const mt = 1 - t;
        const x = mt * mt * mt * edge.start.x
          + 3 * mt * mt * t * edge.cp1.x
          + 3 * mt * t * t * edge.cp2.x
          + t * t * t * edge.end.x;
        const y = mt * mt * mt * edge.start.y
          + 3 * mt * mt * t * edge.cp1.y
          + 3 * mt * t * t * edge.cp2.y
          + t * t * t * edge.end.y;
        len += Math.sqrt((x - px) * (x - px) + (y - py) * (y - py));
        px = x; py = y;
      }
      return len;
    }
  }
}

function pathLength(path: import('../../lib/pattern-engine/graph/Path.js').Path): number {
  return path.edges.reduce((s, e) => s + edgeLength(e), 0);
}

export function verifySharedSeams(pieces: Piece[]): Result<true, BuildPatternError> {
  // Group paths by id that starts with 'seam:'
  const seamMap = new Map<string, { pieceId: string; length: number }[]>();

  for (const piece of pieces) {
    for (const path of piece.paths) {
      if (path.id.startsWith('seam:')) {
        const len = pathLength(path);
        const existing = seamMap.get(path.id) ?? [];
        existing.push({ pieceId: piece.id, length: len });
        seamMap.set(path.id, existing);
      }
    }
  }

  for (const [pathId, refs] of seamMap) {
    if (refs.length < 2) continue;
    const first = refs[0]!;
    for (let i = 1; i < refs.length; i++) {
      const other = refs[i]!;
      if (Math.abs(first.length - other.length) > 0.01) {
        return {
          ok: false,
          error: {
            kind: 'seam-length-mismatch',
            message: `Shared seam "${pathId}" length mismatch: piece "${first.pieceId}" has ${first.length.toFixed(3)} mm but piece "${other.pieceId}" has ${other.length.toFixed(3)} mm`,
            piece1Id: first.pieceId,
            piece2Id: other.pieceId,
            sharedPathId: pathId,
            length1: first.length,
            length2: other.length,
          },
        };
      }
    }
  }

  return { ok: true, value: true };
}

export function buildPattern(inputs: TriZipInputs, preset: StylePreset): Result<Pattern, BuildPatternError> {
  const validation = validateInputs(inputs);
  if (!validation.ok) return validation;

  const r: ResolvedInputs = resolveInputs(inputs, preset);

  const allPieces: Piece[] = [];
  const allSteps: import('../../lib/pattern-engine/instructions/Step.js').Step[] = [];
  const seamRefs: SeamRef[] = [];

  function collect(result: { pieces: Piece[]; steps: import('../../lib/pattern-engine/instructions/Step.js').Step[] }) {
    allPieces.push(...result.pieces);
    allSteps.push(...result.steps);
  }

  // Back panel
  collect(buildBackPanel(r));

  // Front panels
  const fcpResult = buildFrontCenterPanel(r);
  collect(fcpResult);
  seamRefs.push(fcpResult.seamRef);

  collect(buildFrontWing(r));

  // Tri-Zip subsystem (direct mode emits no pieces and a null seamRef).
  const tziResult = buildTriZipSubsystem(r);
  collect(tziResult);
  if (tziResult.seamRef) seamRefs.push(tziResult.seamRef);

  // Gusset
  collect(buildPerimeterGusset(r));

  // Straps and accessories
  collect(buildShoulderStraps(r));
  collect(buildSternumStrap(r));
  collect(buildHipBelt(r));
  collect(buildTopHandle(r));
  collect(buildCompressionStraps(r));
  collect(buildFrameSheet(r));
  collect(buildLaptopSleeve(r));

  // Final assembly steps
  allSteps.push(...finalAssemblySteps());

  // Verify shared seams
  const seamCheck = verifySharedSeams(allPieces);
  if (!seamCheck.ok) return seamCheck;

  const pattern: Pattern = {
    id: `tri-zip-${Date.now()}`,
    name: `Tri-Zip Backpack (${preset.name})`,
    pieces: allPieces,
    description: `Tri-Zip Backpack — ${r.width}×${r.height}×${r.depth} mm, ${preset.name} preset`,
    units: r.units,
  };

  return { ok: true, value: pattern };
}
