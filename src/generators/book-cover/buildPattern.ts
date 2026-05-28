import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Edge } from '../../lib/pattern-engine/graph/Edge.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { BookCoverInputs, ResolvedInputs, BookCoverBuildResult, BuildPatternError, Result, PocketConfig, PenHolderConfig } from './types.js';
import { validateInputs, resolveInputs } from './inputs.js';
import { buildBom } from './bom.js';
import { DEFAULT_PEN_HOLDER_HEIGHT_MM } from './defaults.js';
import { offsetPolygon } from '../../lib/pattern-engine/geometry/offset.js';

function pt(x: number, y: number): Point { return { x, y }; }

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

function makeVertLine(id: string, x: number, h: number, role: Edge['role'], label?: string): Path {
  return {
    id,
    closed: false,
    edges: [
      { kind: 'straight', id: `${id}:e0`, role, start: pt(x, 0), end: pt(x, h) },
    ],
    label,
  };
}

function makeHorizLine(id: string, y: number, w: number, role: Edge['role'], label?: string): Path {
  return {
    id,
    closed: false,
    edges: [
      { kind: 'straight', id: `${id}:e0`, role, start: pt(0, y), end: pt(w, y) },
    ],
    label,
  };
}

function makePathFromPoints(id: string, pts: Point[], role: Edge['role']): Path {
  const edges: Edge[] = [];
  const n = pts.length;
  for (let i = 0; i < n; i++) {
    edges.push({
      kind: 'straight',
      id: `${id}:e${i}`,
      role,
      start: pts[i],
      end: pts[(i + 1) % n],
    });
  }
  return { id, closed: true, edges };
}

function buildCoverPanel(r: ResolvedInputs): Piece {
  const { book_width, spine_width, book_height, seam_allowance: SA, top_bottom_hem } = r;

  // Body wraps front cover + spine + back cover. The inner-cover sleeves
  // are separate flap pieces (buildInnerFlapPiece) sewn to the body's
  // short edges, so the body itself does NOT include flap_depth.
  const cutWidth = 2 * book_width + spine_width + 2 * SA;
  const cutHeight = book_height + 2 * top_bottom_hem;

  const outline = makeRectOutline('cover-panel-outline', cutWidth, cutHeight, 'cut');

  const paths: Path[] = [outline];
  if (SA > 0) {
    const outlineVerts: Point[] = [
      pt(0, 0), pt(cutWidth, 0), pt(cutWidth, cutHeight), pt(0, cutHeight),
    ];
    const saResult = offsetPolygon(outlineVerts, -SA);
    if (saResult.ok && saResult.value) {
      paths.push(makePathFromPoints('cover-panel-sa-seam', saResult.value, 'seam'));
    }
  }

  // Two vertical fold lines marking the spine boundaries
  const foldXs = [SA + book_width, SA + book_width + spine_width];
  const foldLabels = ['Front cover / spine', 'Spine / back cover'];
  foldXs.forEach((x, i) => {
    paths.push(makeVertLine(`cover-panel-fold-v${i}`, x, cutHeight, 'fold', foldLabels[i]));
  });

  // Two horizontal hem fold lines
  paths.push(makeHorizLine('cover-panel-fold-top', top_bottom_hem, cutWidth, 'fold', 'Top hem — fold to wrong side'));
  paths.push(makeHorizLine('cover-panel-fold-bottom', cutHeight - top_bottom_hem, cutWidth, 'fold', 'Bottom hem — fold to wrong side'));

  return {
    id: 'cover-panel',
    name: 'Book Cover Panel',
    mirror: false,
    quantity: 1,
    paths,
    annotations: [
      { kind: 'grain', label: 'Grain', point: pt(cutWidth / 2, cutHeight / 2), angle: 90 },
      { kind: 'label', label: `Book Cover Panel\nCut 1\n${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm` },
    ],
    seamAllowances: {
      'cover-panel-outline:e0': 0,
      'cover-panel-outline:e1': 0,
      'cover-panel-outline:e2': 0,
      'cover-panel-outline:e3': 0,
    },
  };
}

// Inner flap piece — sleeve that holds one side of the book cover.
// Laid out with the outer (sewn-to-body) edge at x=0 and the open
// sleeve-mouth edge at x=cutWidth. The mouth gets a hem.
function buildInnerFlapPiece(side: 'left' | 'right', r: ResolvedInputs): Piece {
  const { flap_depth, book_height, seam_allowance: SA, top_bottom_hem } = r;

  const cutWidth = flap_depth + SA + top_bottom_hem;
  const cutHeight = book_height + 2 * top_bottom_hem;

  const id = `inner-flap-${side}`;
  const name = side === 'left' ? 'Inner Flap (Left)' : 'Inner Flap (Right)';

  const outline = makeRectOutline(`${id}-outline`, cutWidth, cutHeight, 'cut');

  // Mouth hem on the inward-facing vertical edge
  const mouthHemX = cutWidth - top_bottom_hem;
  const mouthHem = makeVertLine(`${id}-fold-mouth`, mouthHemX, cutHeight, 'fold', 'Sleeve mouth — hem');

  return {
    id,
    name,
    mirror: false,
    quantity: 1,
    paths: [outline, mouthHem],
    annotations: [
      { kind: 'label', label: `${name}\nCut 1\n${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm` },
    ],
    seamAllowances: {
      [`${id}-outline:e0`]: 0,
      [`${id}-outline:e1`]: 0,
      [`${id}-outline:e2`]: 0,
      [`${id}-outline:e3`]: 0,
    },
  };
}

function buildPocketPiece(id: string, name: string, pocket: PocketConfig, SA: number, top_bottom_hem: number): Piece {
  const cutWidth = pocket.width + 2 * SA;
  const cutHeight = pocket.height + 2 * SA + top_bottom_hem;

  const outline = makeRectOutline(`${id}-outline`, cutWidth, cutHeight, 'cut');
  const hemFold = makeHorizLine(`${id}-fold-top`, top_bottom_hem, cutWidth, 'fold', 'Top hem — fold over for finished edge');

  return {
    id,
    name,
    mirror: false,
    quantity: 1,
    paths: [outline, hemFold],
    annotations: [
      { kind: 'label', label: `${name}\nCut 1\n${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm` },
    ],
    seamAllowances: {
      [`${id}-outline:e0`]: 0,
      [`${id}-outline:e1`]: 0,
      [`${id}-outline:e2`]: 0,
      [`${id}-outline:e3`]: 0,
    },
  };
}

function buildPenHolderPiece(ph: PenHolderConfig, SA: number): Piece {
  const stripHeight = ph.height ?? DEFAULT_PEN_HOLDER_HEIGHT_MM;
  const cutWidth = ph.count * ph.slot_width + 2 * SA;
  const cutHeight = stripHeight + 2 * SA;

  const outline = makeRectOutline('pen-holder-outline', cutWidth, cutHeight, 'cut');
  const paths: Path[] = [outline];

  // count - 1 vertical fold lines at SA + slot_width * i intervals
  for (let i = 1; i < ph.count; i++) {
    const x = SA + i * ph.slot_width;
    paths.push(makeVertLine(`pen-holder-fold-v${i - 1}`, x, cutHeight, 'fold', `Slot ${i} divider`));
  }

  return {
    id: 'pen-holder',
    name: 'Pen Holder Strip',
    mirror: false,
    quantity: 1,
    paths,
    annotations: [
      { kind: 'label', label: `Pen Holder Strip\nCut 1\n${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm` },
    ],
    seamAllowances: {
      'pen-holder-outline:e0': 0,
      'pen-holder-outline:e1': 0,
      'pen-holder-outline:e2': 0,
      'pen-holder-outline:e3': 0,
    },
  };
}

export function buildPattern(inputs: BookCoverInputs): Result<BookCoverBuildResult, BuildPatternError> {
  const validation = validateInputs(inputs);
  if (!validation.ok) return validation;

  const r: ResolvedInputs = resolveInputs(inputs);
  const { book_height, book_width, spine_width, seam_allowance: SA, top_bottom_hem } = r;

  const pieces: Piece[] = [
    buildCoverPanel(r),
    buildInnerFlapPiece('left', r),
    buildInnerFlapPiece('right', r),
  ];

  if (r.outer_pocket) {
    pieces.push(buildPocketPiece('outer-pocket', 'Outer Pocket', r.outer_pocket, SA, top_bottom_hem));
  }
  if (r.inner_pocket) {
    pieces.push(buildPocketPiece('inner-pocket', 'Inner Pocket', r.inner_pocket, SA, top_bottom_hem));
  }
  if (r.pen_holder) {
    pieces.push(buildPenHolderPiece(r.pen_holder, SA));
  }

  const cutWidth = 2 * book_width + spine_width + 2 * SA;
  const cutHeight = book_height + 2 * top_bottom_hem;

  const steps = buildSteps(r, cutWidth, cutHeight, pieces.length);
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

function buildSteps(r: ResolvedInputs, cutWidth: number, cutHeight: number, _pieceCount: number) {
  const { flap_depth, seam_allowance: SA, top_bottom_hem } = r;
  const flapCutWidth = flap_depth + SA + top_bottom_hem;
  const steps = [
    {
      id: 'book-cover.materials',
      title: 'Gather materials',
      body: `Main fabric: one body panel at ${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm plus two inner flap pieces at ${Math.round(flapCutWidth)} × ${Math.round(cutHeight)} mm each. Interfacing recommended for the body panel. Thread to match.`,
      dependsOn: [],
      refsPieces: ['cover-panel', 'inner-flap-left', 'inner-flap-right'],
      group: 'Preparation',
    },
    {
      id: 'book-cover.cut-panel',
      title: 'Cut the body and inner flap pieces',
      body: `Cut the body panel at ${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm and two inner flap pieces at ${Math.round(flapCutWidth)} × ${Math.round(cutHeight)} mm. The ${SA} mm seam allowances are already included. Mark the two vertical spine fold lines and the top/bottom hem fold lines on the body's wrong side, and the sleeve-mouth hem fold on each flap.`,
      dependsOn: ['book-cover.materials'],
      refsPieces: ['cover-panel', 'inner-flap-left', 'inner-flap-right'],
      group: 'Cutting',
    },
    {
      id: 'book-cover.flap-mouth-hems',
      title: 'Hem the inner flap sleeve mouths',
      body: `On each inner flap piece, fold the inward-facing vertical edge to the wrong side by ${top_bottom_hem} mm. Press and stitch 2 mm from the fold. This finished edge becomes the open mouth of each sleeve that the book cover slides into.`,
      dependsOn: ['book-cover.cut-panel'],
      refsPieces: ['inner-flap-left', 'inner-flap-right'],
      group: 'Construction',
    },
    {
      id: 'book-cover.attach-flaps',
      title: 'Attach inner flaps to body',
      body: `Lay the body panel right-side up. Place each inner flap right-side DOWN on top of the body, aligning the flap's outer (un-hemmed) vertical edge with the body's left and right short edges. The flap's hemmed mouth points inward toward the spine. Pin and stitch the outer vertical edge through both layers at ${SA} mm. Press the flap open so it folds back onto the body's wrong side, forming the inner sleeve. Baste the top and bottom edges of the flap to the body so they hold during the next step.`,
      dependsOn: ['book-cover.flap-mouth-hems'],
      refsPieces: ['cover-panel', 'inner-flap-left', 'inner-flap-right'],
      group: 'Construction',
    },
    {
      id: 'book-cover.hems',
      title: 'Press and stitch top and bottom hems',
      body: `Fold the top and bottom edges of the body to the wrong side by ${top_bottom_hem} mm (catching the basted flap edges in the fold). Press firmly. Stitch 2 mm from the folded edge on both top and bottom. This locks the flaps in place and finishes the top and bottom edges.`,
      dependsOn: ['book-cover.attach-flaps'],
      refsPieces: ['cover-panel', 'inner-flap-left', 'inner-flap-right'],
      group: 'Construction',
    },
  ];

  if (r.outer_pocket) {
    steps.push({
      id: 'book-cover.outer-pocket',
      title: 'Attach outer pocket',
      body: `Cut the outer pocket piece. Fold the top hem edge (${top_bottom_hem} mm) to the wrong side and stitch. Fold the remaining three edges in by ${SA} mm. Position on the cover and topstitch in place along the bottom and sides.`,
      dependsOn: ['book-cover.hems'],
      refsPieces: ['cover-panel', 'outer-pocket'],
      group: 'Accessories',
    });
  }
  if (r.inner_pocket) {
    steps.push({
      id: 'book-cover.inner-pocket',
      title: 'Attach inner pocket',
      body: `Cut the inner pocket piece. Finish the top edge with a ${top_bottom_hem} mm hem. Fold the remaining edges in by ${SA} mm. Sew to the lining panel before assembling the cover layers.`,
      dependsOn: ['book-cover.hems'],
      refsPieces: ['cover-panel', 'inner-pocket'],
      group: 'Accessories',
    });
  }
  if (r.pen_holder) {
    const ph = r.pen_holder;
    steps.push({
      id: 'book-cover.pen-holder',
      title: 'Assemble pen holder',
      body: `Cut the pen holder strip at ${Math.round(ph.count * ph.slot_width + 2 * SA)} mm wide. Fold long edges in by ${SA} mm and topstitch. Mark the ${ph.count - 1} divider fold lines and stitch through to create ${ph.count} individual pen slots of ${ph.slot_width} mm each.`,
      dependsOn: ['book-cover.hems'],
      refsPieces: ['cover-panel', 'pen-holder'],
      group: 'Accessories',
    });
  }

  return steps;
}

export { validateInputs, resolveInputs } from './inputs.js';
