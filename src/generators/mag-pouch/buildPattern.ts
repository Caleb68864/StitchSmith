/**
 * Mag Pouch Generator — buildPattern
 *
 * Orchestrates the full pattern generation pipeline:
 *   toPouchSpec() → buildPouch() → attachment → drainage → BOM → steps
 *
 * Public exports:
 *   - `buildPattern(inputs)` — main entry point
 *   - `detectAkProfile(dims)` — AK-magazine dimension check
 *   - `AK_WARNING_COPY`       — canonical warning string for tests / UI
 */

import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Step } from '../../lib/pattern-engine/instructions/Step.js';
import { buildPouch } from '../../lib/pouch-engine/index.js';
import { buildAttachment } from '../../lib/pouch-engine/components/attachment.js';
import { buildDrainage } from '../../lib/pouch-engine/components/drainage.js';
import type {
  MagPouchInputs,
  MagPouchBuildResult,
  MagPouchBom,
  MagPouchBomMaterial,
  MagPouchBomHardware,
} from './types.js';
import { toPouchSpec } from './toPouchSpec.js';
import { buildMandatorySteps } from './steps.js';
import {
  AK_THRESHOLD_HEIGHT_IN,
  AK_THRESHOLD_THICKNESS_IN,
} from './unsupportedMagazines.js';
import {
  DEFAULT_EASE_WIDTH_IN,
  DEFAULT_EASE_DEPTH_IN,
} from './defaults.js';
import { getMagazine } from './magazines.js';

// ─── AK profile detection ─────────────────────────────────────────────────────

/**
 * Canonical AK warning copy, as documented in the v1 design.
 *
 * Tests use substring match against this string via `AK_WARNING_COPY`.
 */
export const AK_WARNING_COPY =
  'AK-pattern magazine dimensions detected (height ≥ 8.5", thickness ≥ 1.05"). ' +
  'This pouch is optimized for AR-15 family magazines. AK-style magazines have a ' +
  'curved body that may not fit correctly in a straight folded-T construction. ' +
  'Verify fit with a physical mock-up before cutting final fabric.';

/**
 * Check whether a set of magazine dimensions (in inches) matches an AK-pattern
 * profile.  Returns the canonical warning string if the profile is matched, or
 * `undefined` otherwise.
 *
 * Matching rule:
 *   height ≥ AK_THRESHOLD_HEIGHT_IN  AND  thickness ≥ AK_THRESHOLD_THICKNESS_IN
 *
 * Test fixtures:
 *   - { width: 2.5, thickness: 1.05, height: 7.5 } → undefined (height fails)
 *   - { width: 2.5, thickness: 1.05, height: 9.0 } → AK_WARNING_COPY  (both pass)
 *   - { width: 2.7, thickness: 1.0,  height: 9.0 } → undefined (thickness fails)
 */
export function detectAkProfile(dims: {
  width: number;
  thickness: number;
  height: number;
}): string | undefined {
  if (
    dims.height >= AK_THRESHOLD_HEIGHT_IN &&
    dims.thickness >= AK_THRESHOLD_THICKNESS_IN
  ) {
    return AK_WARNING_COPY;
  }
  return undefined;
}

// ─── BOM builder ──────────────────────────────────────────────────────────────

function buildBom(inputs: MagPouchInputs, finishedHeightMm: number): MagPouchBom {
  const materials: MagPouchBomMaterial[] = [];
  const hardware: MagPouchBomHardware[] = [];

  // Body fabric — always present
  materials.push({
    id: 'body-fabric',
    name: 'Main Body Fabric (exterior)',
    type: 'fabric',
    notes: 'Cordura 500D or equivalent; cut per pattern.',
  });

  // Retention hardware / materials
  switch (inputs.retention) {
    case 'flap_velcro':
      materials.push(
        {
          id: 'velcro-hook',
          name: 'Velcro Hook-Side Strip',
          type: 'velcro-hook',
          notes: 'Cut to hook_length.',
        },
        {
          id: 'velcro-loop',
          name: 'Velcro Loop-Side Strip',
          type: 'velcro-loop',
          notes: 'Cut to loop_length.',
        },
      );
      break;

    case 'flap_snap':
      hardware.push({
        id: 'snap',
        name: 'Sew-On Snap Fastener',
        type: 'snap',
        quantity: 1,
        notes: 'Line 24 snap or equivalent (15 mm); stud on flap, socket on body.',
      });
      break;

    case 'flap_fastex':
      hardware.push({
        id: 'fastex-buckle',
        name: 'Fastex Side-Release Buckle',
        type: 'fastex',
        quantity: 1,
        notes: '25 mm (1") fastex/side-release buckle; adjust strap through adjustment bar.',
      });
      break;

    case 'open_top_bungee':
      materials.push({
        id: 'bungee-cord',
        name: 'Bungee / Shock Cord',
        type: 'cord',
        notes: '3 mm diameter elastic shock cord; length = pouch width + 150 mm.',
      });
      hardware.push({
        id: 'cord-lock',
        name: 'Cord Lock',
        type: 'cord-lock',
        quantity: 2,
        notes: 'Barrel-type cord lock; one per cord end.',
      });
      break;
  }

  // Attachment webbing — pals/molle and belt_loop both use 1" webbing
  if (
    inputs.attachment === 'pals' ||
    inputs.attachment === 'molle' ||
    inputs.attachment === 'belt_loop'
  ) {
    materials.push({
      id: 'attachment-webbing',
      name: '25 mm (1”) Nylon Webbing',
      type: 'webbing',
      notes:
        inputs.attachment === 'belt_loop'
          ? 'Cut to belt width + 25 mm × 2 for overlap; fold in half lengthwise.'
          : `Cut to required strap count × (finished height + 50 mm fold-over). Finished height: ${finishedHeightMm.toFixed(0)} mm.`,
    });
  }

  // Drainage hardware
  if (inputs.drainage === 'grommet') {
    const size = inputs.grommet_size ?? '#0';
    hardware.push({
      id: 'grommet',
      name: `${size} Grommet (drainage)`,
      type: 'grommet',
      quantity: 1,
      notes: `${size} grommet at bottom-center of body; use grommet setter.`,
    });
  }

  return { materials, hardware };
}

// ─── Main entry point ─────────────────────────────────────────────────────────

/**
 * Generate a complete mag-pouch pattern from validated `MagPouchInputs`.
 *
 * The caller is responsible for validating inputs with `validateInputs` before
 * calling this function.  Passing invalid inputs may throw or produce
 * nonsensical patterns.
 *
 * @returns `{ pattern, warnings, bom, steps }` where:
 *   - `pattern` is a complete `Pattern` with body + optional flap/attachment pieces
 *   - `warnings` is an array of advisory strings (never fatal)
 *   - `bom` contains the bill-of-materials for the configured scenario
 *   - `steps` contains the mandatory four-step instruction sequence
 */
export function buildPattern(inputs: MagPouchInputs): MagPouchBuildResult {
  const warnings: string[] = [];

  // ── Resolve magazine dimensions for AK check ────────────────────────────────

  let magDimsIn: { width: number; thickness: number; height: number } | undefined;

  if (inputs.magazine.mode === 'predefined' && inputs.magazine.presetId) {
    const entry = getMagazine(inputs.magazine.presetId);
    if (entry) {
      magDimsIn = { width: entry.width, thickness: entry.thickness, height: entry.height };
    }
  } else if (inputs.magazine.mode === 'custom') {
    const { width, thickness, height, units } = inputs.magazine;
    if (width !== undefined && thickness !== undefined && height !== undefined) {
      const toIn = (v: number) => (units === 'mm' ? v / 25.4 : v);
      magDimsIn = {
        width: toIn(width),
        thickness: toIn(thickness),
        height: toIn(height),
      };
    }
  }

  // AK profile warning (custom mode or predefined with AK-range dims)
  if (magDimsIn) {
    const akWarning = detectAkProfile(magDimsIn);
    if (akWarning) {
      warnings.push(akWarning);
    }
  }

  // ── Build PouchSpec and call the engine ─────────────────────────────────────

  const spec = toPouchSpec(inputs);
  const { pattern: basePattern, warnings: engineWarnings } = buildPouch(spec);
  warnings.push(...engineWarnings);

  // ── Attachment pieces ───────────────────────────────────────────────────────

  const finishedHeightMm = spec.object.height;
  const attachResult = buildAttachment({
    style: inputs.attachment,
    finishedHeight_mm: finishedHeightMm,
  });
  warnings.push(...attachResult.warnings);

  // ── Drainage patch on body piece ────────────────────────────────────────────

  const bodyPiece: Piece = basePattern.pieces[0] ?? {
    id: 'body',
    name: 'Body',
    mirror: false,
    quantity: 1,
    paths: [],
    annotations: [],
  };

  const drainageResult = buildDrainage({
    style: inputs.drainage,
    bodyPiece,
    grommetSize: (inputs.grommet_size as '#0' | '#00' | undefined) ?? '#0',
    exposed_percentage: inputs.exposed_percentage ?? 0.70,
  });
  warnings.push(...drainageResult.warnings);

  // ── Merge pieces into final pattern ─────────────────────────────────────────

  // Replace original body piece with drained version; append attachment pieces
  const mergedPieces: Piece[] = [
    drainageResult.piecePatches,
    ...basePattern.pieces.slice(1),
    ...attachResult.pieces,
  ];

  const pattern: Pattern = {
    ...basePattern,
    pieces: mergedPieces,
  };

  // ── BOM ─────────────────────────────────────────────────────────────────────

  const bom = buildBom(inputs, finishedHeightMm);

  // ── Steps ───────────────────────────────────────────────────────────────────

  const mandatorySteps = buildMandatorySteps({
    seamAllowanceMm: spec.seamAllowance,
    retentionStyle: inputs.retention,
    drainageStyle: inputs.drainage,
    bodyPieceId: bodyPiece.id,
  });

  // Merge all steps: drainage steps first (before assembly), then mandatory,
  // then attachment steps
  const allSteps: Step[] = [
    ...drainageResult.steps,
    ...mandatorySteps,
    ...attachResult.steps,
  ];

  return { pattern, warnings, bom, steps: allSteps };
}
