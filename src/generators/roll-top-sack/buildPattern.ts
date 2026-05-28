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
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { RollTopSackInputs, ResolvedInputs, RollTopSackBuildResult, BuildPatternError, Result } from './types.js';
import { validateInputs, resolveInputs } from './inputs.js';
import { buildBom } from './bom.js';
import { DEFAULT_TOP_HEM_MM, DEFAULT_BOTTOM_SEAM_MM, DEFAULT_WEBBING_WIDTH_MM, DEFAULT_BUCKLE_SIZE_MM } from './defaults.js';
import { frenchSeamAllowance } from '../../lib/pattern-engine/geometry/frenchSeam.js';
import { boxedCornerStitchLine } from '../../lib/pattern-engine/geometry/boxedCorner.js';
import { rollTopClosure } from '../../lib/pattern-engine/geometry/rollTopClosure.js';
import { makeRectOutline, makeHorizLine, point as pt } from '../../lib/pattern-engine/geometry/paths.js';

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

  // Top hem fold: the strip above this line folds UNDER to the wrong side
  // to form the clean top edge of the collar.
  const topHemLine = makeHorizLine(
    'body-panel-top-hem',
    DEFAULT_TOP_HEM_MM,
    cutWidth,
    'fold',
    'Top hem — fold above this line under',
  );

  // Collar fold: reference line where the bag transitions from roll-down
  // collar to body. Not folded during construction — it's where the rolling
  // happens when the user closes the bag.
  const collarFoldLine = makeHorizLine(
    'body-panel-collar-fold',
    DEFAULT_TOP_HEM_MM + collar_height,
    cutWidth,
    'fold',
    'Collar fold — roll here to close',
  );

  // Boxed-corner stitch markers as a stitch-role path at the panel bottom.
  // These are NOT cut lines — they show where the corner-boxing seam lands
  // AFTER the side and bottom seams have been sewn and the corner is
  // flattened into a triangle. The construction note (roll-top-sack.box-
  // corners) walks the user through fold-then-stitch in detail.
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
    label: 'Box corner — see step',
  };

  // Side-seam stitch lines: inward by the French seam allowance on each side.
  // These show the user where the side seams will land inside the cut piece.
  const sideStitchAllowance = frenchSeamAllowance(saMm);
  const leftStitchPath: Path = {
    id: 'body-panel-left-stitch',
    closed: false,
    edges: [
      { kind: 'straight', id: 'body-panel-left-stitch:e0', role: 'seam', start: pt(sideStitchAllowance, 0), end: pt(sideStitchAllowance, cutHeight) },
    ],
    label: 'Side seam',
  };
  const rightStitchPath: Path = {
    id: 'body-panel-right-stitch',
    closed: false,
    edges: [
      { kind: 'straight', id: 'body-panel-right-stitch:e0', role: 'seam', start: pt(cutWidth - sideStitchAllowance, 0), end: pt(cutWidth - sideStitchAllowance, cutHeight) },
    ],
    label: 'Side seam',
  };
  // Bottom-seam stitch line: inward by DEFAULT_BOTTOM_SEAM_MM from the cut bottom.
  const bottomStitchPath: Path = {
    id: 'body-panel-bottom-stitch',
    closed: false,
    edges: [
      { kind: 'straight', id: 'body-panel-bottom-stitch:e0', role: 'seam', start: pt(0, cutHeight - DEFAULT_BOTTOM_SEAM_MM), end: pt(cutWidth, cutHeight - DEFAULT_BOTTOM_SEAM_MM) },
    ],
    label: 'Bottom seam',
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
    paths: [outline, topHemLine, collarFoldLine, leftStitchPath, rightStitchPath, bottomStitchPath, boxedCornerPath, webbingMarkPath],
    annotations: [
      { kind: 'grain', label: 'Grain', point: pt(cutWidth / 2, cutHeight / 2), angle: 90 },
      { kind: 'label', label: `Body Panel\nCut 2\n${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm` },
    ],
    // The cut dimensions already include all four allowances:
    //   cutWidth  = bottom_length + 2 × frenchSeamAllowance  (left/right SA)
    //   cutHeight = body + collar + top_hem + bottom_seam    (top/bottom SA)
    // So the outline IS the cut line — no additional outward offset needed.
    // The fold paths (top hem, collar fold) and the stitch-role paths below
    // tell the cutter where the stitch lines fall inside the cut.
    seamAllowances: {
      'body-panel-outline:e0': 0,
      'body-panel-outline:e1': 0,
      'body-panel-outline:e2': 0,
      'body-panel-outline:e3': 0,
    },
  };

  const pieces: Piece[] = [bodyPanel];

  const halfFrench = frenchSeamAllowance(saMm) / 2;
  const fullFrench = frenchSeamAllowance(saMm);
  const collarFoldY = Math.round(DEFAULT_TOP_HEM_MM + collar_height);
  const webbingCenterX = Math.round(webbingAttachment.x + webbingAttachment.width / 2);
  const webbingY = Math.round(DEFAULT_TOP_HEM_MM + webbingAttachment.y);
  const bottomStitchOffset = Math.round(boxed.stitchLineOffsetFromCorner);

  const steps: Step[] = [
    // ── Preparation ────────────────────────────────────────────────────
    {
      id: 'roll-top-sack.materials',
      title: 'Gather materials',
      body: `Main fabric: enough for 2 panels at ${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm (allow extra for trimming, ${Math.round(cutWidth * cutHeight * 2 / 1000)} cm² minimum). Closure hardware: one ${DEFAULT_BUCKLE_SIZE_MM} mm side-release buckle and ~${Math.round(cutWidth + 200)} mm of ${DEFAULT_WEBBING_WIDTH_MM} mm webbing. Thread to match (polyester recommended for stuff sacks — UV resistant). A walking foot helps with slippery fabrics like silnylon.`,
      dependsOn: [],
      refsPieces: ['body-panel'],
      group: 'Preparation',
    },
    {
      id: 'roll-top-sack.cut-panels',
      title: 'Cut body panels',
      body: `Cut 2 rectangles at ${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm. Cut along the grain — the long edge (${Math.round(cutHeight)} mm) should run with the fabric's straight grain so the bag doesn't twist when loaded. If your fabric has a directional print, make sure both panels are oriented the same way before cutting.`,
      dependsOn: ['roll-top-sack.materials'],
      refsPieces: ['body-panel'],
      group: 'Cutting',
    },
    {
      id: 'roll-top-sack.mark-fold-lines',
      title: 'Mark fold and stitch lines',
      body: `On the wrong side of each panel, mark: (a) top-hem fold at ${Math.round(DEFAULT_TOP_HEM_MM)} mm from the top, (b) collar fold at ${collarFoldY} mm from the top — this is where the bag transitions from rolled collar to body, (c) bottom stitch line at ${bottomStitchOffset} mm from the bottom corner along the diagonal (for box corners), and (d) webbing-attach mark at ${webbingCenterX} mm from the left edge, ${webbingY} mm from the top. Use tailor's chalk or a heat-erase pen — pencil is fine on cotton/canvas but bleeds on synthetics.`,
      dependsOn: ['roll-top-sack.cut-panels'],
      refsPieces: ['body-panel'],
      group: 'Cutting',
    },

    // ── Side seams (French) ────────────────────────────────────────────
    {
      id: 'roll-top-sack.french-seam-pass1',
      title: 'French seam — first pass (WRONG sides together)',
      body: `Place the two panels WRONG sides together (right sides facing outward — this is the opposite of a normal seam). Pin one side. Stitch at ${halfFrench.toFixed(1)} mm from the raw edge, the full length of the panel. Backstitch 10 mm at each end. Repeat for the other side. The seam allowance should be visible on the OUTSIDE at this point — that's correct.`,
      dependsOn: ['roll-top-sack.mark-fold-lines'],
      refsPieces: ['body-panel'],
      group: 'Construction',
    },
    {
      id: 'roll-top-sack.french-seam-trim',
      title: 'Trim and press',
      body: `Trim each side seam allowance to about 3 mm — be careful not to clip the stitching. Press the seam allowance flat to one side, then press the seam itself flat. A pressed first pass is the difference between a French seam that looks tailored and one that looks lumpy.`,
      dependsOn: ['roll-top-sack.french-seam-pass1'],
      refsPieces: ['body-panel'],
      group: 'Construction',
    },
    {
      id: 'roll-top-sack.french-seam-pass2',
      title: 'French seam — second pass (RIGHT sides together)',
      body: `Turn the bag inside out so the RIGHT sides are now together (the trimmed raw edges are tucked inside). Press the seam crisp along the edge. Stitch ${halfFrench.toFixed(1)} mm in from the folded edge — this encloses the raw edge inside the new seam. Backstitch both ends. Repeat for the other side. Total enclosed seam = ${fullFrench.toFixed(1)} mm; this is the standard waterproof seam for dry bags and stuff sacks.`,
      dependsOn: ['roll-top-sack.french-seam-trim'],
      refsPieces: ['body-panel'],
      group: 'Construction',
    },

    // ── Bottom closure + boxed corners ─────────────────────────────────
    {
      id: 'roll-top-sack.bottom-seam',
      title: 'Stitch the bottom seam',
      body: `Keep the bag right-sides-together (still inside-out from the French seam). Pin the two bottom edges. Stitch across the bottom at ${DEFAULT_BOTTOM_SEAM_MM} mm from the edge. Backstitch both ends. This seam will be hidden inside the boxed corners — no need for a French seam here.`,
      dependsOn: ['roll-top-sack.french-seam-pass2'],
      refsPieces: ['body-panel'],
      group: 'Construction',
    },
    {
      id: 'roll-top-sack.box-corners',
      title: 'Box the bottom corners',
      body:
        `IMPORTANT: the two short dashed-red marks at the bottom of the pattern are NOT cut lines. They mark where the new corner seam will land AFTER you fold the corner. ` +
        `Here's the operation for each bottom corner: ` +
        `(1) The bag is still inside-out from the bottom seam. Pinch a bottom corner between thumb and forefinger and "open" it — pull the side seam and the bottom seam apart so they meet face-to-face, forming a small triangle with the corner tip at the apex. ` +
        `(2) Lay this triangle flat. The side seam should sit directly on top of the bottom seam (they should LINE UP — if they offset, the corner won't be square). ` +
        `(3) From the tip of the triangle, measure ${bottomStitchOffset} mm UP along the centre line (this distance = bottom_width / 2 = ${Math.round(bottom_width)} / 2). Mark a horizontal line perpendicular to the centre at that point — it will be ${Math.round(bottom_width)} mm wide, base-to-base across the triangle. ` +
        `(4) Stitch along that horizontal line. Backstitch both ends. This new seam is what makes the bag's bottom a flat rectangle (${Math.round(bottom_width)} mm wide) instead of a point. ` +
        `(5) Trim the corner triangle off, leaving ${boxed.trimAllowanceMm} mm of fabric beyond the new seam. Don't trim closer — under load the seam can pop. Optional: zigzag or bind the cut edges. ` +
        `(6) Repeat for the other bottom corner. Your bag now has a flat ${Math.round(bottom_length)} × ${Math.round(bottom_width)} mm base.`,
      dependsOn: ['roll-top-sack.bottom-seam'],
      refsPieces: ['body-panel'],
      group: 'Construction',
    },

    // ── Top hem + closure ─────────────────────────────────────────────
    {
      id: 'roll-top-sack.top-hem-fold',
      title: 'Fold and press the top hem',
      body: `Turn the bag right-side out (push corners with a chopstick or point turner — don't poke through). Fold the top edge to the inside by ${Math.round(DEFAULT_TOP_HEM_MM)} mm. To avoid a raw edge inside the hem, fold once at ${Math.round(DEFAULT_TOP_HEM_MM / 2)} mm, then again at ${Math.round(DEFAULT_TOP_HEM_MM / 2)} mm (double-rolled hem). Press the fold all the way around the opening.`,
      dependsOn: ['roll-top-sack.box-corners'],
      refsPieces: ['body-panel'],
      group: 'Closure',
    },
    {
      id: 'roll-top-sack.top-hem-stitch',
      title: 'Stitch the top hem',
      body: `Stitch ${Math.max(2, Math.round(DEFAULT_TOP_HEM_MM / 8))} mm from the folded edge, going all the way around the opening. Overlap the start by 10 mm and backstitch — don't backstitch in the middle of the hem, that creates a bulge that catches when rolling. Press flat.`,
      dependsOn: ['roll-top-sack.top-hem-fold'],
      refsPieces: ['body-panel'],
      group: 'Closure',
    },
    {
      id: 'roll-top-sack.attach-webbing',
      title: 'Attach the closure webbing',
      body: `Cut two webbing pieces: a short male-buckle tail (~100 mm) and a longer female-buckle strap (~${Math.round(cutWidth + 100)} mm — enough to wrap the rolled top with adjustment slack). Singe the cut ends with a lighter to prevent fraying. Bar-tack the SHORT tail centered at ${webbingCenterX} mm from the left side seam on ONE panel, at the mid-collar mark (${webbingY} mm from the top edge). Bar-tack the LONG strap on the SAME panel about ${Math.round(cutWidth / 4)} mm to the right of center. A bar-tack is a tight zigzag, 6-8 mm long, sewn back and forth 3-4 times — it's what holds the load.`,
      dependsOn: ['roll-top-sack.top-hem-stitch'],
      refsPieces: ['body-panel'],
      group: 'Closure',
    },
    {
      id: 'roll-top-sack.assemble-buckle',
      title: 'Assemble the buckle',
      body: `Thread the short tail through the male half of the side-release buckle, fold back ~25 mm, and bar-tack the loop closed. Thread the long strap through the female half, around the adjuster (if your buckle has one), and through the slot — leave the free end loose. Test the buckle clicks and releases freely.`,
      dependsOn: ['roll-top-sack.attach-webbing'],
      refsPieces: ['body-panel'],
      group: 'Closure',
    },

    // ── Finish ─────────────────────────────────────────────────────────
    {
      id: 'roll-top-sack.finish',
      title: 'Final inspection and roll test',
      body: `Inspect: all four corners crisp, no raw edges visible inside or outside, French seams flat with no twist, buckle releases cleanly. Roll-test the closure: fill the bag with a soft object (towel, jacket), roll the collar down 3-4 times tightly toward the body, clip the buckle. The roll should sit flat against the load without ballooning. If the collar is too tall to roll comfortably, the bag is overfilled — load to height_when_rolled (${Math.round(height_when_rolled)} mm) max.`,
      dependsOn: ['roll-top-sack.assemble-buckle'],
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
