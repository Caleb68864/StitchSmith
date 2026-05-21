import type { UnitSystem, PrintPaperSize, PrintOrientation } from '../../utils/units.js';
export type { UnitSystem, PrintPaperSize, PrintOrientation };

// ── Enums ──────────────────────────────────────────────────────────────────

export type SortMode =
  | 'manual'
  | 'widthAscending'
  | 'widthDescending'
  | 'heightAscending'
  | 'heightDescending'
  | 'pocketDepthAscending'
  | 'pocketDepthDescending';

export type PocketTopStyle = 'stepped' | 'sloped' | 'smooth' | 'arc';

export type PocketHeightMode = 'individual' | 'steppedToIncrement' | 'sameAsTallest';

/**
 * How each pocket's depth is derived from the tool dimensions.
 * - 'visibleAmount': pocketDepth = height - visibleAmount (per-tool field)
 * - 'heightPercentage': pocketDepth = height * pocketHeightPercentage (global)
 */
export type PocketDepthMode = 'visibleAmount' | 'heightPercentage';

export type FlapHeightMode =
  | 'fixed'                  // Use `flapHeight` directly
  | 'basedOnTallestTool'     // Cover the tallest tool's visible portion + overlap
  | 'basedOnPocketDepth'     // Tied to pocket depth (legacy mode)
  | 'shortestTool'           // Cover the shortest tool's visible portion + overlap (rectangle)
  | 'matchPockets';          // Profile matches pocket top (mirrored) so every tool gets identical overlap

/** When the flap follows a per-tool profile, this controls how the bottom edge connects between tools. */
export type FlapTopStyle = 'stepped' | 'sloped' | 'smooth' | 'arc';

export type TiePlacementMode = 'centered' | 'basedOnRollDiameter' | 'manual';

export type LabelMode = 'none' | 'toolNames' | 'toolNamesAndDimensions';

// ── Core data types ────────────────────────────────────────────────────────

export type ToolItem = {
  id: string;
  name: string;
  /** Width of the tool in mm */
  width: number;
  /** Thickness of the tool in mm */
  thickness: number;
  /** Total height of the tool in mm */
  height: number;
  /** How much of the tool sticks out above the pocket top in mm */
  visibleAmount: number;
  lockedOrder?: number;
  notes?: string;
};

export type ToolRollProject = {
  schemaVersion: 1;
  projectName: string;
  generatorId: 'tool-roll';
  units: UnitSystem;
  settings: ToolRollSettings;
  tools: ToolItem[];
  createdAt: string;
  updatedAt: string;
};

export type ToolRollSettings = {
  // Units & Sorting
  sortMode: SortMode;

  // Pocket
  pocketTopStyle: PocketTopStyle;
  pocketHeightMode: PocketHeightMode;
  pocketHeightIncrement: number;
  /** How pocket depth is derived: per-tool visibleAmount, or a percentage of tool height. */
  pocketDepthMode: PocketDepthMode;
  /** Fraction (0..1) of tool.height used as pocket depth when pocketDepthMode === 'heightPercentage'. Default 0.75. */
  pocketHeightPercentage: number;
  /** When true, tools within `groupHeightTolerance` mm of each other in height get merged into a single pocket. */
  groupingEnabled: boolean;
  /** Max height delta (mm) within a group — tools whose heights span ≤ this can share a pocket. */
  groupHeightTolerance: number;
  /** Max number of tools per merged pocket (e.g. 2 pairs SAE with metric, 3 packs trios, etc.). */
  groupMaxSize: number;
  sideGap: number;
  thicknessEaseFactor: number;
  minimumPocketWidth: number;
  pocketBottomAllowance: number;

  // Seam / Hems
  seamAllowance: number;
  topHemAllowance: number;
  bottomHemAllowance: number;
  sideHemAllowance: number;
  bindingAllowance: number;

  // Layout margins
  topMargin: number;
  bottomMargin: number;

  // Flap
  flapEnabled: boolean;
  flapHeightMode: FlapHeightMode;
  /** Fixed flap height in mm (used when flapHeightMode === 'fixed'). */
  flapHeight: number;
  /** How far past each pocket top the flap reaches when folded. mm. */
  flapOverlap: number;
  /** Shape of the flap's bottom edge when flapHeightMode === 'matchPockets'. */
  flapTopStyle: FlapTopStyle;
  flapHemAllowance: number;
  flapSeamAllowance: number;

  // Tie
  tieEnabled: boolean;
  tiePlacementMode: TiePlacementMode;
  tieWidth: number;
  tieLength: number;
  tiePositionX: number;

  // Print
  printPaperSize: PrintPaperSize;
  printOrientation: PrintOrientation;
  printMargin: number;
  tileOverlap: number;

  // Display options
  showGrid: boolean;
  showStitchLines: boolean;
  showFoldLines: boolean;
  showHemLines: boolean;
  showSeamLines: boolean;
  showLabels: boolean;
  showDimensionLines: boolean;
  showTileGrid: boolean;
  labelMode: LabelMode;
};

// ── Geometry primitives ────────────────────────────────────────────────────

export type Point = { x: number; y: number };

export type BoundingBox = { x: number; y: number; width: number; height: number };

export type SvgPathData = string;

// ── Line / mark / label entities ──────────────────────────────────────────

export type StitchLine = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
};

export type FoldLine = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
};

export type HemLine = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
};

export type SeamAllowanceLine = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  label?: string;
};

export type Notch = {
  id: string;
  x: number;
  y: number;
  angle: number;
  length: number;
};

export type TieMark = {
  id: string;
  x: number;
  y: number;
  width: number;
  label?: string;
};

export type PatternLabel = {
  id: string;
  x: number;
  y: number;
  text: string;
  fontSize?: number;
  anchor?: 'start' | 'middle' | 'end';
  /** Rotation in degrees about (x, y). Used for vertical pocket labels (e.g. -90). */
  rotate?: number;
};

export type DimensionLine = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  labelText: string;
  offset: number;
};

export type PatternWarning = {
  id: string;
  severity: 'info' | 'warning' | 'error';
  message: string;
  field?: string;
  toolId?: string;
};

// ── Panel shapes ───────────────────────────────────────────────────────────

export type PanelShape = {
  cutPath: SvgPathData;
  stitchPath?: SvgPathData;
  boundingBox: BoundingBox;
};

export type PocketPanelShape = {
  cutPath: SvgPathData;
  stitchPath?: SvgPathData;
  boundingBox: BoundingBox;
};

// ── Pocket layout ──────────────────────────────────────────────────────────

export type PocketLayout = {
  id: string;
  toolId: string;
  toolName: string;
  pocketWidth: number;
  pocketDepth: number;
  /** Left edge X of this pocket in pattern coordinates */
  x: number;
  /** Top edge Y of this pocket in pattern coordinates */
  y: number;
  topY: number;
  bottomY: number;
  widthWasForced: boolean;
};

// ── Print layout ───────────────────────────────────────────────────────────

export type PrintTile = {
  id: string;
  row: number;
  column: number;
  pageNumber: number;
  /** X offset into the pattern (mm) where this tile starts */
  x: number;
  /** Y offset into the pattern (mm) where this tile starts */
  y: number;
  /** Paper width in mm */
  width: number;
  /** Paper height in mm */
  height: number;
  viewBox: string;
  label: string;
};

export type PrintLayout = {
  paperSize: PrintPaperSize;
  orientation: PrintOrientation;
  paperWidth: number;
  paperHeight: number;
  printableWidth: number;
  printableHeight: number;
  columns: number;
  rows: number;
  totalPages: number;
  pages: PrintTile[];
};

// ── Top-level layout ───────────────────────────────────────────────────────

export type ToolRollLayout = {
  patternWidth: number;
  patternHeight: number;
  units: UnitSystem;
  pockets: PocketLayout[];
  backPanel: PanelShape;
  pocketPanel: PocketPanelShape;
  flap?: PanelShape;
  stitchLines: StitchLine[];
  foldLines: FoldLine[];
  hemLines: HemLine[];
  seamAllowanceLines: SeamAllowanceLine[];
  notches: Notch[];
  tieMarks: TieMark[];
  labels: PatternLabel[];
  dimensionLines: DimensionLine[];
  warnings: PatternWarning[];
  constructionNotes: string[];
  printLayout: PrintLayout;
};
