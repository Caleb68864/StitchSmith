/**
 * The adapter every generator page hands to the shared export panel and
 * pattern preview. It is the only generator-specific code the export UI
 * needs: how to build the pattern, what allowance the exporters draw, the
 * steps for the instructions file, and the BOM to show under the cut list.
 */
import type { ReactNode } from 'react';
import type { Pattern } from '../../../lib/pattern-engine/graph/Pattern.js';
import type { Step } from '../../../lib/pattern-engine/instructions/Step.js';
import type { Hardware } from '../../../lib/pattern-engine/materials/Hardware.js';

/** The flat BOM row most generators emit ({ id, description, quantity, unit, notes }). */
export interface SimpleBomRow {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  notes?: string;
}

/** The structured BOM the Roll-Top and Book Cover emit. */
export interface StructuredBom {
  materials: { id?: string; name: string; notes?: string; widthMm?: number }[];
  hardware: { id?: string; name: string; quantity: number; notes?: string }[];
  notes?: string[];
}

export interface ExportAdapter {
  generatorId: string;
  projectName: string;
  /** Validation errors block every export. */
  hasErrors: boolean;
  /** Build the pattern for export, or null when it cannot be built. Called lazily per click. */
  buildPattern: () => Pattern | null;
  /** Seam allowance (mm) the exporters draw for pieces without per-edge allowances. */
  defaultSeamAllowance: number;
  /** Assembly steps for the Instructions download; omit to hide the button. */
  steps?: () => Step[] | null;
  /** Hardware for the engine cut list (the Tri-Zip's zipper/buckle list). */
  hardware?: () => Hardware[];
  /** Generator BOM shown under the engine cut list: flat rows, a structured BOM, or a custom renderer. */
  bom?: () => SimpleBomRow[] | StructuredBom | null;
  renderBom?: () => ReactNode;
}
