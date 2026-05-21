import type { ToolItem, ToolRollSettings } from './types.js';

/**
 * A group of tools that share a single pocket.
 * Single-tool groups represent unpaired tools (still rendered as one pocket).
 */
export type ToolGroup = {
  /** Stable id derived from member tool ids (or just the lone tool's id). */
  id: string;
  /** Underlying tools (1..groupMaxSize). Always sorted by height ascending. */
  tools: ToolItem[];
  /** Joined name for labels — e.g. "1/4\" wrench + 7mm wrench". */
  displayName: string;
  /** Whether this is a true merge of ≥2 tools (false for solo). */
  isMerged: boolean;
};

/**
 * Returns a synthetic ToolItem representing a group's combined dimensions:
 *  - width:        MAX across members (the pocket must fit the widest tool)
 *  - thickness:    SUM across members (combined bulk dictates pocket ease)
 *  - height:       MIN across members (pocket depth driven by the shortest tool —
 *                  so the shorter tool isn't lost inside an over-deep pocket)
 *  - visibleAmount: from the shortest tool (matches the chosen height)
 */
export function toolFromGroup(g: ToolGroup): ToolItem {
  if (g.tools.length === 1) return g.tools[0];
  const shortest = g.tools.reduce((a, b) => (a.height < b.height ? a : b));
  return {
    id: g.id,
    name: g.displayName,
    width: Math.max(...g.tools.map(t => t.width)),
    thickness: g.tools.reduce((s, t) => s + t.thickness, 0),
    height: shortest.height,
    visibleAmount: shortest.visibleAmount,
  };
}

/**
 * Groups tools by height similarity, greedily building runs whose height span
 * (max − min) stays within `groupHeightTolerance` and whose size stays within
 * `groupMaxSize`. The shortest tools get paired first because we sort ascending
 * before walking — so a 3-way tie naturally drops the tallest member into its
 * own group ("put the shorter wrenches together").
 *
 * When grouping is disabled, returns each tool as its own solo group.
 */
export function groupTools(tools: ToolItem[], settings: ToolRollSettings): ToolGroup[] {
  if (!settings.groupingEnabled || settings.groupMaxSize <= 1 || tools.length === 0) {
    return tools.map(t => ({
      id: t.id,
      tools: [t],
      displayName: t.name,
      isMerged: false,
    }));
  }

  const sorted = [...tools].sort((a, b) => a.height - b.height);
  const tolerance = Math.max(0, settings.groupHeightTolerance);
  const maxSize = Math.max(1, Math.floor(settings.groupMaxSize));

  const groups: ToolGroup[] = [];
  let current: ToolItem[] = [];

  const flush = () => {
    if (current.length === 0) return;
    const ids = current.map(t => t.id).join('+');
    const merged = current.length > 1;
    groups.push({
      id: merged ? `group-${ids}` : current[0].id,
      tools: [...current],
      displayName: current.map(t => t.name).join(' + '),
      isMerged: merged,
    });
    current = [];
  };

  for (const tool of sorted) {
    if (current.length === 0) {
      current.push(tool);
      continue;
    }
    const span = tool.height - current[0].height; // current[0] is the shortest (sorted asc)
    if (current.length < maxSize && span <= tolerance) {
      current.push(tool);
    } else {
      flush();
      current.push(tool);
    }
  }
  flush();
  return groups;
}
