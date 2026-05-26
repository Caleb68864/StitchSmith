import type { Edge } from '../../../lib/pattern-engine/graph/Edge.js';
import { makeEdgeIdGen } from '../../../lib/pattern-engine/graph/Edge.js';
import type { Path } from '../../../lib/pattern-engine/graph/Path.js';
import type { Piece } from '../../../lib/pattern-engine/graph/Piece.js';
import type { ResolvedInputs, ModuleResult, SeamRef } from '../types.js';
import { triZipSubsystemSteps } from '../steps.js';
import { SHARED_SEAM_PATH_ID } from './frontCenterPanel.js';

function pt(x: number, y: number) { return { x, y }; }

export function buildTriZipSubsystem(r: ResolvedInputs): ModuleResult & { seamRef: SeamRef | null } {
  const { height, zipper_method, zipper_gusset_width } = r;
  const pieces: Piece[] = [];

  if (zipper_method === 'gusseted') {
    // Shared seam path lives on the gusset piece so verifySharedSeams can
    // cross-check fcp ↔ tzi seam lengths.
    const seamEid = makeEdgeIdGen(SHARED_SEAM_PATH_ID);
    const sharedSeamPath: Path = {
      id: SHARED_SEAM_PATH_ID,
      edges: [{ kind: 'straight', id: seamEid(), role: 'seam', start: pt(0, 0), end: pt(0, height) }],
      closed: false,
    };

    const gussetEid = makeEdgeIdGen('tzi-gusset-outline');
    const seg = (role: Edge['role'], sx: number, sy: number, ex: number, ey: number): Edge =>
      ({ kind: 'straight', id: gussetEid(), role, start: pt(sx, sy), end: pt(ex, ey) });
    const gussetPath: Path = {
      id: 'tzi-gusset-outline',
      edges: [
        seg('cut', 0, 0, zipper_gusset_width, 0),
        seg('cut', zipper_gusset_width, 0, zipper_gusset_width, height),
        seg('cut', zipper_gusset_width, height, 0, height),
        seg('seam', 0, height, 0, 0),
      ],
      closed: true,
    };
    pieces.push({
      id: 'tri-zip-subsystem',
      name: 'Tri-Zip Gusset Strip',
      mirror: true,
      quantity: 2,
      paths: [gussetPath, sharedSeamPath],
      annotations: [
        { kind: 'label', label: `Zipper Gusset\n${zipper_gusset_width}×${height} mm` },
      ],
    });

    const seamRef: SeamRef = {
      pieceId: 'tri-zip-subsystem',
      pathId: SHARED_SEAM_PATH_ID,
      length: height,
    };
    return { pieces, steps: triZipSubsystemSteps(), seamRef };
  }

  // direct method: no piece to cut — the zipper tape attaches directly to the
  // front-center-panel and the wings. We deliberately emit no placeholder
  // piece (it would pollute the cut list and the SVG with a phantom). The
  // shared seam still exists on the front-center-panel; verifySharedSeams
  // skips paths that appear only once, so this is fine.
  return { pieces: [], steps: triZipSubsystemSteps(), seamRef: null };
}
