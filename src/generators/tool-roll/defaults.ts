import type { ToolRollSettings, ToolItem } from './types.js';

export const defaultToolRollSettings: ToolRollSettings = {
  // Units & Sorting
  sortMode: 'manual',

  // Pocket geometry
  pocketTopStyle: 'stepped',
  pocketHeightMode: 'individual',
  pocketHeightIncrement: 5,
  pocketDepthMode: 'heightPercentage',
  pocketHeightPercentage: 0.75,
  groupingEnabled: false,
  groupHeightTolerance: 15,  // mm
  groupMaxSize: 2,
  sideGap: 3,
  thicknessEaseFactor: 0.5,
  minimumPocketWidth: 30,
  pocketBottomAllowance: 9.5,

  // Seam / Hems (all in mm; sewing-domain values — do not change without human approval)
  seamAllowance: 9.5,      // 3/8"
  topHemAllowance: 25.4,   // 1"
  bottomHemAllowance: 9.5, // 3/8"
  sideHemAllowance: 9.5,   // 3/8"
  pocketTopHemAllowance: 12.7, // 1/2" — folded under the top edge of the pocket panel
  bindingAllowance: 0,

  // Layout margins
  topMargin: 19,    // 3/4"
  bottomMargin: 12.7, // 1/2"

  // Flap
  flapEnabled: true,
  flapHeightMode: 'matchPockets',
  flapHeight: 50.8,         // 2" — only used when flapHeightMode === 'fixed'
  flapOverlap: 25.4,        // 1" — how much past each pocket top the flap reaches when folded
  flapTopStyle: 'arc',
  flapHemAllowance: 9.5,    // 3/8"
  flapSeamAllowance: 9.5,   // 3/8"

  // Tie
  tieEnabled: true,
  tiePlacementMode: 'centered',
  tieWidth: 25.4,   // 1"
  tieLength: 609.6, // 24"
  tiePositionX: 0,

  // Print defaults (Letter portrait, 1/2" margin + overlap)
  printPaperSize: 'letter',
  printOrientation: 'portrait',
  printMargin: 12.7,  // 1/2"
  tileOverlap: 12.7,  // 1/2"

  // Display options
  showGrid: true,
  showStitchLines: true,
  showFoldLines: true,
  showHemLines: true,
  showSeamLines: true,
  showLabels: true,
  showDimensionLines: true,
  showTileGrid: false,
  labelMode: 'toolNames',
};

// Four combination wrenches used as starter / sample project data (§38)
export const sampleTools: ToolItem[] = [
  {
    id: 'sample-wrench-8mm',
    name: '8 mm Wrench',
    width: 18,
    thickness: 6,
    height: 160,
    visibleAmount: 50,
  },
  {
    id: 'sample-wrench-10mm',
    name: '10 mm Wrench',
    width: 21,
    thickness: 7,
    height: 175,
    visibleAmount: 55,
  },
  {
    id: 'sample-wrench-12mm',
    name: '12 mm Wrench',
    width: 24,
    thickness: 8,
    height: 190,
    visibleAmount: 60,
  },
  {
    id: 'sample-wrench-15mm',
    name: '15 mm Wrench',
    width: 28,
    thickness: 9,
    height: 205,
    visibleAmount: 65,
  },
];
