import type { BookCoverInputs, ResolvedInputs, Result, BuildPatternError, ZipperGauge, ElasticTension, ClosureConfig } from './types.js';
import { DEFAULT_SEAM_ALLOWANCE_MM, DEFAULT_TOP_BOTTOM_HEM_MM, BOOK_PRESETS, FOLDOVER_PRESETS, ZIPPER_GAUGE_DEFAULTS, CLOSURE_DEFAULTS } from './defaults.js';

const IN_TO_MM = 25.4;

export function toMm(value: number, units: 'mm' | 'in'): number {
  return units === 'in' ? value * IN_TO_MM : value;
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
      return { ok: false, error: { kind: 'invalid-inputs', message: 'width_ease must be a non-negative finite number' } };
    }
  }

  // Validate spine_bulge
  if (inputs.spine_bulge !== undefined) {
    if (!isFinite(inputs.spine_bulge) || inputs.spine_bulge < 0) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'spine_bulge must be a non-negative finite number' } };
    }
  }

  // Resolve effective dimensions (user input overrides preset)
  const bookH = inputs.book_height !== undefined ? toMm(inputs.book_height, units) : (preset?.book_height_mm ?? NaN);
  const bookW = inputs.book_width !== undefined ? toMm(inputs.book_width, units) : (preset?.book_width_mm ?? NaN);
  const spineW = inputs.spine_width !== undefined ? toMm(inputs.spine_width, units) : (preset?.spine_width_mm ?? NaN);
  const flapD = inputs.flap_depth !== undefined ? toMm(inputs.flap_depth, units) : (preset?.flap_depth_mm ?? NaN);

  if (!isPositiveFinite(bookH)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'book_height must be a positive finite number' } };
  }
  if (!isPositiveFinite(bookW)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'book_width must be a positive finite number' } };
  }
  if (!isPositiveFinite(spineW)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'spine_width must be a positive finite number' } };
  }
  if (!isPositiveFinite(flapD)) {
    return { ok: false, error: { kind: 'invalid-inputs', message: 'flap_depth must be a positive finite number' } };
  }

  if (inputs.seam_allowance !== undefined) {
    if (!isFinite(inputs.seam_allowance) || inputs.seam_allowance < 0) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'seam_allowance must be a non-negative finite number' } };
    }
  }

  const hem = DEFAULT_TOP_BOTTOM_HEM_MM;

  if (inputs.outer_pocket !== undefined) {
    const p = inputs.outer_pocket;
    if (!isPositiveFinite(p.width) || p.width >= bookW) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'outer_pocket width must be positive and less than book_width' } };
    }
    if (!isPositiveFinite(p.height) || p.height >= bookH) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'outer_pocket height must be positive and less than book_height' } };
    }
  }

  if (inputs.inner_pocket !== undefined) {
    const p = inputs.inner_pocket;
    if (!isPositiveFinite(p.width) || p.width >= bookW) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'inner_pocket width must be positive and less than book_width' } };
    }
    if (!isPositiveFinite(p.height) || p.height >= bookH) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'inner_pocket height must be positive and less than book_height' } };
    }
  }

  if (inputs.pen_holder !== undefined) {
    const ph = inputs.pen_holder;
    if (!Number.isInteger(ph.count) || ph.count < 1) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'pen_holder count must be an integer >= 1' } };
    }
    if (!isFinite(ph.slot_width) || ph.slot_width <= 0) {
      return { ok: false, error: { kind: 'invalid-inputs', message: 'pen_holder slot_width must be a positive finite number' } };
    }
    const totalStripWidth = ph.count * ph.slot_width;
    if (totalStripWidth > bookH - 2 * hem) {
      return { ok: false, error: { kind: 'invalid-inputs', message: `pen_holder total strip width (${totalStripWidth}) exceeds available book_height minus hems (${bookH - 2 * hem})` } };
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

  return {
    book_height,
    book_width,
    spine_width,
    flap_depth,
    seam_allowance: inputs.seam_allowance ?? DEFAULT_SEAM_ALLOWANCE_MM,
    top_bottom_hem: DEFAULT_TOP_BOTTOM_HEM_MM,
    units,
    book_preset: inputs.book_preset,
    foldover_preset: inputs.foldover_preset,
    width_ease,
    spine_bulge,
    is_hardcover,
    outer_pocket: inputs.outer_pocket,
    inner_pocket: inputs.inner_pocket,
    pen_holder: inputs.pen_holder,
    closure,
  };
}
