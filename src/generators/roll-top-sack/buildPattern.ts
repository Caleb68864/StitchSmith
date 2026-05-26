/**
 * Two-panel construction:
 * Front and back panels are separate rectangular pieces seamed along both side
 * edges using French seams. The bottom is box-cornered in-place (no separate base
 * piece). The collar forms the roll-top: the top section above height_when_rolled
 * is rolled and secured with webbing + buckle.
 *
 * Cut dimensions per panel:
 *   cutWidth  = bottom_length + 2 × frenchSeamAllowance(9.5)
 *   cutHeight = height_when_rolled + collar_height + DEFAULT_TOP_HEM_MM + DEFAULT_BOTTOM_SEAM_MM
 * Two panels (front + back) are cut at this size.
 */

import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Edge } from '../../lib/pattern-engine/graph/Edge.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { RollTopSackInputs, ResolvedInputs, RollTopSackBuildResult, BuildPatternError, Result } from './types.js';
import { validateInputs, resolveInputs } from './inputs.js';
import { buildBom } from './bom.js';
import { DEFAULT_TOP_HEM_MM, DEFAULT_BOTTOM_SEAM_MM, DEFAULT_WEBBING_WIDTH_MM } from './defaults.js';
import { frenchSeamAllowance } from '../../lib/pattern-engine/geometry/frenchSeam.js';
import { boxedCornerStitchLine } from '../../lib/pattern-engine/geometry/boxedCorner.js';
import { rollTopClosure } from '../../lib/pattern-engine/geometry/rollTopClosure.js';

function pt(x: number, y: number) { return { x, y }; }

function makeRectOutline(id: string, w: number, h: number, role: Edge['role'] = 'cut'): Path {
  return {
    id,
    closed: true,
    edges: [
      { kind: 'straight', id: `${id}:e0`, role, start: pt(0, 0), end: pt(w, 0) },
      { kind: 'straight', id: `${id}:e1`, role, start: pt(w, 0), end: pt(w, h) },
      { kind: 'straight', id: `${id}:e2`, role, start: pt(w, h), end: pt(0, h) },
      { kind: 'straight', id: `${id}:e3`, role, start: pt(0, h), end: pt(0, 0) },
    ],
  };
}

function makeHorizLine(id: string, y: number, w: number, role: Edge['role']): Path {
  return {
    id,
    closed: false,
    edges: [
      { kind: 'straight', id: `${id}:e0`, role, start: pt(0, y), end: pt(w, y) },
    ],
  };
}

export function buildPattern(inputs: RollTopSackInputs): Result<RollTopSackBuildResult, BuildPatternError> {
  const validation = validateInputs(inputs);
  if (!validation.ok) return validation;

  const r: ResolvedInputs = resolveInputs(inputs);

  const { bottom_length, bottom_width, height_when_rolled, collar_height } = r;
  const saMm = r.seam_allowance;

  // Panel cut dimensions
  const cutWidth = bottom_length + 2 * frenchSeamAllowance(saMm);
  const cutHeight = height_when_rolled + collar_height + DEFAULT_TOP_HEM_MM + DEFAULT_BOTTOM_SEAM_MM;

  // Compute boxed-corner stitch markers
  const boxed = boxedCornerStitchLine({
    panelWidth: cutWidth,
    panelHeight: cutHeight,
    bottomWidth: bottom_width,
  });

  // Compute roll-top closure geometry
  const closure = rollTopClosure({
    openingWidth: cutWidth,
    collarHeight: collar_height,
    webbingWidthMm: DEFAULT_WEBBING_WIDTH_MM,
  });

  // Build body panel piece
  const outline = makeRectOutline('body-panel-outline', cutWidth, cutHeight, 'cut');

  // Top hem fold line (fold at top_hem distance from top = y=0 is top, y increases downward)
  const topHemLine = makeHorizLine('body-panel-top-hem', DEFAULT_TOP_HEM_MM, cutWidth, 'fold');

  // Collar bottom fold line (separates roll collar from bag body)
  const collarFoldLine = makeHorizLine(
    'body-panel-collar-fold',
    DEFAULT_TOP_HEM_MM + collar_height,
    cutWidth,
    'fold',
  );

  // Boxed-corner stitch markers as a stitch-role path at the panel bottom
  const boxedCornerPath: Path = {
    id: 'body-panel-boxed-corner',
    closed: false,
    edges: boxed.markers.map((m, i) => ({
      kind: 'straight' as const,
      id: `body-panel-boxed-corner:e${i}`,
      role: 'stitch' as const,
      start: pt(m.x, cutHeight - boxed.stitchLineOffsetFromCorner),
      end: pt(m.x, cutHeight),
    })),
  };

  // Webbing attachment mark
  const { webbingAttachment } = closure;
  const webbingMarkPath: Path = {
    id: 'body-panel-webbing-attach',
    closed: false,
    edges: [
      {
        kind: 'straight',
        id: 'body-panel-webbing-attach:e0',
        role: 'notch',
        start: pt(webbingAttachment.x, DEFAULT_TOP_HEM_MM + webbingAttachment.y),
        end: pt(webbingAttachment.x + webbingAttachment.width, DEFAULT_TOP_HEM_MM + webbingAttachment.y),
      },
    ],
  };

  const bodyPanel: Piece = {
    id: 'body-panel',
    name: 'Body Panel',
    mirror: false,
    quantity: 2,
    paths: [outline, topHemLine, collarFoldLine, boxedCornerPath, webbingMarkPath],
    annotations: [
      { kind: 'grain', label: 'Grain', point: pt(cutWidth / 2, cutHeight / 2), angle: 90 },
      { kind: 'label', label: `Body Panel\nCut 2\n${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm` },
    ],
    seamAllowances: {
      'body-panel-outline:e0': DEFAULT_BOTTOM_SEAM_MM,
      'body-panel-outline:e1': frenchSeamAllowance(saMm),
      'body-panel-outline:e2': DEFAULT_TOP_HEM_MM,
      'body-panel-outline:e3': frenchSeamAllowance(saMm),
    },
  };

  const pieces: Piece[] = [bodyPanel];

  const steps: Step[] = [
    {
      id: 'roll-top-sack.cut-panels',
      title: 'Cut body panels',
      body: `Cut 2 body panels at ${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm. Mark the collar-fold line at ${Math.round(DEFAULT_TOP_HEM_MM + collar_height)} mm from the top.`,
      dependsOn: [],
      refsPieces: ['body-panel'],
      group: 'Cutting',
    },
    {
      id: 'roll-top-sack.french-seam-sides',
      title: 'French-seam side edges',
      body: 'With wrong sides together, stitch side edges at half the French seam allowance. Press open, flip right sides together, stitch at the remaining allowance to enclose the raw edge.',
      dependsOn: ['roll-top-sack.cut-panels'],
      refsPieces: ['body-panel'],
      group: 'Construction',
    },
    {
      id: 'roll-top-sack.box-corners',
      title: 'Box the bottom corners',
      body: `Flatten each bottom corner so the side seam aligns with the bottom seam. Stitch across at the marked stitch line (offset = ${Math.round(boxed.stitchLineOffsetFromCorner)} mm from corner tip). Trim to ${boxed.trimAllowanceMm} mm.`,
      dependsOn: ['roll-top-sack.french-seam-sides'],
      refsPieces: ['body-panel'],
      group: 'Construction',
    },
    {
      id: 'roll-top-sack.top-hem',
      title: 'Fold and stitch top hem',
      body: `Fold top edge down ${Math.round(DEFAULT_TOP_HEM_MM)} mm and stitch to form a clean collar edge.`,
      dependsOn: ['roll-top-sack.cut-panels'],
      refsPieces: ['body-panel'],
      group: 'Construction',
    },
    {
      id: 'roll-top-sack.attach-webbing',
      title: 'Attach roll-top webbing',
      body: `Bar-tack the webbing loop centred at ${Math.round(webbingAttachment.x + webbingAttachment.width / 2)} mm from the left edge, at mid-collar height. Thread through buckle.`,
      dependsOn: ['roll-top-sack.top-hem'],
      refsPieces: ['body-panel'],
      group: 'Closure',
    },
    {
      id: 'roll-top-sack.finish',
      title: 'Final inspection',
      body: 'Check all seams are enclosed, collar rolls cleanly, and buckle functions. Turn right-side out.',
      dependsOn: ['roll-top-sack.attach-webbing', 'roll-top-sack.box-corners'],
      refsPieces: ['body-panel'],
      group: 'Finish',
    },
  ];

  const bom = buildBom(r);

  return {
    ok: true,
    value: {
      pieces,
      steps,
      bom,
      warnings: [],
    },
  };
}

export { validateInputs, resolveInputs } from './inputs.js';
