import { describe, it, expect } from 'vitest';
import { validateTool, validateSettings, validateLayout } from './validation.js';
import { defaultToolRollSettings, sampleTools } from './defaults.js';
import { calculateToolRollLayout } from './calculateToolRollLayout.js';
import type { ToolItem } from './types.js';

// ── validateTool ───────────────────────────────────────────────────────────

describe('validateTool', () => {
  it('returns no warnings for a valid tool', () => {
    expect(validateTool(sampleTools[0])).toHaveLength(0);
  });

  it('returns an error when visibleAmount >= height (equal)', () => {
    const tool: ToolItem = {
      id: 't1',
      name: 'Bad Tool',
      width: 10,
      height: 100,
      thickness: 0,
      visibleAmount: 100,
    };
    const warnings = validateTool(tool);
    expect(warnings.length).toBeGreaterThanOrEqual(1);
    const err = warnings.find(w => w.field === 'visibleAmount' && w.severity === 'error');
    expect(err).toBeDefined();
    expect(err?.message).toMatch(/visibleAmount must be less than height/i);
  });

  it('returns an error when visibleAmount > height', () => {
    const tool: ToolItem = { id: 't2', name: 'X', width: 20, height: 80, thickness: 3, visibleAmount: 90 };
    const warnings = validateTool(tool);
    expect(warnings.some(w => w.severity === 'error' && w.field === 'visibleAmount')).toBe(true);
  });

  it('returns an error for zero width', () => {
    const tool: ToolItem = { id: 't3', name: 'X', width: 0, height: 100, thickness: 3, visibleAmount: 20 };
    const warnings = validateTool(tool);
    expect(warnings.some(w => w.severity === 'error' && w.field === 'width')).toBe(true);
  });

  it('returns an error for zero height', () => {
    const tool: ToolItem = { id: 't4', name: 'X', width: 20, height: 0, thickness: 3, visibleAmount: 0 };
    const warnings = validateTool(tool);
    expect(warnings.some(w => w.severity === 'error' && w.field === 'height')).toBe(true);
  });

  it('returns an error for negative thickness', () => {
    const tool: ToolItem = { id: 't5', name: 'X', width: 20, height: 100, thickness: -1, visibleAmount: 20 };
    const warnings = validateTool(tool);
    expect(warnings.some(w => w.severity === 'error' && w.field === 'thickness')).toBe(true);
  });

  it('returns a warning for empty tool name', () => {
    const tool: ToolItem = { id: 't6', name: '', width: 20, height: 100, thickness: 3, visibleAmount: 20 };
    const warnings = validateTool(tool);
    expect(warnings.some(w => w.field === 'name')).toBe(true);
  });

  it('returns an error for NaN and non-numeric dimensions (comparison guards miss these)', () => {
    const nan = validateTool({ ...sampleTools[0], width: NaN });
    expect(nan.some(w => w.field === 'width' && w.severity === 'error')).toBe(true);
    const str = validateTool({ ...sampleTools[0], height: '120' as unknown as number });
    expect(str.some(w => w.field === 'height' && w.severity === 'error')).toBe(true);
  });

  it('attaches toolId to warnings', () => {
    const tool: ToolItem = { id: 'my-id', name: 'X', width: 0, height: 100, thickness: 3, visibleAmount: 20 };
    const warnings = validateTool(tool);
    expect(warnings.every(w => w.toolId === 'my-id')).toBe(true);
  });
});

// ── validateSettings ───────────────────────────────────────────────────────

describe('validateSettings', () => {
  it('returns an error for a NaN setting', () => {
    const w = validateSettings({ ...defaultToolRollSettings, minimumPocketWidth: NaN });
    expect(w.some(x => x.field === 'minimumPocketWidth' && x.severity === 'error')).toBe(true);
  });

  it('returns no warnings for default settings', () => {
    expect(validateSettings(defaultToolRollSettings)).toHaveLength(0);
  });

  it('warns when minimumPocketWidth is 0', () => {
    const s = { ...defaultToolRollSettings, minimumPocketWidth: 0 };
    expect(validateSettings(s).some(w => w.field === 'minimumPocketWidth')).toBe(true);
  });

  it('warns when flapEnabled but flapHeight is 0', () => {
    const s = { ...defaultToolRollSettings, flapEnabled: true, flapHeight: 0 };
    expect(validateSettings(s).some(w => w.field === 'flapHeight')).toBe(true);
  });
});

// ── validateLayout ─────────────────────────────────────────────────────────

describe('validateLayout', () => {
  it('returns no errors for a valid layout', () => {
    const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');
    const warnings = validateLayout(layout);
    const errors = warnings.filter(w => w.severity === 'error');
    expect(errors).toHaveLength(0);
  });
});
