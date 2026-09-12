import type { ToolItem, ToolRollSettings, ToolRollLayout, PatternWarning } from './types.js';
import { generateId } from '../../utils/ids.js';

// ── Tool validation ────────────────────────────────────────────────────────

const TOOL_NUMERIC_FIELDS = ['width', 'height', 'thickness', 'visibleAmount'] as const;
/** A tool longer than 2 m is a typo, not a tool. */
const TOOL_MAX_MAGNITUDE = 2000;

export function validateTool(tool: ToolItem): PatternWarning[] {
  const warnings: PatternWarning[] = [];

  // Comparison guards below are all false for NaN (and for strings from a
  // hand-edited project file), so check finiteness explicitly first.
  for (const field of TOOL_NUMERIC_FIELDS) {
    if (!Number.isFinite(tool[field])) {
      warnings.push({
        id: generateId('warn'),
        severity: 'error',
        message: `Tool ${field} must be a finite number`,
        field,
        toolId: tool.id,
      });
    } else if (Math.abs(tool[field]) > TOOL_MAX_MAGNITUDE) {
      warnings.push({
        id: generateId('warn'),
        severity: 'error',
        message: `Tool ${field} is out of range (${tool[field]}); a tool longer than ${TOOL_MAX_MAGNITUDE} mm will not fit any roll`,
        field,
        toolId: tool.id,
      });
    }
  }

  if (tool.visibleAmount >= tool.height) {
    warnings.push({
      id: generateId('warn'),
      severity: 'error',
      message: 'visibleAmount must be less than height',
      field: 'visibleAmount',
      toolId: tool.id,
    });
  }

  if (tool.width <= 0) {
    warnings.push({
      id: generateId('warn'),
      severity: 'error',
      message: 'Tool width must be greater than 0',
      field: 'width',
      toolId: tool.id,
    });
  }

  if (tool.height <= 0) {
    warnings.push({
      id: generateId('warn'),
      severity: 'error',
      message: 'Tool height must be greater than 0',
      field: 'height',
      toolId: tool.id,
    });
  }

  if (tool.thickness < 0) {
    warnings.push({
      id: generateId('warn'),
      severity: 'error',
      message: 'Tool thickness cannot be negative',
      field: 'thickness',
      toolId: tool.id,
    });
  }

  if (tool.visibleAmount < 0) {
    warnings.push({
      id: generateId('warn'),
      severity: 'error',
      message: 'visibleAmount cannot be negative',
      field: 'visibleAmount',
      toolId: tool.id,
    });
  }

  if (typeof tool.name !== 'string' || tool.name.trim() === '') {
    warnings.push({
      id: generateId('warn'),
      severity: 'warning',
      message: 'Tool name is empty',
      field: 'name',
      toolId: tool.id,
    });
  }

  return warnings;
}

// ── Settings validation ────────────────────────────────────────────────────

const SETTINGS_NUMERIC_FIELDS = [
  'seamAllowance',
  'minimumPocketWidth',
  'pocketHeightIncrement',
  'pocketHeightPercentage',
  'tileOverlap',
  'groupHeightTolerance',
  'groupMaxSize',
  'sideGap',
  'thicknessEaseFactor',
  'pocketBottomAllowance',
  'topHemAllowance',
  'bottomHemAllowance',
  'sideHemAllowance',
  'pocketTopHemAllowance',
  'bindingAllowance',
  'topMargin',
  'bottomMargin',
  'flapHeight',
  'flapOverlap',
  'flapHemAllowance',
  'flapSeamAllowance',
  'tieWidth',
  'tieLength',
  'tiePositionX',
  'printMargin',
] as const;

/** Nothing on a tool roll is longer than 5 m / 200"; beyond this the layout allocates until it dies. */
const SETTINGS_MAX_MAGNITUDE = 5000;

const SETTINGS_ENUM_FIELDS: { [K in keyof ToolRollSettings]?: readonly string[] } = {
  sortMode: ['manual', 'widthAscending', 'widthDescending', 'heightAscending', 'heightDescending', 'pocketDepthAscending', 'pocketDepthDescending'],
  pocketTopStyle: ['stepped', 'sloped', 'smooth', 'arc'],
  pocketHeightMode: ['individual', 'steppedToIncrement', 'sameAsTallest'],
  pocketDepthMode: ['visibleAmount', 'heightPercentage'],
  flapHeightMode: ['fixed', 'basedOnTallestTool', 'basedOnPocketDepth', 'shortestTool', 'matchPockets'],
  flapTopStyle: ['stepped', 'sloped', 'smooth', 'arc'],
  tiePlacementMode: ['centered', 'manual'],
  labelMode: ['none', 'toolNames', 'toolNamesAndDimensions'],
  printPaperSize: ['letter', 'a4'],
  printOrientation: ['portrait', 'landscape'],
};

export function validateSettings(settings: ToolRollSettings): PatternWarning[] {
  const warnings: PatternWarning[] = [];

  for (const field of SETTINGS_NUMERIC_FIELDS) {
    const v = settings[field];
    if (!Number.isFinite(v)) {
      warnings.push({
        id: generateId('warn'),
        severity: 'error',
        message: `${field} must be a finite number`,
        field,
      });
    } else if (Math.abs(v) > SETTINGS_MAX_MAGNITUDE) {
      warnings.push({
        id: generateId('warn'),
        severity: 'error',
        message: `${field} is out of range (${v}); nothing on a tool roll is longer than ${SETTINGS_MAX_MAGNITUDE} mm`,
        field,
      });
    }
  }

  for (const [field, allowed] of Object.entries(SETTINGS_ENUM_FIELDS) as [keyof ToolRollSettings, readonly string[]][]) {
    const v = settings[field];
    if (typeof v !== 'string' || !allowed.includes(v)) {
      warnings.push({
        id: generateId('warn'),
        severity: 'error',
        message: `${field} must be one of ${allowed.join(', ')}`,
        field,
      });
    }
  }

  if (settings.seamAllowance <= 0) {
    warnings.push({
      id: generateId('warn'),
      severity: 'warning',
      message: 'Seam allowance should be greater than 0',
      field: 'seamAllowance',
    });
  }

  if (settings.minimumPocketWidth <= 0) {
    warnings.push({
      id: generateId('warn'),
      severity: 'error',
      message: 'Minimum pocket width must be greater than 0',
      field: 'minimumPocketWidth',
    });
  }

  if (settings.pocketHeightIncrement <= 0 && settings.pocketHeightMode === 'steppedToIncrement') {
    warnings.push({
      id: generateId('warn'),
      severity: 'error',
      message: 'Pocket height increment must be greater than 0 when using steppedToIncrement mode',
      field: 'pocketHeightIncrement',
    });
  }

  if (settings.pocketDepthMode === 'heightPercentage') {
    if (
      settings.pocketHeightPercentage <= 0 ||
      settings.pocketHeightPercentage >= 1
    ) {
      warnings.push({
        id: generateId('warn'),
        severity: 'error',
        message: 'Pocket height percentage must be between 0 and 1 (exclusive)',
        field: 'pocketHeightPercentage',
      });
    }
  }

  if (settings.tileOverlap < 0) {
    warnings.push({
      id: generateId('warn'),
      severity: 'warning',
      message: 'Tile overlap should not be negative',
      field: 'tileOverlap',
    });
  }

  if (settings.printMargin < 0) {
    warnings.push({
      id: generateId('warn'),
      severity: 'warning',
      message: 'Print margin should not be negative',
      field: 'printMargin',
    });
  }

  if (settings.flapEnabled && settings.flapHeight <= 0) {
    warnings.push({
      id: generateId('warn'),
      severity: 'warning',
      message: 'Flap height should be greater than 0 when flap is enabled',
      field: 'flapHeight',
    });
  }

  return warnings;
}

// ── Layout validation ──────────────────────────────────────────────────────

export function validateLayout(layout: ToolRollLayout): PatternWarning[] {
  const warnings: PatternWarning[] = [];

  if (layout.pockets.length === 0) {
    warnings.push({
      id: generateId('warn'),
      severity: 'warning',
      message: 'No pockets defined — add at least one tool',
    });
  }

  if (layout.patternWidth <= 0) {
    warnings.push({
      id: generateId('warn'),
      severity: 'error',
      message: 'Pattern width is zero or negative',
      field: 'patternWidth',
    });
  }

  if (layout.patternHeight <= 0) {
    warnings.push({
      id: generateId('warn'),
      severity: 'error',
      message: 'Pattern height is zero or negative',
      field: 'patternHeight',
    });
  }

  for (const pocket of layout.pockets) {
    if (pocket.pocketDepth <= 0) {
      warnings.push({
        id: generateId('warn'),
        severity: 'warning',
        message: `Pocket for "${pocket.toolName}" has zero or negative depth — check visibleAmount vs height`,
        field: 'pocketDepth',
        toolId: pocket.toolId,
      });
    }
  }

  return warnings;
}
