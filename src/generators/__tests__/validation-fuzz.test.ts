// @vitest-environment node
/**
 * Validation fuzz (hardening pass H1): every generator's validateInputs must
 * survive garbage in every input key without throwing, reject the truly
 * invalid values with an error, and — when it accepts — buildPattern must not
 * throw and must return finite geometry.
 */
import { describe, it, expect } from 'vitest';
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';

import * as bookCover from '../book-cover/index.js';
import { makeDefaultBookCoverProject } from '../../state/useBookCoverProject.js';
import * as circleSkirt from '../circle-skirt/index.js';
import { makeDefaultCircleSkirtProject } from '../../state/useCircleSkirtProject.js';
import * as clamshell from '../clamshell-pack/index.js';
import { makeDefaultClamshellPackProject } from '../../state/useClamshellPackProject.js';
import * as fanny from '../fanny-pack/index.js';
import { makeDefaultFannyPackProject } from '../../state/useFannyPackProject.js';
import * as lbv from '../lbv/index.js';
import { makeDefaultLbvProject } from '../../state/useLbvProject.js';
import * as magPouch from '../mag-pouch/index.js';
import { makeDefaultMagPouchProject } from '../../state/useMagPouchProject.js';
import * as microRig from '../micro-rig/index.js';
import { makeDefaultMicroRigProject } from '../../state/useMicroRigProject.js';
import * as organizer from '../organizer/index.js';
import { makeDefaultOrganizerProject } from '../../state/useOrganizerProject.js';
import * as paddedStrap from '../padded-strap/index.js';
import { makeDefaultPaddedStrapProject } from '../../state/usePaddedStrapProject.js';
import * as plateCarrier from '../plate-carrier/index.js';
import { makeDefaultPlateCarrierProject } from '../../state/usePlateCarrierProject.js';
import * as rollTop from '../roll-top-sack/index.js';
import { makeDefaultRollTopSackProject } from '../../state/useRollTopSackProject.js';
import * as sling from '../sling/index.js';
import { makeDefaultSlingProject } from '../../state/useSlingProject.js';
import * as triZip from '../tri-zip-backpack/index.js';
import { makeDefaultTriZipProject } from '../../state/useTriZipProject.js';
import * as zipPouch from '../zip-pouch/index.js';
import { makeDefaultZipPouchProject } from '../../state/useZipPouchProject.js';
import { validateSettings, validateTool } from '../tool-roll/validation.js';
import { calculateToolRollLayout } from '../tool-roll/calculateToolRollLayout.js';
import { defaultToolRollSettings, sampleTools } from '../tool-roll/defaults.js';

type AnyInputs = Record<string, unknown>;
interface Verdict { ok: boolean; errors: number }
interface Gen {
  name: string;
  /** Every documented input key (defaults plus optional keys from the Inputs type). */
  keys: string[];
  defaults: () => AnyInputs;
  validate: (i: AnyInputs) => Verdict;
  /** Returns pieces when the build succeeded, null when it returned a typed failure. Throws are the bug. */
  build: (i: AnyInputs) => Piece[] | null;
}

const listErrors = (r: unknown): Verdict => {
  const v = r as { ok: boolean; errors?: unknown; error?: unknown };
  const errs = Array.isArray(v.errors) ? v.errors.length : v.errors && typeof v.errors === 'object' ? Object.keys(v.errors).length : v.error ? 1 : 0;
  return { ok: v.ok, errors: errs };
};
const resultPieces = (r: unknown): Piece[] | null => {
  const v = r as { ok: boolean; value?: { pieces?: Piece[] } };
  if (!v.ok) return null;
  return v.value?.pieces ?? (v.value as unknown as Piece[]) ?? [];
};

const GENERATORS: Gen[] = [
  {
    name: 'book-cover',
    keys: ['book_height', 'book_width', 'spine_width', 'flap_depth', 'seam_allowance', 'top_bottom_hem', 'units', 'book_preset', 'foldover_preset', 'width_ease', 'spine_bulge', 'is_hardcover', 'outer_pocket', 'inner_pocket', 'pen_holder', 'closure', 'lining', 'card_slots', 'bookmark_ribbon', 'internal_zip_pocket', 'mesh_pocket', 'tactical'],
    defaults: () => makeDefaultBookCoverProject().inputs as unknown as AnyInputs,
    validate: (i) => listErrors(bookCover.validateInputs(i as never)),
    build: (i) => { const r = bookCover.buildPattern(i as never); return r.ok ? r.value.pieces : null; },
  },
  {
    name: 'circle-skirt',
    keys: ['waist_circumference', 'skirt_length', 'sweep_angle_deg', 'waist_ease', 'closure', 'waistband_type', 'band_height', 'elastic_width', 'seam_allowance', 'hem_allowance', 'fabric_width', 'units', 'preset', 'hip_circumference'],
    defaults: () => makeDefaultCircleSkirtProject().inputs as unknown as AnyInputs,
    validate: (i) => listErrors(circleSkirt.validateInputs(i as never)),
    build: (i) => circleSkirt.buildPattern(i as never).pieces,
  },
  {
    name: 'clamshell-pack',
    keys: ['units', 'pocket_grid', 'width', 'height', 'depth', 'lid_depth', 'equal_split', 'zipper_lip', 'zipper_underwrap', 'hoop_overcut', 'seam_allowance', 'fold_in', 'zipper_clearance', 'pals_style', 'pals_rows_side', 'pals_rows_face', 'pals_rows_bottom', 'pals_cols_side', 'edge_offset', 'handle', 'handle_bow', 'handle_fold_under', 'compression_straps_per_side', 'compression_extra', 'interior_loop', 'loop_strip_width', 'loop_gap', 'strap_provision', 'strap_tab_spacing'],
    defaults: () => makeDefaultClamshellPackProject().inputs as unknown as AnyInputs,
    validate: (i) => listErrors(clamshell.validateInputs(i as never)),
    build: (i) => resultPieces(clamshell.buildPattern(i as never)),
  },
  {
    name: 'fanny-pack',
    keys: ['units', 'width', 'height', 'depth', 'seam_allowance', 'lid_drop_target', 'lid_angle_deg', 'lid_extension', 'zipper_edge_finish', 'zipper_lip', 'drawbridge_limiter', 'bottom_grommets', 'belt_webbing', 'belt_min', 'belt_max', 'edge_tape_color'],
    defaults: () => makeDefaultFannyPackProject().inputs as unknown as AnyInputs,
    validate: (i) => listErrors(fanny.validateInputs(i as never)),
    build: (i) => resultPieces(fanny.buildPattern(i as never)),
  },
  {
    name: 'lbv',
    keys: ['units', 'panel_width', 'panel_height', 'back_panel_width', 'back_panel_height', 'back_bellow', 'foam_insert', 'foam_thickness', 'seam_allowance', 'edge_tape_width', 'edge_tape_conceal', 'row_width', 'row_pitch', 'rows_per_panel', 'front_cols', 'back_cols', 'loop_velcro_face', 'vertical_mark', 'vertical_width', 'vertical_strap_len', 'tab_foldover', 'hardware_wrap', 'drop_adjust', 'pad_length', 'pad_width', 'pad_tab_foldover', 'cross_piece_width', 'cross_piece_angle', 'pad_spread', 'drag_handle', 'drag_handle_len', 'front_straps', 'male_side', 'front_strap_positions', 'adjust_per_location', 'tension_lock_outboard', 'base_chest', 'belt_width', 'loops_per_panel', 'belt_length', 'hydration_webbing', 'pouch_width'],
    defaults: () => makeDefaultLbvProject().inputs as unknown as AnyInputs,
    validate: (i) => listErrors(lbv.validateInputs(i as never)),
    build: (i) => resultPieces(lbv.buildPattern(i as never)),
  },
  {
    name: 'mag-pouch',
    keys: ['magazine', 'retention', 'attachment', 'drainage', 'seamAllowance', 'construction', 'cell_count', 'cell_span', 'face_per_cell', 'bottom_style', 'back_hem', 'face_end_hem', 'ak_face_hem', 'face_pals', 'interior_loop', 'ease_width', 'ease_depth', 'exposed_percentage', 'hook_length', 'loop_length', 'closure_overlap', 'flap_length', 'grommet_size', 'pull_channel_depth', 'hourglass_aesthetic'],
    defaults: () => makeDefaultMagPouchProject().inputs as unknown as AnyInputs,
    validate: (i) => listErrors(magPouch.validateInputs(i as never)),
    build: (i) => magPouch.buildPattern(i as never).pattern.pieces,
  },
  {
    name: 'micro-rig',
    keys: ['units', 'panel_width_preset', 'panel_width', 'panel_height', 'pocket_set', 'magazine_preset_id', 'cell_count', 'cell_span', 'face_per_cell', 'cell_height', 'utility_pocket', 'cells_deep', 'stack_ease', 'wrap_allowance', 'coverage', 'cradle_width', 'cradle_drop', 'med_zone', 'pull_tab_length', 'side_pals_columns', 'bottom_loop_count', 'split_front', 'gap_width', 'buckle_setback', 'suspension', 'dangler_field', 'seam_allowance', 'edge_margin'],
    defaults: () => makeDefaultMicroRigProject().inputs as unknown as AnyInputs,
    validate: (i) => listErrors(microRig.validateInputs(i as never)),
    build: (i) => resultPieces(microRig.buildPattern(i as never)),
  },
  {
    name: 'organizer',
    keys: ['units', 'pouch_width', 'pocket_height', 'body_hem', 'panel_hem', 'production_mode', 'side_seam_allowance', 'side_fold', 'panel_extra_width', 'slot_widths', 'velcro_strip_count', 'velcro_strip_width', 'velcro_strip_length', 'velcro_gap', 'loop_over_hook', 'name_tape_loop', 'grommets', 'bifold', 'pals_back', 'contents_height'],
    defaults: () => makeDefaultOrganizerProject().inputs as unknown as AnyInputs,
    validate: (i) => listErrors(organizer.validateInputs(i as never)),
    build: (i) => resultPieces(organizer.buildPattern(i as never)),
  },
  {
    name: 'padded-strap',
    keys: ['units', 'mode', 'pad_length', 'pad_width', 'foam_thickness', 'curve', 'architecture', 'edge_finish', 'webbing_width', 'hardware', 'seam_allowance', 'torso_length', 'gusset_depth', 'tail_length', 'cross_strap_height', 'pad_spread', 'chest_adjust_range', 'slot_pitch', 'drop_leg_length', 'hydration_channels', 'front_pals_rows', 'routing_side'],
    defaults: () => makeDefaultPaddedStrapProject().inputs as unknown as AnyInputs,
    validate: (i) => listErrors(paddedStrap.validateInputs(i as never)),
    build: (i) => resultPieces(paddedStrap.buildPattern(i as never)),
  },
  {
    name: 'plate-carrier',
    keys: ['units', 'plate_preset', 'plate_width', 'plate_height', 'plate_cut', 'top_clip_length', 'top_clip_angle', 'pocket_ease', 'shell_oversize', 'shell_material', 'edge_finish', 'binding_width', 'seam_allowance', 'back_comfort', 'comfort_foam_thickness', 'pocket_opening', 'pocket_flap_length', 'front_field', 'loop_field_width', 'loop_field_height', 'loop_field_y_offset', 'back_field', 'shoulder_style', 'strap_width', 'pad_length', 'pad_foam_thickness', 'shoulder_strap_length', 'strap_adjust_range', 'cummerbund_style', 'cummerbund_width', 'torso_circumference', 'cummerbund_overlap', 'side_plate', 'qr_buckle', 'torso_length'],
    defaults: () => makeDefaultPlateCarrierProject().inputs as unknown as AnyInputs,
    validate: (i) => listErrors(plateCarrier.validateInputs(i as never)),
    build: (i) => resultPieces(plateCarrier.buildPattern(i as never)),
  },
  {
    name: 'roll-top-sack',
    keys: ['bottom_length', 'bottom_width', 'height_when_rolled', 'collar_height', 'seam_allowance', 'units'],
    defaults: () => makeDefaultRollTopSackProject().inputs as unknown as AnyInputs,
    validate: (i) => listErrors(rollTop.validateInputs(i as never)),
    build: (i) => { const r = rollTop.buildPattern(i as never); return r.ok ? r.value.pieces : null; },
  },
  {
    name: 'sling',
    keys: ['units', 'webbing_width', 'pad_finished_length', 'pad_girth', 'foam_thickness', 'foam_width', 'foam_setback', 'tuck_depth', 'turning_ease', 'seam_allowance', 'rear_tail_length', 'adjustment_webbing_length', 'third_piece', 'anchor_strap_length', 'end_interface', 'route_through_both_slots'],
    defaults: () => makeDefaultSlingProject().inputs as unknown as AnyInputs,
    validate: (i) => listErrors(sling.validateInputs(i as never)),
    build: (i) => resultPieces(sling.buildPattern(i as never)),
  },
  {
    name: 'tri-zip-backpack',
    keys: ['height', 'width', 'depth', 'units', 'stylePreset', 'strap_width', 'foam_thickness', 'curve_style', 'back_panel_shape', 'compression_straps', 'hip_belt', 'laptop_sleeve_attachment', 'sternum_strap', 'y_split_height_percent', 'center_panel_width_percent', 'zipper_method', 'zipper_gusset_width', 'frame_sheet', 'frame_sheet_margin', 'split_gusset', 'seam_allowance', 'hem_allowance', 'strap_architecture', 'strap_edge_finish', 'strap_webbing_width', 'strap_pad_length', 'strap_hardware'],
    defaults: () => makeDefaultTriZipProject().inputs as unknown as AnyInputs,
    validate: (i) => listErrors(triZip.validateInputs(i as never)),
    build: (i) => {
      const preset = triZip.getPreset((i as { stylePreset: never }).stylePreset);
      const r = triZip.buildPattern(i as never, preset);
      return r.ok ? r.value.pieces : null;
    },
  },
  {
    name: 'zip-pouch',
    keys: ['finished_length', 'finished_width', 'finished_depth', 'units', 'seam_allowance', 'zip_gauge', 'grosgrain_width', 'pull_loops', 'preset', 'construction_style', 'zipper_position', 'zip_from_top'],
    defaults: () => makeDefaultZipPouchProject().inputs as unknown as AnyInputs,
    validate: (i) => listErrors(zipPouch.validateInputs(i as never)),
    build: (i) => resultPieces(zipPouch.buildPattern(i as never)),
  },
];

const GARBAGE: Record<string, unknown> = {
  NaN: NaN, negative: -1, zero: 0, huge: 1e9, Infinity: Infinity, negInfinity: -Infinity,
  emptyString: '', null: null, undefined: undefined, garbageString: 'garbage', array: [], object: {}, nanArray: [NaN, 1],
};

function isFiniteNum(v: unknown): boolean { return typeof v === 'number' && Number.isFinite(v); }

/** Every coordinate on every edge of every piece is a finite number. */
export function assertFiniteGeometry(pieces: Piece[], label: string): void {
  for (const piece of pieces) {
    expect(Array.isArray(piece.paths), `${label}: piece ${piece.id} has no paths`).toBe(true);
    expect(isFiniteNum(piece.quantity) && piece.quantity >= 0, `${label}: piece ${piece.id} quantity ${piece.quantity}`).toBe(true);
    for (const path of piece.paths) {
      for (const e of path.edges) {
        const pts: unknown[] = [e.start.x, e.start.y, e.end.x, e.end.y];
        if (e.kind === 'arc') pts.push(e.radius, e.center.x, e.center.y);
        if (e.kind === 'bezier') pts.push(e.cp1.x, e.cp1.y, e.cp2.x, e.cp2.y);
        for (const v of pts) expect(isFiniteNum(v), `${label}: non-finite coordinate on ${piece.id}/${path.id}`).toBe(true);
      }
    }
  }
}

function kindOf(v: unknown): 'number' | 'string' | 'boolean' | 'array' | 'object' | 'other' {
  if (typeof v === 'number') return 'number';
  if (typeof v === 'string') return 'string';
  if (typeof v === 'boolean') return 'boolean';
  if (Array.isArray(v)) return 'array';
  if (v && typeof v === 'object') return 'object';
  return 'other';
}

/** Which garbage values a key of this kind must REJECT outright (validation ok:false). */
function mustReject(kind: ReturnType<typeof kindOf>, garbageName: string): boolean {
  if (kind === 'number') return ['NaN', 'huge', 'Infinity', 'negInfinity', 'garbageString', 'object', 'array', 'nanArray'].includes(garbageName);
  if (kind === 'string') return ['garbageString', 'object', 'nanArray'].includes(garbageName);
  if (kind === 'array') return ['garbageString', 'object', 'nanArray', 'NaN'].includes(garbageName);
  if (kind === 'object') return ['garbageString', 'nanArray', 'NaN'].includes(garbageName);
  return false;
}

for (const gen of GENERATORS) {
  describe(`validation fuzz — ${gen.name}`, () => {
    const base = gen.defaults();
    it('accepts its own defaults and builds finite geometry', () => {
      const v = gen.validate(base);
      expect(v.ok, `${gen.name} defaults failed validation`).toBe(true);
      const pieces = gen.build(base);
      expect(pieces, `${gen.name} defaults did not build`).not.toBeNull();
      assertFiniteGeometry(pieces!, `${gen.name} defaults`);
    });

    for (const key of gen.keys) {
      it(`survives garbage in "${key}"`, () => {
        const kind = kindOf(base[key]);
        for (const [gName, gValue] of Object.entries(GARBAGE)) {
          const inputs: AnyInputs = { ...gen.defaults(), [key]: gValue };
          if (gValue === undefined) delete inputs[key];
          const label = `${gen.name}.${key} = ${gName}`;
          let verdict: Verdict;
          try {
            verdict = gen.validate(inputs);
          } catch (err) {
            throw new Error(`${label}: validateInputs threw: ${(err as Error).message}`);
          }
          if (!verdict.ok) {
            expect(verdict.errors, `${label}: rejected without an error message`).toBeGreaterThan(0);
            continue;
          }
          if (kind !== 'other' && mustReject(kind, gName)) {
            throw new Error(`${label}: validation accepted a value it must reject`);
          }
          let pieces: Piece[] | null;
          try {
            pieces = gen.build(inputs);
          } catch (err) {
            throw new Error(`${label}: validation passed but buildPattern threw: ${(err as Error).message}`);
          }
          if (pieces) assertFiniteGeometry(pieces, label);
        }
      });
    }
  });
}

describe('validation fuzz — tool-roll', () => {
  it('validateSettings flags every garbage numeric or select field and the layout never throws on survivors', () => {
    for (const key of Object.keys(defaultToolRollSettings)) {
      const kind = typeof (defaultToolRollSettings as Record<string, unknown>)[key];
      for (const [gName, gValue] of Object.entries(GARBAGE)) {
        const settings = { ...defaultToolRollSettings, [key]: gValue } as typeof defaultToolRollSettings;
        let warnings: ReturnType<typeof validateSettings>;
        try { warnings = validateSettings(settings); } catch (err) { throw new Error(`tool-roll settings.${key} = ${gName}: validateSettings threw ${(err as Error).message}`); }
        const garbageForKind =
          (kind === 'number' && ['NaN', 'Infinity', 'negInfinity', 'garbageString', 'object', 'array', 'null', 'emptyString', 'huge'].includes(gName)) ||
          (kind === 'string' && ['garbageString', 'object', 'array', 'null', 'NaN', 'negative', 'huge'].includes(gName));
        if (garbageForKind) {
          expect(warnings.some((w) => w.severity === 'error'), `tool-roll settings.${key} = ${gName} not flagged`).toBe(true);
        }
        if (warnings.some((w) => w.severity === 'error')) continue;
        if (kind === 'boolean') continue;
        try { calculateToolRollLayout(sampleTools, settings, 'mm'); } catch (err) { throw new Error(`tool-roll settings.${key} = ${gName}: layout threw ${(err as Error).message}`); }
      }
    }
  });
  it('validateTool flags garbage tool dimensions including absurd magnitudes', () => {
    for (const key of ['width', 'thickness', 'height', 'visibleAmount'] as const) {
      for (const [gName, gValue] of Object.entries(GARBAGE)) {
        const tool = { ...sampleTools[0], [key]: gValue } as typeof sampleTools[number];
        let warnings: ReturnType<typeof validateTool>;
        try { warnings = validateTool(tool); } catch (err) { throw new Error(`tool-roll tool.${key} = ${gName}: validateTool threw ${(err as Error).message}`); }
        if (['NaN', 'Infinity', 'negInfinity', 'garbageString', 'object', 'array', 'null', 'emptyString', 'negative', 'huge'].includes(gName)) {
          expect(warnings.some((w) => w.severity === 'error'), `tool-roll tool.${key} = ${gName} not flagged`).toBe(true);
        }
      }
    }
  });
});
