import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import type { Piece, PieceAnnotation } from '../../lib/pattern-engine/graph/Piece.js';
import type { Path } from '../../lib/pattern-engine/graph/Path.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { BookCoverInputs, ResolvedInputs, BookCoverBuildResult, BuildPatternError, Result, PocketConfig, PenHolderConfig, ClosureConfig, ResolvedTacticalConfig } from './types.js';
import { validateInputs, resolveInputs } from './inputs.js';
import { buildBom } from './bom.js';
import { DEFAULT_PEN_HOLDER_HEIGHT_MM, CLOSURE_DEFAULTS } from './defaults.js';
import { offsetPolygon } from '../../lib/pattern-engine/geometry/offset.js';
import {
  point as pt,
  makeRectOutline,
  makeRoundedRectOutline,
  makeRoundedRectSaPath,
  makeVertLine,
  makeHorizLine,
  makePathFromPoints,
} from '../../lib/pattern-engine/geometry/paths.js';

function buildCoverPanel(r: ResolvedInputs): Piece {
  const { book_width, spine_width, book_height, seam_allowance: SA, top_bottom_hem } = r;
  const effectiveClosure = r.closure?.kind === 'none' ? undefined : r.closure;

  const cutWidth = 2 * book_width + spine_width + 2 * SA;
  const cutHeight = book_height + 2 * top_bottom_hem;

  let outline: Path;
  const extraPaths: Path[] = [];

  if (effectiveClosure?.kind === 'zipper') {
    const cornerR = effectiveClosure.corner_radius!;
    outline = makeRoundedRectOutline('cover-panel-outline', cutWidth, cutHeight, cornerR, 'cut');
    if (SA > 0) {
      const saPath = makeRoundedRectSaPath('cover-panel-sa-seam', cutWidth, cutHeight, cornerR, SA);
      if (saPath) extraPaths.push(saPath);
    }
  } else {
    outline = makeRectOutline('cover-panel-outline', cutWidth, cutHeight, 'cut');
    if (SA > 0) {
      const outlineVerts: Point[] = [
        pt(0, 0), pt(cutWidth, 0), pt(cutWidth, cutHeight), pt(0, cutHeight),
      ];
      const saResult = offsetPolygon(outlineVerts, -SA);
      if (saResult.ok && saResult.value) {
        extraPaths.push(makePathFromPoints('cover-panel-sa-seam', saResult.value, 'seam'));
      }
    }
  }

  const paths: Path[] = [outline, ...extraPaths];

  // Two vertical fold lines marking the spine boundaries
  const foldXs = [SA + book_width, SA + book_width + spine_width];
  const foldLabels = ['Front cover / spine', 'Spine / back cover'];
  foldXs.forEach((x, i) => {
    paths.push(makeVertLine(`cover-panel-fold-v${i}`, x, cutHeight, 'fold', foldLabels[i]));
  });

  // Two horizontal hem fold lines
  paths.push(makeHorizLine('cover-panel-fold-top', top_bottom_hem, cutWidth, 'fold', 'Top hem — fold to wrong side'));
  paths.push(makeHorizLine('cover-panel-fold-bottom', cutHeight - top_bottom_hem, cutWidth, 'fold', 'Bottom hem — fold to wrong side'));

  const seamAllowances: Record<string, number> = {};
  for (const edge of outline.edges) {
    seamAllowances[edge.id] = 0;
  }

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
    seamAllowances,
  };
}

// Inner flap piece — sleeve that holds one side of the book cover.
function buildInnerFlapPiece(side: 'left' | 'right', r: ResolvedInputs): Piece {
  const { flap_depth, book_height, seam_allowance: SA, top_bottom_hem } = r;

  const cutWidth = flap_depth + SA + top_bottom_hem;
  const cutHeight = book_height + 2 * top_bottom_hem;

  const id = `inner-flap-${side}`;
  const name = side === 'left' ? 'Inner Flap (Left)' : 'Inner Flap (Right)';

  const outline = makeRectOutline(`${id}-outline`, cutWidth, cutHeight, 'cut');

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

function buildFlapBuckleStrapPiece(closure: Extract<ClosureConfig, { kind: 'flap-buckle' }>, r: ResolvedInputs): Piece {
  const { book_width, spine_width, seam_allowance: SA } = r;
  const strapWidth = closure.strap_width ?? CLOSURE_DEFAULTS['flap-buckle'].strap_width;

  const cutWidth = book_width + spine_width + 2 * SA;
  const cutHeight = strapWidth + 2 * SA;

  const outline = makeRectOutline('flap-buckle-strap-outline', cutWidth, cutHeight, 'cut');

  return {
    id: 'flap-buckle-strap',
    name: 'Flap Buckle Strap',
    mirror: false,
    quantity: 1,
    paths: [outline],
    annotations: [
      { kind: 'label', label: `Flap Buckle Strap\nCut 1\n${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm` },
    ],
    seamAllowances: {
      'flap-buckle-strap-outline:e0': 0,
      'flap-buckle-strap-outline:e1': 0,
      'flap-buckle-strap-outline:e2': 0,
      'flap-buckle-strap-outline:e3': 0,
    },
  };
}

function addNotchAnnotations(piece: Piece, closure: ClosureConfig, r: ResolvedInputs): void {
  const { book_width, spine_width, book_height, seam_allowance: SA, top_bottom_hem } = r;
  const cutWidth = 2 * book_width + spine_width + 2 * SA;
  const cutHeight = book_height + 2 * top_bottom_hem;

  if (!piece.annotations) piece.annotations = [];

  if (closure.kind === 'snap') {
    const count = closure.count ?? CLOSURE_DEFAULTS.snap.count;
    const usableHeight = cutHeight - 2 * top_bottom_hem;
    for (let i = 0; i < count; i++) {
      const y = top_bottom_hem + usableHeight * (i + 1) / (count + 1);
      // Left short edge notch
      piece.annotations.push({
        kind: 'notch',
        label: `Snap ${i + 1} (left)`,
        point: pt(0, y),
      } as PieceAnnotation);
      // Right short edge notch
      piece.annotations.push({
        kind: 'notch',
        label: `Snap ${i + 1} (right)`,
        point: pt(cutWidth, y),
      } as PieceAnnotation);
    }
  } else if (closure.kind === 'elastic') {
    const attachOffset = closure.attach_offset ?? (cutHeight * 0.15);
    const cy = cutHeight / 2;
    // Two attachment notches on the back-cover-side short edge (right edge)
    piece.annotations.push({
      kind: 'notch',
      label: 'Elastic attach (top)',
      point: pt(cutWidth, cy - attachOffset),
    } as PieceAnnotation);
    piece.annotations.push({
      kind: 'notch',
      label: 'Elastic attach (bottom)',
      point: pt(cutWidth, cy + attachOffset),
    } as PieceAnnotation);
  }
}

function buildLiningPiece(r: ResolvedInputs): Piece {
  const { book_width, spine_width, book_height, seam_allowance: SA, top_bottom_hem } = r;
  const effectiveClosure = r.closure?.kind === 'none' ? undefined : r.closure;

  const cutWidth = 2 * book_width + spine_width + 2 * SA;
  const cutHeight = book_height + 2 * top_bottom_hem;

  let outline: Path;
  const extraPaths: Path[] = [];

  if (effectiveClosure?.kind === 'zipper') {
    const cornerR = effectiveClosure.corner_radius!;
    outline = makeRoundedRectOutline('lining-outline', cutWidth, cutHeight, cornerR, 'cut');
    if (SA > 0) {
      const saPath = makeRoundedRectSaPath('lining-sa-seam', cutWidth, cutHeight, cornerR, SA);
      if (saPath) extraPaths.push(saPath);
    }
  } else {
    outline = makeRectOutline('lining-outline', cutWidth, cutHeight, 'cut');
    if (SA > 0) {
      const outlineVerts: Point[] = [
        pt(0, 0), pt(cutWidth, 0), pt(cutWidth, cutHeight), pt(0, cutHeight),
      ];
      const saResult = offsetPolygon(outlineVerts, -SA);
      if (saResult.ok && saResult.value) {
        extraPaths.push(makePathFromPoints('lining-sa-seam', saResult.value, 'seam'));
      }
    }
  }

  const paths: Path[] = [outline, ...extraPaths];

  // Spine boundary fold lines (same as body) — no top/bottom hem folds (lining captured at perimeter)
  const foldXs = [SA + book_width, SA + book_width + spine_width];
  const foldLabels = ['Front cover / spine', 'Spine / back cover'];
  foldXs.forEach((x, i) => {
    paths.push(makeVertLine(`lining-fold-v${i}`, x, cutHeight, 'fold', foldLabels[i]));
  });

  const seamAllowances: Record<string, number> = {};
  for (const edge of outline.edges) {
    seamAllowances[edge.id] = 0;
  }

  return {
    id: 'lining',
    name: 'Lining Panel',
    mirror: false,
    quantity: 1,
    paths,
    annotations: [
      { kind: 'grain', label: 'Grain', point: pt(cutWidth / 2, cutHeight / 2), angle: 90 },
      { kind: 'label', label: `Lining Panel\nCut 1\n${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm` },
    ],
    seamAllowances,
  };
}

function buildCardSlotStackPiece(r: ResolvedInputs): Piece {
  const { book_width, card_slots } = r;
  const count = card_slots!.count;
  const slotH = card_slots!.slot_height!;
  const pieceW = book_width;

  // N cut-role rectangular paths (one per slot row) + N-1 fold-role topstitch dividers
  const paths: Path[] = [];

  for (let i = 0; i < count; i++) {
    const y0 = i * slotH;
    const y1 = (i + 1) * slotH;
    paths.push({
      id: `card-slot-stack-slot-${i}`,
      closed: true,
      edges: [
        { kind: 'straight', id: `card-slot-stack-slot-${i}:e0`, role: 'cut', start: pt(0, y0), end: pt(pieceW, y0) },
        { kind: 'straight', id: `card-slot-stack-slot-${i}:e1`, role: 'cut', start: pt(pieceW, y0), end: pt(pieceW, y1) },
        { kind: 'straight', id: `card-slot-stack-slot-${i}:e2`, role: 'cut', start: pt(pieceW, y1), end: pt(0, y1) },
        { kind: 'straight', id: `card-slot-stack-slot-${i}:e3`, role: 'cut', start: pt(0, y1), end: pt(0, y0) },
      ],
    });
  }

  for (let i = 1; i < count; i++) {
    const y = i * slotH;
    paths.push(makeHorizLine(`card-slot-stack-topstitch-${i - 1}`, y, pieceW, 'fold', `Card slot divider ${i}`));
  }

  const cutHeight = count * slotH;

  return {
    id: 'card-slot-stack',
    name: `Card Slot Stack (${count} slots)`,
    mirror: false,
    quantity: 1,
    paths,
    annotations: [
      { kind: 'label', label: `Card Slot Stack\nCut 1\n${Math.round(pieceW)} × ${Math.round(cutHeight)} mm` },
    ],
    seamAllowances: {},
  };
}

function buildBookmarkRibbonPiece(r: ResolvedInputs): Piece {
  const { book_height, bookmark_ribbon } = r;
  const count = bookmark_ribbon!.count;
  const widthMm = bookmark_ribbon!.width_mm!;
  const cutHeight = book_height + 50;

  const outline = makeRectOutline('bookmark-ribbon-outline', widthMm, cutHeight, 'cut');

  return {
    id: 'bookmark-ribbon',
    name: 'Bookmark Ribbon',
    mirror: false,
    quantity: count,
    paths: [outline],
    annotations: [
      { kind: 'label', label: `Bookmark Ribbon\nCut ${count}\n${Math.round(widthMm)} × ${Math.round(cutHeight)} mm` },
    ],
    seamAllowances: {},
  };
}

function buildInternalZipPocketPiece(r: ResolvedInputs): Piece {
  const { book_width, book_height, seam_allowance: SA, internal_zip_pocket } = r;
  const cutWidth = (internal_zip_pocket!.width ?? book_width) + 2 * SA;
  const cutHeight = (internal_zip_pocket!.height ?? Math.round(book_height * 0.4)) + 2 * SA;

  const outline = makeRectOutline('internal-zip-pocket-outline', cutWidth, cutHeight, 'cut');

  return {
    id: 'internal-zip-pocket',
    name: 'Internal Zip Pocket',
    mirror: false,
    quantity: 1,
    paths: [outline],
    annotations: [
      { kind: 'label', label: `Internal Zip Pocket\nCut 1\n${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm` },
      { kind: 'notch', label: 'Zipper install center (top)', point: pt(cutWidth / 2, SA) } as PieceAnnotation,
    ],
    seamAllowances: {
      'internal-zip-pocket-outline:e0': 0,
      'internal-zip-pocket-outline:e1': 0,
      'internal-zip-pocket-outline:e2': 0,
      'internal-zip-pocket-outline:e3': 0,
    },
  };
}

function buildMeshPocketPiece(r: ResolvedInputs): Piece {
  const { book_width, book_height, seam_allowance: SA, mesh_pocket } = r;
  const cutWidth = (mesh_pocket!.width ?? book_width) + 2 * SA;
  const cutHeight = (mesh_pocket!.height ?? Math.round(book_height * 0.5)) + 2 * SA;

  const outline = makeRectOutline('mesh-pocket-outline', cutWidth, cutHeight, 'cut');
  const paths: Path[] = [outline];

  if (mesh_pocket!.elastic_top) {
    paths.push(makeHorizLine('mesh-pocket-fold-elastic-top', SA, cutWidth, 'fold', 'Elastic top — fold and stitch channel'));
  }

  return {
    id: 'mesh-pocket',
    name: 'Mesh Pocket',
    mirror: false,
    quantity: 1,
    paths,
    annotations: [
      { kind: 'label', label: `Mesh Pocket\nCut 1\n${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm` },
    ],
    seamAllowances: {
      'mesh-pocket-outline:e0': 0,
      'mesh-pocket-outline:e1': 0,
      'mesh-pocket-outline:e2': 0,
      'mesh-pocket-outline:e3': 0,
    },
  };
}

function buildVelcroPanelPiece(tactical: ResolvedTacticalConfig, SA: number): Piece {
  const cutWidth = tactical.velcro_panel_width + 2 * SA;
  const cutHeight = tactical.velcro_panel_height + 2 * SA;

  const outline = makeRectOutline('velcro-panel-outline', cutWidth, cutHeight, 'cut');

  return {
    id: 'velcro-panel',
    name: 'Velcro Panel',
    mirror: false,
    quantity: 1,
    paths: [outline],
    annotations: [
      { kind: 'label', label: `Velcro Panel\nCut 1\n${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm` },
    ],
    seamAllowances: {},
  };
}

function buildRetentionStrapPiece(r: ResolvedInputs): Piece {
  const { book_height, seam_allowance: SA } = r;
  const strapWidth = 25.4;
  const cutWidth = strapWidth + 2 * SA;
  const cutHeight = book_height + 50 + 2 * SA;

  const outline = makeRectOutline('retention-strap-outline', cutWidth, cutHeight, 'cut');

  return {
    id: 'retention-strap',
    name: 'Retention Strap',
    mirror: false,
    quantity: 1,
    paths: [outline],
    annotations: [
      { kind: 'label', label: `Retention Strap\nCut 1\n${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm` },
    ],
    seamAllowances: {},
  };
}

function buildSpareMagPocketPiece(r: ResolvedInputs): Piece {
  const { book_width, book_height, seam_allowance: SA } = r;
  const pocketW = Math.round(book_width * 0.4);
  const pocketH = Math.round(book_height * 0.5);
  const cutWidth = pocketW + 2 * SA;
  const cutHeight = pocketH + 2 * SA;

  const outline = makeRectOutline('spare-mag-pocket-outline', cutWidth, cutHeight, 'cut');

  return {
    id: 'spare-mag-pocket',
    name: 'Spare Magazine Pocket',
    mirror: false,
    quantity: 1,
    paths: [outline],
    annotations: [
      { kind: 'label', label: `Spare Magazine Pocket\nCut 1\n${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm` },
    ],
    seamAllowances: {},
  };
}

export function buildPattern(inputs: BookCoverInputs): Result<BookCoverBuildResult, BuildPatternError> {
  const validation = validateInputs(inputs);
  if (!validation.ok) return validation;

  const r: ResolvedInputs = resolveInputs(inputs);
  const { book_height, book_width, spine_width, seam_allowance: SA, top_bottom_hem } = r;
  const effectiveClosure = r.closure?.kind === 'none' ? undefined : r.closure;

  const bodyPiece = buildCoverPanel(r);

  if (effectiveClosure?.kind === 'snap' || effectiveClosure?.kind === 'elastic') {
    addNotchAnnotations(bodyPiece, effectiveClosure, r);
  }

  const pieces: Piece[] = [
    bodyPiece,
    buildInnerFlapPiece('left', r),
    buildInnerFlapPiece('right', r),
  ];

  if (effectiveClosure?.kind === 'flap-buckle') {
    pieces.push(buildFlapBuckleStrapPiece(effectiveClosure, r));
  }

  if (r.lining?.enabled) {
    pieces.push(buildLiningPiece(r));
    if (r.card_slots) {
      pieces.push(buildCardSlotStackPiece(r));
    }
    if (r.bookmark_ribbon) {
      pieces.push(buildBookmarkRibbonPiece(r));
    }
    if (r.internal_zip_pocket) {
      pieces.push(buildInternalZipPocketPiece(r));
    }
    if (r.mesh_pocket) {
      pieces.push(buildMeshPocketPiece(r));
    }
  }

  if (r.tactical?.enabled) {
    pieces.push(buildVelcroPanelPiece(r.tactical, SA));
    if (r.tactical.retention_strap) {
      pieces.push(buildRetentionStrapPiece(r));
    }
    if (r.tactical.spare_mag_pocket) {
      pieces.push(buildSpareMagPocketPiece(r));
    }
  }

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

function buildStepsWithLining(r: ResolvedInputs, cutWidth: number, cutHeight: number): Step[] {
  const { book_width, seam_allowance: SA, top_bottom_hem, flap_depth } = r;
  const effectiveClosure = r.closure?.kind === 'none' ? undefined : r.closure;
  const flapCutWidth = flap_depth + SA + top_bottom_hem;

  const piecesList = ['cover panel', 'lining panel', 'two inner flap pieces'];
  if (r.card_slots) piecesList.push('card slot stack');
  if (r.bookmark_ribbon) piecesList.push(`${r.bookmark_ribbon.count} bookmark ribbon${r.bookmark_ribbon.count > 1 ? 's' : ''}`);
  if (r.internal_zip_pocket) piecesList.push('internal zip pocket panel');
  if (r.mesh_pocket) piecesList.push('mesh pocket panel');
  if (r.tactical?.enabled) {
    piecesList.push('Velcro panel');
    if (r.tactical.retention_strap) piecesList.push('retention strap');
  }

  const interfacingKind = r.lining?.interfacing ?? 'fusible';
  const interfacingNote = interfacingKind === 'none'
    ? 'No interfacing selected.'
    : interfacingKind === 'hdpe' || interfacingKind === 'eva'
    ? `Insert ${interfacingKind.toUpperCase()} sheet (${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm) into the body panel before assembling.`
    : `Apply ${interfacingKind} interfacing to the wrong side of the body panel (${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm). Press according to manufacturer instructions.`;

  const internalFeaturesBody = buildInternalFeaturesBody(r, SA, top_bottom_hem);

  const steps: Step[] = [
    {
      id: 'book-cover.cut',
      title: 'Cut all pieces',
      body: `Cut: ${piecesList.join(', ')}. Body panel ${Math.round(cutWidth)} × ${Math.round(cutHeight)} mm; lining panel same dimensions; each inner flap ${Math.round(flapCutWidth)} × ${Math.round(cutHeight)} mm. Seam allowance of ${SA} mm is included in all dimensions.`,
      dependsOn: [],
      refsPieces: ['cover-panel', 'lining', 'inner-flap-left', 'inner-flap-right'],
      group: 'Preparation',
    },
    {
      id: 'book-cover.interfacing',
      title: 'Apply interfacing',
      body: interfacingNote,
      dependsOn: ['book-cover.cut'],
      refsPieces: ['cover-panel'],
      group: 'Preparation',
    },
    {
      id: 'book-cover.internal-features',
      title: 'Assemble internal features',
      body: internalFeaturesBody,
      dependsOn: ['book-cover.interfacing'],
      refsPieces: ['lining'],
      group: 'Construction',
    },
    {
      id: 'book-cover.sleeves',
      title: 'Prepare sleeve flaps',
      body: `On each inner flap piece, fold the inward-facing vertical edge (sleeve mouth) to the wrong side by ${top_bottom_hem} mm. Press and stitch 2 mm from the fold. This finished edge becomes the open mouth of each sleeve.`,
      dependsOn: ['book-cover.internal-features'],
      refsPieces: ['inner-flap-left', 'inner-flap-right'],
      group: 'Construction',
    },
    {
      id: 'book-cover.perimeter',
      title: 'Stitch perimeter',
      body: `Place inner flaps on the body right-side-down, aligning outer vertical edges. Stitch outer vertical edges at ${SA} mm. Press flaps open. Place lining and body right-sides together; pin perimeter. Stitch the top and bottom edges at ${SA} mm, catching all layers. Turn right side out; press. Topstitch ${top_bottom_hem} mm from the top and bottom edges, locking flaps and lining in place.`,
      dependsOn: ['book-cover.sleeves'],
      refsPieces: ['cover-panel', 'lining', 'inner-flap-left', 'inner-flap-right'],
      group: 'Construction',
    },
    {
      id: 'book-cover.closure',
      title: 'Install closure',
      body: buildClosureBody(effectiveClosure, r, cutWidth, cutHeight, SA),
      dependsOn: ['book-cover.perimeter'],
      refsPieces: ['cover-panel'],
      group: 'Closure',
    },
    {
      id: 'book-cover.fit-test',
      title: 'Fit test',
      body: `Insert the book into the cover. Both inner sleeves should hold the covers snugly. The spine fold lines (${Math.round(book_width)} mm from each short edge) should align with the book's spine. If the fit is loose, adjust the spine fold lines; if tight, check the ${SA} mm seam allowances.`,
      dependsOn: ['book-cover.closure'],
      refsPieces: ['cover-panel'],
      group: 'Finishing',
    },
  ];

  return steps;
}

function buildInternalFeaturesBody(r: ResolvedInputs, _SA: number, _top_bottom_hem: number): string {
  const parts: string[] = [];
  if (r.card_slots) {
    const count = r.card_slots.count;
    const slotH = r.card_slots.slot_height ?? 57;
    parts.push(`Assemble the ${count}-slot card stack (${count} × ${Math.round(slotH)} mm slots); topstitch dividers.`);
  }
  if (r.internal_zip_pocket) {
    parts.push('Construct the internal zip pocket and install the zipper before attaching to the lining.');
  }
  if (r.mesh_pocket) {
    const elastic = r.mesh_pocket.elastic_top ? ' Thread elastic through the top channel.' : '';
    parts.push(`Hem the mesh pocket perimeter.${elastic}`);
  }
  if (r.bookmark_ribbon) {
    const count = r.bookmark_ribbon.count;
    parts.push(`Baste ${count} grosgrain ribbon${count > 1 ? 's' : ''} to the top edge of the lining panel before closing the perimeter.`);
  }
  if (r.tactical?.enabled) {
    parts.push('Sew the Velcro loop panel to the designated zone on the lining or body front face. If retention strap: assemble webbing with hook tab and bar-tack to the cover spine area.');
  }
  if (parts.length === 0) {
    parts.push('No internal features configured. Proceed to sleeve preparation.');
  }
  return parts.join(' ');
}

function buildClosureBody(
  closure: import('./types.js').ClosureConfig | undefined,
  _r: ResolvedInputs,
  cutWidth: number,
  cutHeight: number,
  _SA: number
): string {
  if (!closure) return 'No closure configured. The cover wraps around the book without hardware.';
  if (closure.kind === 'zipper') {
    const gauge = closure.gauge;
    const cornerR = closure.corner_radius ?? CLOSURE_DEFAULTS_ZIPPER[gauge];
    const perimeterMm = Math.round(2 * cutHeight + cutWidth);
    return `Install a ${gauge} coil zipper around the U-shaped perimeter (${perimeterMm} mm). Clip the seam allowance at the rounded corners (radius ${Math.round(cornerR)} mm). Topstitch 2 mm from the teeth.`;
  }
  if (closure.kind === 'elastic') {
    const widthMm = closure.width_mm ?? CLOSURE_DEFAULTS.elastic.width_mm;
    return `Attach ${widthMm} mm wide elastic to the back cover short edge notch marks. Adjust tension before final stitching.`;
  }
  if (closure.kind === 'snap') {
    const count = closure.count ?? CLOSURE_DEFAULTS.snap.count;
    return `Install ${count} snap${count > 1 ? 's' : ''} at the notch marks on both short edges.`;
  }
  if (closure.kind === 'flap-buckle') {
    const strapWidth = closure.strap_width ?? CLOSURE_DEFAULTS['flap-buckle'].strap_width;
    const buckleSize = closure.buckle_size ?? CLOSURE_DEFAULTS['flap-buckle'].buckle_size;
    return `Prepare the ${strapWidth} mm wide flap strap with ${buckleSize} mm buckle. Attach to the spine center on the back cover face.`;
  }
  return 'No closure configured.';
}

function buildSteps(r: ResolvedInputs, cutWidth: number, cutHeight: number, _pieceCount: number) {
  if (r.lining?.enabled) {
    return buildStepsWithLining(r, cutWidth, cutHeight);
  }

  const { flap_depth, seam_allowance: SA, top_bottom_hem } = r;
  const effectiveClosure = r.closure?.kind === 'none' ? undefined : r.closure;
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

  const lastBodyStep = steps[steps.length - 1]?.id ?? 'book-cover.hems';

  if (effectiveClosure?.kind === 'zipper') {
    const gauge = effectiveClosure.gauge;
    const cornerR = effectiveClosure.corner_radius ?? CLOSURE_DEFAULTS_ZIPPER[gauge];
    // U-shape perimeter: top + two sides + bottom = 2*(cutHeight) + cutWidth (approximation for rounded-corner U)
    const perimeterMm = Math.round(2 * cutHeight + cutWidth);
    steps.push({
      id: 'book-cover.zipper-install',
      title: 'Install zipper',
      body: `Install a ${gauge} coil zipper around the U-shaped perimeter of the cover (${perimeterMm} mm). The zipper runs along the top edge, down both short sides, and back along the bottom. The rounded corners (radius ${Math.round(cornerR)} mm) ease the zipper tape around the bends — clip the tape seam allowance at the arcs. Align the zipper tape with the ${SA} mm seam line on the wrong side and topstitch 2 mm from the teeth.`,
      dependsOn: [lastBodyStep],
      refsPieces: ['cover-panel'],
      group: 'Closure',
    });
  } else if (effectiveClosure?.kind === 'elastic') {
    const widthMm = effectiveClosure.width_mm ?? CLOSURE_DEFAULTS.elastic.width_mm;
    steps.push({
      id: 'book-cover.elastic-attach',
      title: 'Attach elastic closure',
      body: `Cut elastic to ${widthMm} mm wide. Thread the elastic through the channel on the back cover's short edge between the two notch marks and tack each end securely. The elastic wraps around the closed cover front to hold the book shut. Adjust tension before final stitching.`,
      dependsOn: [lastBodyStep],
      refsPieces: ['cover-panel'],
      group: 'Closure',
    });
  } else if (effectiveClosure?.kind === 'snap') {
    const count = effectiveClosure.count ?? CLOSURE_DEFAULTS.snap.count;
    steps.push({
      id: 'book-cover.snap-install',
      title: 'Install snap closures',
      body: `Install ${count} magnetic or sew-on snap${count > 1 ? 's' : ''} at the notch marks on both short edges. The snaps are spaced symmetrically about the horizontal centerline of the cover. For sew-on snaps, backstitch through all layers for strength; for magnetic snaps, use a washer backing on the inside face.`,
      dependsOn: [lastBodyStep],
      refsPieces: ['cover-panel'],
      group: 'Closure',
    });
  } else if (effectiveClosure?.kind === 'flap-buckle') {
    const strapWidth = effectiveClosure.strap_width ?? CLOSURE_DEFAULTS['flap-buckle'].strap_width;
    const buckleSize = effectiveClosure.buckle_size ?? CLOSURE_DEFAULTS['flap-buckle'].buckle_size;
    steps.push(
      {
        id: 'book-cover.flap-buckle-strap',
        title: 'Prepare flap buckle strap',
        body: `Cut the strap piece at ${strapWidth} mm wide. Fold long edges in by ${SA} mm and press. Fold in half lengthwise, press again, and topstitch both long edges. Thread one end through a ${buckleSize} mm buckle and fold back ${SA * 2} mm; stitch through to secure the buckle.`,
        dependsOn: [lastBodyStep],
        refsPieces: ['flap-buckle-strap'],
        group: 'Closure',
      },
      {
        id: 'book-cover.flap-buckle-attach',
        title: 'Attach strap to cover',
        body: `Sew the strap to the spine on the back cover side, centered vertically. The free strap end extends across the front cover face to a bar-tack receiver point. Fold the loose end back to create a keeper loop or sew a D-ring for adjustable length.`,
        dependsOn: ['book-cover.flap-buckle-strap'],
        refsPieces: ['cover-panel', 'flap-buckle-strap'],
        group: 'Closure',
      }
    );
  }

  return steps;
}

const CLOSURE_DEFAULTS_ZIPPER: Record<'#3' | '#5' | '#10', number> = {
  '#3': 19.05,
  '#5': 31.75,
  '#10': 50.8,
};

export { validateInputs, resolveInputs } from './inputs.js';
