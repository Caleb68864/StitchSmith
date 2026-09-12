/**
 * Mag Pouch Generator — Input validation
 *
 * `validateInputs` is the single entry point for validating `MagPouchInputs`.
 * It returns either `{ ok: true }` or `{ ok: false; errors: Record<string,
 * string> }` where each key is a field name and the value is a human-readable
 * error message.
 */

import type { MagPouchInputs, ValidationResult, RetentionStyle, BottomStyle, MagPouchConstruction } from './types.js';
import { getMagazine } from './magazines.js';
import {
  DEFAULT_EASE_WIDTH_IN,
  DEFAULT_EASE_DEPTH_IN,
  DEFAULT_EXPOSED_PERCENTAGE,
  DEFAULT_HOOK_LENGTH_IN,
  DEFAULT_LOOP_LENGTH_IN,
  DEFAULT_CLOSURE_OVERLAP_IN,
  DEFAULT_SEAM_ALLOWANCE_IN,
  DEFAULT_CONSTRUCTION,
  DEFAULT_CELL_COUNT,
} from './defaults.js';
import { sweepInputs, stripNulls, unitsOf, type GuardSpec } from '../../utils/inputGuards.js';

/** Type/range guard run before the generator's own rules (hardening pass H1). */
const GUARD_SPEC: GuardSpec = {
  magazine: { kind: 'object' },
  retention: { kind: 'enum', allowed: ['flap_velcro', 'flap_snap', 'flap_fastex', 'open_top_bungee', 'velcro_dot', 'kydex_wedge', 'none'] },
  attachment: { kind: 'enum', allowed: ['pals', 'molle', 'malice', 'belt_loop', 'alice', 'velcro_panel'] },
  drainage: { kind: 'enum', allowed: ['open_corner', 'sewn_closed', 'grommet'] },
  construction: { kind: 'enum', allowed: ['folded_t', 'pleated_card'] },
  cell_count: { kind: 'count', max: 8 },
  cell_span: { kind: 'length', max: 200 },
  face_per_cell: { kind: 'length', max: 200 },
  bottom_style: { kind: 'enum', allowed: ['cradle', 'pleat', 'open'] },
  back_hem: { kind: 'length', max: 200 },
  face_end_hem: { kind: 'length', max: 200 },
  ak_face_hem: { kind: 'bool' },
  face_pals: { kind: 'bool' },
  interior_loop: { kind: 'bool' },
  ease_width: { kind: 'length', max: 200 },
  ease_depth: { kind: 'length', max: 200 },
  exposed_percentage: { kind: 'ratio' },
  hook_length: { kind: 'length', max: 200 },
  loop_length: { kind: 'length', max: 200 },
  closure_overlap: { kind: 'length', max: 200 },
  flap_length: { kind: 'length', max: 200 },
  grommet_size: { kind: 'enum', allowed: ['#0', '#1', '#2', '#4'] },
  pull_channel_depth: { kind: 'length', max: 200 },
  hourglass_aesthetic: { kind: 'bool' },
};

const VALID_SA: ReadonlySet<number> = new Set([0.25, 0.375, 0.5]);
const VALID_CONSTRUCTION: ReadonlySet<MagPouchConstruction> = new Set(['folded_t', 'pleated_card']);
const VALID_RETENTION: ReadonlySet<RetentionStyle> = new Set([
  'flap_velcro', 'flap_snap', 'flap_fastex', 'open_top_bungee', 'velcro_dot', 'kydex_wedge', 'none',
]);
const VALID_BOTTOM: ReadonlySet<BottomStyle> = new Set(['cradle', 'pleat', 'open']);

/** Maximum cells on one card — beyond this the card is a placard, not a pouch. */
export const MAX_CELL_COUNT = 8;

function finitePositive(v: unknown): v is number {
  return typeof v === 'number' && Number.isFinite(v) && v > 0;
}

/**
 * Validate `MagPouchInputs` and return a result object.
 *
 * The `errors` map keys are field names (`'width'`, `'thickness'`, etc.).
 * Multiple fields may fail simultaneously; all errors are collected.
 */
export function validateInputs(inputs: MagPouchInputs): ValidationResult {
  inputs = stripNulls(inputs);
  const guard = sweepInputs(inputs, GUARD_SPEC, unitsOf(inputs, 'in'));
  // Type/range issues are collected, not returned early, so the generator's own rules below still
  // report every other bad field at once (the settings panel highlights them all).
  const errors: Record<string, string> = Object.fromEntries(guard.map((g) => [g.field, g.message]));
  if (typeof inputs.magazine !== 'object' || inputs.magazine === null || !['predefined', 'custom'].includes((inputs.magazine as { mode?: unknown }).mode as string)) {
    return { ok: false, errors: { ...errors, magazine: 'magazine must be an object with mode "predefined" or "custom".' } };
  }
  if (inputs.seamAllowance === undefined) {
    errors['seamAllowance'] = 'seamAllowance is required: choose 0.25, 0.375 or 0.5.';
  }

  // ── Magazine dimensions ──────────────────────────────────────────────────────

  if (inputs.magazine.mode === 'predefined') {
    const id = inputs.magazine.presetId;
    if (!id) {
      errors['presetId'] = 'presetId is required when magazine.mode is "predefined".';
    } else {
      const entry = getMagazine(id);
      if (!entry) {
        errors['presetId'] = `Unknown magazine preset "${id}". ` +
          'Use one of the predefined IDs from magazines.ts.';
      }
    }
  } else {
    const { width, thickness, height } = inputs.magazine;
    if (!finitePositive(width)) {
      errors['width'] = 'width must be a positive finite number.';
    }
    if (!finitePositive(thickness)) {
      errors['thickness'] = 'thickness must be a positive finite number.';
    }
    if (!finitePositive(height)) {
      errors['height'] = 'height must be a positive finite number.';
    }
  }

  // ── Construction / cells ─────────────────────────────────────────────────────

  const construction = inputs.construction ?? DEFAULT_CONSTRUCTION;
  if (!VALID_CONSTRUCTION.has(construction)) {
    errors['construction'] = `construction must be folded_t or pleated_card (got ${String(construction)}).`;
  }

  const cellCount = inputs.cell_count ?? DEFAULT_CELL_COUNT;
  if (!Number.isInteger(cellCount) || cellCount < 1 || cellCount > MAX_CELL_COUNT) {
    errors['cell_count'] = `cell_count must be a whole number from 1 to ${MAX_CELL_COUNT} (got ${cellCount}).`;
  } else if (construction === 'folded_t' && cellCount !== 1) {
    errors['cell_count'] = 'The folded-T body is a single cell — switch construction to pleated_card for a multi-cell card.';
  }

  if (inputs.cell_span !== undefined && (!Number.isFinite(inputs.cell_span) || inputs.cell_span <= 0 || inputs.cell_span > 12)) {
    errors['cell_span'] = `cell_span must be a positive number of inches up to 12 (got ${inputs.cell_span}).`;
  }
  if (inputs.face_per_cell !== undefined && (!Number.isFinite(inputs.face_per_cell) || inputs.face_per_cell <= 0 || inputs.face_per_cell > 24)) {
    errors['face_per_cell'] = `face_per_cell must be a positive number of inches up to 24 (got ${inputs.face_per_cell}).`;
  }
  if (inputs.cell_span !== undefined && inputs.face_per_cell !== undefined &&
      Number.isFinite(inputs.cell_span) && Number.isFinite(inputs.face_per_cell) &&
      inputs.face_per_cell <= inputs.cell_span) {
    errors['face_per_cell'] = `face_per_cell (${inputs.face_per_cell}") must exceed cell_span (${inputs.cell_span}") — the face needs pucker to wrap the magazine.`;
  }
  if (inputs.bottom_style !== undefined && !VALID_BOTTOM.has(inputs.bottom_style)) {
    errors['bottom_style'] = `bottom_style must be cradle, pleat or open (got ${String(inputs.bottom_style)}).`;
  }
  for (const key of ['back_hem', 'face_end_hem'] as const) {
    const v = inputs[key];
    if (v !== undefined && (!Number.isFinite(v) || v < 0.25 || v > 2)) {
      errors[key] = `${key} must be between 0.25" and 2" (got ${v}).`;
    }
  }

  if (inputs.pull_channel_depth !== undefined && (!Number.isFinite(inputs.pull_channel_depth) || inputs.pull_channel_depth < 0 || inputs.pull_channel_depth > 4)) {
    errors['pull_channel_depth'] = `pull_channel_depth must be between 0 and 4" (got ${inputs.pull_channel_depth}).`;
  }

  // ── Retention ────────────────────────────────────────────────────────────────

  if (!VALID_RETENTION.has(inputs.retention)) {
    errors['retention'] = `Unknown retention style "${String(inputs.retention)}".`;
  }

  // ── Ease ─────────────────────────────────────────────────────────────────────

  const easeWidth = inputs.ease_width ?? DEFAULT_EASE_WIDTH_IN;
  const easeDepth = inputs.ease_depth ?? DEFAULT_EASE_DEPTH_IN;

  if (!Number.isFinite(easeWidth) || easeWidth < 0 || easeWidth > 1) {
    errors['ease_width'] =
      `ease_width must be a finite number in [0, 1"] (got ${easeWidth}).`;
  }
  if (!Number.isFinite(easeDepth) || easeDepth < 0 || easeDepth > 1) {
    errors['ease_depth'] =
      `ease_depth must be a finite number in [0, 1"] (got ${easeDepth}).`;
  }

  // ── Coverage ─────────────────────────────────────────────────────────────────

  const coverage = inputs.exposed_percentage ?? DEFAULT_EXPOSED_PERCENTAGE;
  if (!Number.isFinite(coverage) || coverage < 0.40 || coverage > 1.0) {
    errors['exposed_percentage'] =
      `coverage must be in [0.40, 1.0] (got ${coverage}).`;
  }

  // ── Seam allowance ───────────────────────────────────────────────────────────

  const sa = inputs.seamAllowance ?? DEFAULT_SEAM_ALLOWANCE_IN;
  if (!VALID_SA.has(sa as number)) {
    errors['seamAllowance'] =
      `seamAllowance must be one of 0.25, 0.375, or 0.5 (got ${sa}).`;
  }

  // ── Closure parameters ───────────────────────────────────────────────────────

  const hookLen = inputs.hook_length ?? DEFAULT_HOOK_LENGTH_IN;
  const loopLen = inputs.loop_length ?? DEFAULT_LOOP_LENGTH_IN;
  const overlap = inputs.closure_overlap ?? DEFAULT_CLOSURE_OVERLAP_IN;

  if (!Number.isFinite(hookLen) || hookLen < 0) {
    errors['hook_length'] = `hook_length must be a non-negative finite number (got ${hookLen}).`;
  }
  if (!Number.isFinite(loopLen) || loopLen < 0) {
    errors['loop_length'] = `loop_length must be a non-negative finite number (got ${loopLen}).`;
  }
  if (!Number.isFinite(overlap) || overlap < 0) {
    errors['closure_overlap'] =
      `closure_overlap must be a non-negative finite number (got ${overlap}).`;
  }

  // Flap length constraint checks
  const flapLen = inputs.flap_length;
  if (flapLen !== undefined) {
    if (!Number.isFinite(flapLen) || flapLen <= 0) {
      errors['flap_length'] =
        `flap_length must be a positive finite number (got ${flapLen}).`;
    } else {
      if (Number.isFinite(hookLen) && hookLen > flapLen) {
        errors['hook_length'] =
          `hook_length (${hookLen}") must not exceed flap_length (${flapLen}").`;
      }
      if (Number.isFinite(loopLen) && loopLen > flapLen) {
        errors['loop_length'] =
          `loop_length (${loopLen}") must not exceed flap_length (${flapLen}").`;
      }
    }
  }

  // overlap must not exceed min(hook, loop)
  if (
    Number.isFinite(hookLen) &&
    Number.isFinite(loopLen) &&
    Number.isFinite(overlap)
  ) {
    const minHL = Math.min(hookLen, loopLen);
    if (overlap > minHL) {
      errors['closure_overlap'] =
        `closure_overlap (${overlap}") must not exceed min(hook_length, loop_length) = ${minHL}".`;
    }
  }

  if (Object.keys(errors).length > 0) {
    return { ok: false, errors };
  }
  return { ok: true };
}
