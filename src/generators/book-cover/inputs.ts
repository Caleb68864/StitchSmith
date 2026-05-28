import type { BookCoverInputs, ResolvedInputs, Result, BuildPatternError, ZipperGauge, ElasticTension, ClosureConfig, InterfacingKind, LiningConfig } from './types.js';
import { DEFAULT_SEAM_ALLOWANCE_MM, DEFAULT_TOP_BOTTOM_HEM_MM, BOOK_PRESETS, FOLDOVER_PRESETS, ZIPPER_GAUGE_DEFAULTS, CLOSURE_DEFAULTS, LINING_DEFAULTS, CARD_SLOTS_DEFAULTS, BOOKMARK_RIBBON_DEFAULTS, INTERNAL_ZIP_POCKET_DEFAULTS, TACTICAL_DEFAULTS } from './defaults.js';
import { toMm as engineToMm } from '../../lib/pattern-engine/geometry/units.js';

// Re-export the engine's toMm narrowed to ('mm' | 'in') — the two units
// BookCoverInputs accepts. The conversion math lives in pattern-engine
// so generators don't redeclare it.
export function toMm(value: number, units: 'mm' | 'in'): number {
  return engineToMm(value, units);
}

function isPositiveFinite(n: number): boolean {
  return isFinite(n) && n > 0;
}

export function validateInputs(inputs: BookCoverInputs): Result<true, BuildPatternError> {
  const { units } = inputs;

  // Validate book_preset
  let preset = BOOK_PRESETS.find(p => p.id === inputs.book_preset);
  if (inputs.book_preset !== undefined && !preset) {
    return { ok: false, error: { kind: 'invalid-inputs', message: `Unknown book preset: "${inputs.book_preset}"` } };
  }

  // Validate foldover_preset
  if (inputs.foldover_preset !== undefined) {
    if (!FOLDOVER_PRESETS.find(p => p.id === inputs.foldover_preset)) {
      return { ok: false, error: { kind: 'invalid-inputs', message: `Unknown foldover preset: "${inputs.foldover_preset}"` } };
    }
  }

  // Validate width_ease
  if (inputs.width_ease !== undefined) {
    if (!isFinite(inputs.width_ease) || inputs.width_ease < 0) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'width_ease must be a non-negative finite number', field: 'width_ease' } };
    }
  }

  // Validate spine_bulge
  if (inputs.spine_bulge !== undefined) {
    if (!isFinite(inputs.spine_bulge) || inputs.spine_bulge < 0) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'spine_bulge must be a non-negative finite number', field: 'spine_bulge' } };
    }
  }

  // Resolve effective dimensions (user input overrides preset)
  const bookH = inputs.book_height !== undefined ? toMm(inputs.book_height, units) : (preset?.book_height_mm ?? NaN);
  const bookW = inputs.book_width !== undefined ? toMm(inputs.book_width, units) : (preset?.book_width_mm ?? NaN);
  const spineW = inputs.spine_width !== undefined ? toMm(inputs.spine_width, units) : (preset?.spine_width_mm ?? NaN);
  const flapD = inputs.flap_depth !== undefined ? toMm(inputs.flap_depth, units) : (preset?.flap_depth_mm ?? NaN);

  if (!isPositiveFinite(bookH)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'book_height must be a positive finite number', field: 'book_height' } };
  }
  if (!isPositiveFinite(bookW)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'book_width must be a positive finite number', field: 'book_width' } };
  }
  if (!isPositiveFinite(spineW)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'spine_width must be a positive finite number', field: 'spine_width' } };
  }
  if (!isPositiveFinite(flapD)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'flap_depth must be a positive finite number', field: 'flap_depth' } };
  }

  if (inputs.seam_allowance !== undefined) {
    if (!isFinite(inputs.seam_allowance) || inputs.seam_allowance < 0) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'seam_allowance must be a non-negative finite number', field: 'seam_allowance' } };
    }
  }

  const hem = DEFAULT_TOP_BOTTOM_HEM_MM;

  if (inputs.outer_pocket !== undefined) {
    const p = inputs.outer_pocket;
    if (!isPositiveFinite(p.width) || p.width >= bookW) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'outer_pocket width must be positive and less than book_width', field: 'outer_pocket.width' } };
    }
    if (!isPositiveFinite(p.height) || p.height >= bookH) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'outer_pocket height must be positive and less than book_height', field: 'outer_pocket.height' } };
    }
  }

  if (inputs.inner_pocket !== undefined) {
    const p = inputs.inner_pocket;
    if (!isPositiveFinite(p.width) || p.width >= bookW) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'inner_pocket width must be positive and less than book_width', field: 'inner_pocket.width' } };
    }
    if (!isPositiveFinite(p.height) || p.height >= bookH) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'inner_pocket height must be positive and less than book_height', field: 'inner_pocket.height' } };
    }
  }

  if (inputs.pen_holder !== undefined) {
    const ph = inputs.pen_holder;
    if (!Number.isInteger(ph.count) || ph.count < 1) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'pen_holder count must be an integer >= 1', field: 'pen_holder.count' } };
    }
    if (!isFinite(ph.slot_width) || ph.slot_width <= 0) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'pen_holder slot_width must be a positive finite number', field: 'pen_holder.slot_width' } };
    }
    const totalStripWidth = ph.count * ph.slot_width;
    if (totalStripWidth > bookH - 2 * hem) {
      return { ok: false, error: { kind: 'invalid-inputs', message: `pen_holder total strip width (${totalStripWidth}) exceeds available book_height minus hems (${bookH - 2 * hem})` } };
    }
  }

  // Lining-required-for-features check
  const hasFeatureRequiringLining =
    inputs.card_slots !== undefined ||
    inputs.bookmark_ribbon !== undefined ||
    inputs.internal_zip_pocket !== undefined ||
    inputs.mesh_pocket !== undefined;
  const liningEffectivelyEnabled =
    inputs.lining?.enabled === true || inputs.tactical?.enabled === true;
  if (hasFeatureRequiringLining && !liningEffectivelyEnabled) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'lining-required-for-features: card_slots, bookmark_ribbon, internal_zip_pocket, and mesh_pocket all require lining.enabled to be true' } };
  }

  // Lining validation
  if (inputs.lining !== undefined) {
    if (inputs.lining.interfacing !== undefined) {
      const validInterfacing: InterfacingKind[] = ['fusible', 'sew-in', 'hdpe', 'eva', 'none'];
      if (!validInterfacing.includes(inputs.lining.interfacing)) {
        return { ok: false, error: { kind: 'invalid-inputs', message: `lining.interfacing must be one of fusible, sew-in, hdpe, eva, none; got "${inputs.lining.interfacing}"` } };
      }
    }
  }

  // Card slots validation
  if (inputs.card_slots !== undefined) {
    const { count } = inputs.card_slots;
    if (!Number.isInteger(count) || count < 1 || count > 5) {
      return { ok: false, error: { kind: 'invalid-inputs', message: `card_slots.count must be an integer between 1 and 5; got ${count}` } };
    }
    if (inputs.card_slots.slot_height !== undefined) {
      if (!isPositiveFinite(inputs.card_slots.slot_height)) {
        return { ok: false, error: { kind: 'invalid-inputs', message: 'card_slots.slot_height must be a positive finite number' } };
      }
    }
  }

  // Bookmark ribbon validation
  if (inputs.bookmark_ribbon !== undefined) {
    const { count } = inputs.bookmark_ribbon;
    if (!Number.isInteger(count) || count < 1) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'bookmark_ribbon.count must be an integer >= 1' } };
    }
    if (inputs.bookmark_ribbon.width_mm !== undefined) {
      if (!isPositiveFinite(inputs.bookmark_ribbon.width_mm)) {
        return { ok: false, error: { kind: 'invalid-inputs', message: 'bookmark_ribbon.width_mm must be a positive finite number' } };
      }
    }
  }

  // Internal zip pocket validation
  if (inputs.internal_zip_pocket !== undefined) {
    const p = inputs.internal_zip_pocket;
    if (p.width !== undefined && !isPositiveFinite(p.width)) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'internal_zip_pocket.width must be a positive finite number' } };
    }
    if (p.height !== undefined && !isPositiveFinite(p.height)) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'internal_zip_pocket.height must be a positive finite number' } };
    }
    if (p.gauge !== undefined) {
      const validGauges: ZipperGauge[] = ['#3', '#5', '#10'];
      if (!validGauges.includes(p.gauge)) {
        return { ok: false, error: { kind: 'invalid-inputs', message: `internal_zip_pocket.gauge must be one of #3, #5, #10; got "${p.gauge}"` } };
      }
    }
  }

  // Mesh pocket validation
  if (inputs.mesh_pocket !== undefined) {
    const p = inputs.mesh_pocket;
    if (p.width !== undefined && !isPositiveFinite(p.width)) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'mesh_pocket.width must be a positive finite number' } };
    }
    if (p.height !== undefined && !isPositiveFinite(p.height)) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'mesh_pocket.height must be a positive finite number' } };
    }
  }

  // Tactical validation (velcro_panel_width >= 101.6 mm is the minimum, warn below)
  if (inputs.tactical !== undefined) {
    if (inputs.tactical.velcro_panel_width !== undefined) {
      if (!isPositiveFinite(inputs.tactical.velcro_panel_width)) {
        return { ok: false, error: { kind: 'invalid-inputs', message: 'tactical.velcro_panel_width must be a positive finite number' } };
      }
    }
    if (inputs.tactical.velcro_panel_height !== undefined) {
      if (!isPositiveFinite(inputs.tactical.velcro_panel_height)) {
        return { ok: false, error: { kind: 'invalid-inputs', message: 'tactical.velcro_panel_height must be a positive finite number' } };
      }
    }
  }

  if (inputs.closure !== undefined) {
    const c = inputs.closure;
    if (c.kind === 'zipper') {
      const validGauges: ZipperGauge[] = ['#3', '#5', '#10'];
      if (!validGauges.includes(c.gauge)) {
        return { ok: false, error: { kind: 'invalid-inputs', message: `zipper gauge must be one of #3, #5, #10; got "${c.gauge}"` } };
      }
      const gaugeDefaults = ZIPPER_GAUGE_DEFAULTS[c.gauge];
      if (c.corner_radius !== undefined) {
        if (!isPositiveFinite(c.corner_radius)) {
          return { ok: false, error: { kind: 'invalid-inputs', message: 'zipper corner_radius must be a positive finite number' } };
        }
        if (c.corner_radius < gaugeDefaults.min_corner_radius_mm) {
          return { ok: false, error: { kind: 'invalid-inputs', message: `zipper corner_radius ${c.corner_radius} mm is below minimum ${gaugeDefaults.min_corner_radius_mm} mm for gauge ${c.gauge}` } };
        }
      }
    } else if (c.kind === 'elastic') {
      if (c.width_mm !== undefined && (!isPositiveFinite(c.width_mm))) {
        return { ok: false, error: { kind: 'invalid-inputs', message: 'elastic width_mm must be a positive finite number' } };
      }
      const validTensions: ElasticTension[] = ['light', 'standard', 'firm'];
      if (c.tension !== undefined && !validTensions.includes(c.tension)) {
        return { ok: false, error: { kind: 'invalid-inputs', message: `elastic tension must be one of light, standard, firm; got "${c.tension}"` } };
      }
    } else if (c.kind === 'snap') {
      if (c.count !== undefined) {
        if (!Number.isInteger(c.count) || c.count < 1 || c.count > 2) {
          return { ok: false, error: { kind: 'invalid-inputs', message: 'snap count must be 1 or 2' } };
        }
      }
    } else if (c.kind === 'flap-buckle') {
      if (c.strap_width !== undefined && !isPositiveFinite(c.strap_width)) {
        return { ok: false, error: { kind: 'invalid-inputs', message: 'flap-buckle strap_width must be a positive finite number' } };
      }
      if (c.buckle_size !== undefined && !isPositiveFinite(c.buckle_size)) {
        return { ok: false, error: { kind: 'invalid-inputs', message: 'flap-buckle buckle_size must be a positive finite number' } };
      }
    }
  }

  return { ok: true, value: true };
}

export function resolveInputs(inputs: BookCoverInputs): ResolvedInputs {
  const { units } = inputs;

  const preset = inputs.book_preset ? BOOK_PRESETS.find(p => p.id === inputs.book_preset) : undefined;

  const book_height = inputs.book_height !== undefined ? toMm(inputs.book_height, units) : (preset?.book_height_mm ?? NaN);
  const book_width = inputs.book_width !== undefined ? toMm(inputs.book_width, units) : (preset?.book_width_mm ?? NaN);
  const spine_width = inputs.spine_width !== undefined ? toMm(inputs.spine_width, units) : (preset?.spine_width_mm ?? NaN);
  const flap_depth = inputs.flap_depth !== undefined ? toMm(inputs.flap_depth, units) : (preset?.flap_depth_mm ?? NaN);

  const is_hardcover = inputs.is_hardcover ?? preset?.is_hardcover ?? false;
  const width_ease = inputs.width_ease ?? Math.max(6.35, spine_width * 0.5);
  const spine_bulge = inputs.spine_bulge ?? (is_hardcover ? 6.35 : 0);

  let closure: ClosureConfig | undefined = inputs.closure;
  if (closure !== undefined) {
    if (closure.kind === 'zipper') {
      const gaugeDefaults = ZIPPER_GAUGE_DEFAULTS[closure.gauge];
      if (closure.corner_radius === undefined) {
        closure = { ...closure, corner_radius: gaugeDefaults.corner_radius_mm };
      }
    } else if (closure.kind === 'elastic') {
      const elasticDefs = CLOSURE_DEFAULTS.elastic;
      closure = {
        kind: 'elastic',
        width_mm: closure.width_mm ?? elasticDefs.width_mm,
        tension: closure.tension ?? elasticDefs.tension,
        attach_offset: closure.attach_offset,
      };
    } else if (closure.kind === 'snap') {
      closure = { kind: 'snap', count: closure.count ?? CLOSURE_DEFAULTS.snap.count };
    } else if (closure.kind === 'flap-buckle') {
      const fbDefs = CLOSURE_DEFAULTS['flap-buckle'];
      closure = {
        kind: 'flap-buckle',
        strap_width: closure.strap_width ?? fbDefs.strap_width,
        buckle_size: closure.buckle_size ?? fbDefs.buckle_size,
      };
    }
  }

  // Tactical mode cascade: compute resolved tactical config, then derive lining/foldover defaults
  let resolvedTactical: import('./types.js').ResolvedTacticalConfig | undefined;
  if (inputs.tactical?.enabled) {
    resolvedTactical = {
      enabled: true,
      velcro_panel_width: inputs.tactical.velcro_panel_width ?? TACTICAL_DEFAULTS.velcro_panel_width,
      velcro_panel_height: inputs.tactical.velcro_panel_height ?? TACTICAL_DEFAULTS.velcro_panel_height,
      retention_strap: inputs.tactical.retention_strap ?? false,
      spare_mag_pocket: inputs.tactical.spare_mag_pocket ?? false,
    };
  }

  // Resolve lining: tactical mode forces lining.enabled = true and interfacing = 'hdpe' unless user overrides
  let resolvedLining: LiningConfig | undefined;
  if (inputs.lining !== undefined || resolvedTactical !== undefined) {
    if (resolvedTactical !== undefined) {
      resolvedLining = {
        enabled: inputs.lining?.enabled ?? true,
        interfacing: inputs.lining?.interfacing ?? TACTICAL_DEFAULTS.lining_interfacing,
        fabric: inputs.lining?.fabric,
      };
    } else if (inputs.lining !== undefined) {
      resolvedLining = {
        enabled: inputs.lining.enabled,
        interfacing: inputs.lining.interfacing ?? LINING_DEFAULTS.interfacing,
        fabric: inputs.lining.fabric,
      };
    }
  }

  // Foldover preset: tactical mode defaults to 'tactical'
  const foldover_preset =
    inputs.foldover_preset ??
    (resolvedTactical !== undefined ? TACTICAL_DEFAULTS.foldover_preset : undefined);

  // Resolve card slots
  const card_slots = inputs.card_slots !== undefined
    ? { count: inputs.card_slots.count, slot_height: inputs.card_slots.slot_height ?? CARD_SLOTS_DEFAULTS.slot_height }
    : undefined;

  // Resolve bookmark ribbon
  const bookmark_ribbon = inputs.bookmark_ribbon !== undefined
    ? { count: inputs.bookmark_ribbon.count, width_mm: inputs.bookmark_ribbon.width_mm ?? BOOKMARK_RIBBON_DEFAULTS.width_mm }
    : undefined;

  // Resolve internal zip pocket
  const internal_zip_pocket = inputs.internal_zip_pocket !== undefined
    ? { ...inputs.internal_zip_pocket, gauge: inputs.internal_zip_pocket.gauge ?? INTERNAL_ZIP_POCKET_DEFAULTS.gauge }
    : undefined;

  // Resolve mesh pocket
  const mesh_pocket = inputs.mesh_pocket !== undefined ? { ...inputs.mesh_pocket } : undefined;

  return {
    book_height,
    book_width,
    spine_width,
    flap_depth,
    seam_allowance: inputs.seam_allowance ?? DEFAULT_SEAM_ALLOWANCE_MM,
    top_bottom_hem: DEFAULT_TOP_BOTTOM_HEM_MM,
    units,
    book_preset: inputs.book_preset,
    foldover_preset,
    width_ease,
    spine_bulge,
    is_hardcover,
    outer_pocket: inputs.outer_pocket,
    inner_pocket: inputs.inner_pocket,
    pen_holder: inputs.pen_holder,
    closure,
    lining: resolvedLining,
    card_slots,
    bookmark_ribbon,
    internal_zip_pocket,
    mesh_pocket,
    tactical: resolvedTactical,
  };
}
