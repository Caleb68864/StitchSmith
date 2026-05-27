import type { ToolItem, ToolRollSettings, ToolRollLayout } from './tool-roll/types.js';
import { calculateToolRollLayout } from './tool-roll/calculateToolRollLayout.js';

/**
 * Generic interface that every pattern generator must implement.
 * TSettings = generator-specific settings type
 * TInput    = list item type (tools, panels, etc.)
 * TLayout   = computed layout output type
 */
export interface PatternGenerator<TSettings, TInput, TLayout> {
  /** Unique identifier for this generator */
  id: string;
  /** Human-readable name */
  name: string;
  /** Compute a layout from inputs and settings */
  calculate: (inputs: TInput[], settings: TSettings, units: 'mm' | 'in') => TLayout;
}

export const toolRollGenerator: PatternGenerator<ToolRollSettings, ToolItem, ToolRollLayout> = {
  id: 'tool-roll',
  name: 'Tool Roll Generator',
  calculate: calculateToolRollLayout,
};
