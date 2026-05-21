import type { ToolItem, ToolRollSettings, ToolRollLayout, PatternWarning } from './types.js';
import { generateId } from '../../utils/ids.js';

// ── Tool validation ────────────────────────────────────────────────────────

export function validateTool(tool: ToolItem): PatternWarning[] {
  const warnings: PatternWarning[] = [];

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

  if (tool.name.trim() === '') {
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

export function validateSettings(settings: ToolRollSettings): PatternWarning[] {
  const warnings: PatternWarning[] = [];

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
