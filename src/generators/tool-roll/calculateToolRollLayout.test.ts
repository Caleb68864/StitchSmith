import { describe, it, expect } from 'vitest';
import { calculateToolRollLayout } from './calculateToolRollLayout.js';
import { defaultToolRollSettings, sampleTools } from './defaults.js';
import type { ToolRollSettings } from './types.js';

describe('calculateToolRollLayout', () => {
  it('returns patternWidth > 0', () => {
    const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');
    expect(layout.patternWidth).toBeGreaterThan(0);
  });

  it('returns patternHeight > 0', () => {
    const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');
    expect(layout.patternHeight).toBeGreaterThan(0);
  });

  it('returns exactly 4 pockets for sampleTools (4 tools)', () => {
    const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');
    expect(layout.pockets).toHaveLength(4);
  });

  it('returns a backPanel with a cutPath and boundingBox', () => {
    const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');
    expect(layout.backPanel).toBeDefined();
    expect(layout.backPanel.cutPath).toBeTruthy();
    expect(layout.backPanel.boundingBox.width).toBeGreaterThan(0);
    expect(layout.backPanel.boundingBox.height).toBeGreaterThan(0);
  });

  it('returns a pocketPanel with a cutPath and boundingBox', () => {
    const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');
    expect(layout.pocketPanel).toBeDefined();
    expect(layout.pocketPanel.cutPath).toBeTruthy();
    expect(layout.pocketPanel.boundingBox.width).toBeGreaterThan(0);
    expect(layout.pocketPanel.boundingBox.height).toBeGreaterThan(0);
  });

  it('returns a flap when flapEnabled is true (default)', () => {
    expect(defaultToolRollSettings.flapEnabled).toBe(true);
    const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');
    expect(layout.flap).toBeDefined();
    expect(layout.flap!.cutPath).toBeTruthy();
  });

  it('returns no flap when flapEnabled is false', () => {
    const settings: ToolRollSettings = { ...defaultToolRollSettings, flapEnabled: false };
    const layout = calculateToolRollLayout(sampleTools, settings, 'mm');
    expect(layout.flap).toBeUndefined();
  });

  it('returns a printLayout with columns and rows > 0', () => {
    const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');
    expect(layout.printLayout.columns).toBeGreaterThan(0);
    expect(layout.printLayout.rows).toBeGreaterThan(0);
  });

  it('returns constructionNotes array', () => {
    const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');
    expect(Array.isArray(layout.constructionNotes)).toBe(true);
    expect(layout.constructionNotes.length).toBeGreaterThan(0);
  });

  it('pockets have positive pocketWidth and pocketDepth', () => {
    const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');
    for (const pocket of layout.pockets) {
      expect(pocket.pocketWidth).toBeGreaterThan(0);
      expect(pocket.pocketDepth).toBeGreaterThan(0);
    }
  });

  it('pockets are ordered left-to-right (x increases)', () => {
    const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');
    for (let i = 1; i < layout.pockets.length; i++) {
      expect(layout.pockets[i].x).toBeGreaterThan(layout.pockets[i - 1].x);
    }
  });

  it('works with a single tool', () => {
    const layout = calculateToolRollLayout([sampleTools[0]], defaultToolRollSettings, 'mm');
    expect(layout.pockets).toHaveLength(1);
    expect(layout.patternWidth).toBeGreaterThan(0);
  });

  it('works with empty tools array', () => {
    const layout = calculateToolRollLayout([], defaultToolRollSettings, 'mm');
    expect(layout.pockets).toHaveLength(0);
    expect(layout.patternWidth).toBeGreaterThanOrEqual(0);
  });

  it('units field is set correctly', () => {
    const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'in');
    expect(layout.units).toBe('in');
  });

  it('sameAsTallest mode sets all pockets to the same depth', () => {
    const settings: ToolRollSettings = {
      ...defaultToolRollSettings,
      pocketHeightMode: 'sameAsTallest',
    };
    const layout = calculateToolRollLayout(sampleTools, settings, 'mm');
    const depths = layout.pockets.map(p => p.pocketDepth);
    const allSame = depths.every(d => d === depths[0]);
    expect(allSame).toBe(true);
  });
});
