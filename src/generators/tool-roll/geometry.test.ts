import { describe, it, expect } from 'vitest';
import {
  calculatePocketDepth,
  calculatePocketWidth,
  sortTools,
  calculatePrintLayout,
} from './geometry.js';
import { defaultToolRollSettings, sampleTools } from './defaults.js';
import type { ToolItem, ToolRollSettings } from './types.js';

// ── calculatePocketDepth ───────────────────────────────────────────────────

describe('calculatePocketDepth', () => {
  it('returns height minus visibleAmount', () => {
    expect(calculatePocketDepth({ height: 100, visibleAmount: 30 })).toBe(70);
  });

  it('returns 0 when tool fills exactly', () => {
    expect(calculatePocketDepth({ height: 50, visibleAmount: 50 })).toBe(0);
  });

  it('uses sample tool values correctly', () => {
    // 8mm wrench: height 160, visible 50 → depth 110
    expect(calculatePocketDepth(sampleTools[0])).toBe(110);
  });
});

// ── calculatePocketWidth ───────────────────────────────────────────────────

describe('calculatePocketWidth', () => {
  const baseTool: ToolItem = {
    id: 't1',
    name: 'Test',
    width: 40,
    thickness: 10,
    height: 200,
    visibleAmount: 60,
  };

  it('computes natural width correctly', () => {
    // natural = 40 + 10*0.5 + 3*2 = 40 + 5 + 6 = 51
    const { width, widthWasForced } = calculatePocketWidth(baseTool, defaultToolRollSettings);
    expect(width).toBeCloseTo(51);
    expect(widthWasForced).toBe(false);
  });

  it('honors minimumPocketWidth floor', () => {
    const narrowTool: ToolItem = { ...baseTool, width: 5, thickness: 1 };
    // natural = 5 + 1*0.5 + 3*2 = 11.5 < 30 (minimumPocketWidth)
    const { width, widthWasForced } = calculatePocketWidth(narrowTool, defaultToolRollSettings);
    expect(width).toBe(defaultToolRollSettings.minimumPocketWidth);
    expect(widthWasForced).toBe(true);
  });

  it('returns minimumPocketWidth when natural width equals minimum exactly', () => {
    // Craft a tool so natural width = minimumPocketWidth exactly (30)
    // natural = w + t*0.5 + 6 = 30 → w + t*0.5 = 24
    const exactTool: ToolItem = { ...baseTool, width: 20, thickness: 8 };
    // natural = 20 + 8*0.5 + 6 = 30
    const { width, widthWasForced } = calculatePocketWidth(exactTool, defaultToolRollSettings);
    expect(width).toBe(30);
    expect(widthWasForced).toBe(false);
  });

  it('respects custom minimumPocketWidth', () => {
    const settings: ToolRollSettings = { ...defaultToolRollSettings, minimumPocketWidth: 60 };
    // Even baseTool natural (51) < 60 → forced
    const { width, widthWasForced } = calculatePocketWidth(baseTool, settings);
    expect(width).toBe(60);
    expect(widthWasForced).toBe(true);
  });
});

// ── sortTools ─────────────────────────────────────────────────────────────

const toolA: ToolItem = { id: 'a', name: 'A', width: 10, thickness: 2, height: 100, visibleAmount: 20, lockedOrder: 2 };
const toolB: ToolItem = { id: 'b', name: 'B', width: 30, thickness: 5, height: 200, visibleAmount: 50, lockedOrder: 1 };
const toolC: ToolItem = { id: 'c', name: 'C', width: 20, thickness: 3, height: 150, visibleAmount: 80 };

describe('sortTools', () => {
  it('manual: sorts by lockedOrder (tools without lockedOrder come last)', () => {
    const sorted = sortTools([toolA, toolB, toolC], { ...defaultToolRollSettings, sortMode: 'manual' });
    expect(sorted[0].id).toBe('b'); // lockedOrder 1
    expect(sorted[1].id).toBe('a'); // lockedOrder 2
    expect(sorted[2].id).toBe('c'); // no lockedOrder → Infinity
  });

  it('widthAscending: sorts by width ascending', () => {
    const sorted = sortTools([toolA, toolB, toolC], { ...defaultToolRollSettings, sortMode: 'widthAscending' });
    expect(sorted.map(t => t.id)).toEqual(['a', 'c', 'b']); // 10, 20, 30
  });

  it('widthDescending: sorts by width descending', () => {
    const sorted = sortTools([toolA, toolB, toolC], { ...defaultToolRollSettings, sortMode: 'widthDescending' });
    expect(sorted.map(t => t.id)).toEqual(['b', 'c', 'a']); // 30, 20, 10
  });

  it('heightAscending: sorts by height ascending', () => {
    const sorted = sortTools([toolA, toolB, toolC], { ...defaultToolRollSettings, sortMode: 'heightAscending' });
    expect(sorted.map(t => t.id)).toEqual(['a', 'c', 'b']); // 100, 150, 200
  });

  it('heightDescending: sorts by height descending', () => {
    const sorted = sortTools([toolA, toolB, toolC], { ...defaultToolRollSettings, sortMode: 'heightDescending' });
    expect(sorted.map(t => t.id)).toEqual(['b', 'c', 'a']); // 200, 150, 100
  });

  it('pocketDepthAscending: sorts by depth ascending', () => {
    // visibleAmount mode → depths: a=80, b=150, c=70
    const sorted = sortTools([toolA, toolB, toolC], { ...defaultToolRollSettings, pocketDepthMode: 'visibleAmount', sortMode: 'pocketDepthAscending' });
    expect(sorted.map(t => t.id)).toEqual(['c', 'a', 'b']); // 70, 80, 150
  });

  it('pocketDepthDescending: sorts by depth descending', () => {
    // visibleAmount mode → depths: a=80, b=150, c=70
    const sorted = sortTools([toolA, toolB, toolC], { ...defaultToolRollSettings, pocketDepthMode: 'visibleAmount', sortMode: 'pocketDepthDescending' });
    expect(sorted.map(t => t.id)).toEqual(['b', 'a', 'c']); // 150, 80, 70
  });

  it('pocketDepthAscending with heightPercentage mode sorts by tool height', () => {
    // heightPercentage = 0.75 → depths: a=75, b=150, c=112.5 (proportional to height)
    const sorted = sortTools(
      [toolA, toolB, toolC],
      { ...defaultToolRollSettings, pocketDepthMode: 'heightPercentage', pocketHeightPercentage: 0.75, sortMode: 'pocketDepthAscending' },
    );
    expect(sorted.map(t => t.id)).toEqual(['a', 'c', 'b']);
  });

  it('does not mutate the input array', () => {
    const original = [toolA, toolB, toolC];
    const originalIds = original.map(t => t.id);
    sortTools(original, { ...defaultToolRollSettings, sortMode: 'widthAscending' });
    expect(original.map(t => t.id)).toEqual(originalIds);
  });
});

// ── calculatePrintLayout ───────────────────────────────────────────────────

describe('calculatePrintLayout', () => {
  it('600×350 mm on Letter portrait 12.7 mm margin 12.7 mm overlap → columns≥3 rows≥2', () => {
    const settings: ToolRollSettings = {
      ...defaultToolRollSettings,
      printPaperSize: 'letter',
      printOrientation: 'portrait',
      printMargin: 12.7,
      tileOverlap: 12.7,
    };
    const layout = calculatePrintLayout(600, 350, settings);
    expect(layout.columns).toBeGreaterThanOrEqual(3);
    expect(layout.rows).toBeGreaterThanOrEqual(2);
  });

  it('returns a page for every tile', () => {
    const layout = calculatePrintLayout(400, 300, defaultToolRollSettings);
    expect(layout.pages.length).toBe(layout.columns * layout.rows);
    expect(layout.totalPages).toBe(layout.columns * layout.rows);
  });

  it('all tiles have non-empty viewBox strings', () => {
    const layout = calculatePrintLayout(300, 200, defaultToolRollSettings);
    for (const tile of layout.pages) {
      expect(tile.viewBox).toBeTruthy();
    }
  });
});
