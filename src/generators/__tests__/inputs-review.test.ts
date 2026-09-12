// @vitest-environment node
/**
 * Review pass over the input layer: the messages a user reads, and the promise
 * that switching the display unit changes the label and nothing else.
 */
import { describe, it, expect } from 'vitest';
import { GENERATORS, type AnyInputs } from './generators.table.js';
import { checkRule, humaniseField } from '../../utils/inputGuards.js';

import * as bookCover from '../book-cover/index.js';
import * as circleSkirt from '../circle-skirt/index.js';
import * as clamshell from '../clamshell-pack/index.js';
import * as fanny from '../fanny-pack/index.js';
import * as lbv from '../lbv/index.js';
import * as microRig from '../micro-rig/index.js';
import * as organizer from '../organizer/index.js';
import * as paddedStrap from '../padded-strap/index.js';
import * as plateCarrier from '../plate-carrier/index.js';
import * as rollTop from '../roll-top-sack/index.js';
import * as sling from '../sling/index.js';
import * as zipPouch from '../zip-pouch/index.js';

type Resolver = (i: AnyInputs) => Record<string, unknown>;
/** Generators that take display units and expose resolveInputs. */
const RESOLVERS: Record<string, Resolver> = {
  'book-cover': (i) => bookCover.resolveInputs(i as never) as never,
  'circle-skirt': (i) => circleSkirt.resolveInputs(i as never) as never,
  'clamshell-pack': (i) => clamshell.resolveInputs(i as never) as never,
  'fanny-pack': (i) => fanny.resolveInputs(i as never) as never,
  lbv: (i) => lbv.resolveInputs(i as never) as never,
  'micro-rig': (i) => microRig.resolveInputs(i as never) as never,
  organizer: (i) => organizer.resolveInputs(i as never) as never,
  'padded-strap': (i) => paddedStrap.resolveInputs(i as never) as never,
  'plate-carrier': (i) => plateCarrier.resolveInputs(i as never) as never,
  'roll-top-sack': (i) => rollTop.resolveInputs(i as never) as never,
  sling: (i) => sling.resolveInputs(i as never) as never,
  'zip-pouch': (i) => zipPouch.resolveInputs(i as never) as never,
};

/** validateInputs shapes differ; pull every human-readable string out of one. */
function messagesOf(v: unknown): string[] {
  const r = v as { ok?: boolean; errors?: unknown; error?: { message?: string } };
  if (r.ok) return [];
  if (Array.isArray(r.errors)) return r.errors.map((e) => (typeof e === 'string' ? e : String((e as { message?: string }).message ?? '')));
  if (r.errors && typeof r.errors === 'object') return Object.values(r.errors as Record<string, string>).map(String);
  if (r.error?.message) return [r.error.message];
  return [];
}

const IN = 25.4;
const numeric = (o: Record<string, unknown>) =>
  Object.fromEntries(Object.entries(o).filter(([, v]) => typeof v === 'number' && Number.isFinite(v))) as Record<string, number>;

describe('validation messages read as English, not as field keys', () => {
  for (const g of GENERATORS) {
    it(`${g.name}: no message prints a raw snake_case key`, () => {
      const defaults = g.defaults();
      const seen: string[] = [];
      for (const key of g.keys) {
        for (const bad of ['not-a-valid-value', NaN]) {
          const messages = messagesOf(rawValidate(g.name, { ...defaults, [key]: bad }));
          seen.push(...messages);
        }
      }
      if (seen.length === 0) return; // mag-pouch and Tri-Zip validate through their own modules

      for (const m of seen) {
        // A key such as `pouch_width` reaching the user is the bug this pass fixed.
        expect(m, `${g.name}: "${m}"`).not.toMatch(/\b[a-z]+_[a-z_]+\b/);
        expect(m.trim().endsWith('.') || m.trim().endsWith('"'), `${g.name}: "${m}" should end in a full stop`).toBe(true);
      }
    });
  }

  function rawValidate(name: string, inputs: AnyInputs): unknown {
    const mods: Record<string, { validateInputs: (i: never) => unknown }> = {
      'book-cover': bookCover, 'circle-skirt': circleSkirt, 'clamshell-pack': clamshell, 'fanny-pack': fanny,
      lbv, 'micro-rig': microRig, organizer, 'padded-strap': paddedStrap, 'plate-carrier': plateCarrier,
      'roll-top-sack': rollTop, sling, 'zip-pouch': zipPouch,
    } as never;
    const mod = mods[name];
    return mod ? mod.validateInputs(inputs as never) : { ok: true };
  }
});

describe('humaniseField', () => {
  it('turns keys into labels, keeps acronyms and drops a trailing unit', () => {
    expect(humaniseField('pouch_width')).toBe('Pouch width');
    expect(humaniseField('pals_rows_side')).toBe('PALS rows side');
    expect(humaniseField('velcro_strip_count')).toBe('Velcro strip count');
    expect(humaniseField('sweep_angle_deg')).toBe('Sweep angle');
    expect(humaniseField('torso_length_mm')).toBe('Torso length');
  });
  it('states a bound with its unit and names the allowed options in words', () => {
    expect(checkRule('pouch_width', 1e9, { kind: 'length' }, 'in')!.message)
      .toBe('Pouch width must be at most 200 in, not 1.00 × 10^9 in.');
    expect(checkRule('pouch_width', NaN, { kind: 'length' }, 'mm')!.message)
      .toBe('Pouch width needs a number in millimetres, and that is not one. Clear the box to go back to the default.');
    expect(checkRule('closure', 'x', { kind: 'enum', allowed: ['fully_open', 'closed'] }, 'in')!.message)
      .toBe('Closure must be fully open or closed, and "x" is not one of those.');
    expect(checkRule('production_mode', 'yes', { kind: 'bool' }, 'in')!.message)
      .toMatch(/^Production mode is a yes\/no setting/);
  });
});

describe('display units convert the numbers and nothing else', () => {
  /**
   * A field is display-unit if, with every other input left to its internal
   * default, the same number resolves differently under 'in' and under 'mm'.
   * Anything else (counts, ratios, angles, and the millimetre-native foam and
   * seam-allowance fields) must resolve identically.
   */
  function displayUnitFields(resolve: Resolver, keys: string[], defaults: AnyInputs): string[] {
    const out: string[] = [];
    for (const k of keys) {
      const probe = Array.isArray(defaults[k]) ? [10] : 10;
      const asIn = numeric(resolve({ units: 'in', [k]: probe } as AnyInputs));
      const asMm = numeric(resolve({ units: 'mm', [k]: probe } as AnyInputs));
      if (JSON.stringify(asIn) !== JSON.stringify(asMm)) out.push(k);
    }
    return out;
  }

  for (const g of GENERATORS) {
    const resolve = RESOLVERS[g.name];
    if (!resolve) continue;
    it(`${g.name}: the same project in inches and in millimetres resolves to the same build`, () => {
      const defaults = g.defaults();
      const unitFields = displayUnitFields(resolve, g.keys.filter((k) => k !== 'units'), defaults);
      const inches: AnyInputs = { ...defaults, units: 'in' };
      // Every numeric input the default carries, converted iff it is a length.
      const mm: AnyInputs = { ...defaults, units: 'mm' };
      const toMm = (n: number) => Math.round(n * IN * 1e4) / 1e4;
      for (const k of Object.keys(defaults)) {
        const v = defaults[k];
        if (!unitFields.includes(k)) continue;
        if (typeof v === 'number') mm[k] = toMm(v);
        // A list of lengths (pen slots, strap positions) converts entry by entry.
        else if (Array.isArray(v) && v.every((x) => typeof x === 'number')) mm[k] = (v as number[]).map(toMm);
      }
      if ((defaults as { units?: string }).units !== 'in') return; // mm-native default; nothing to convert
      const a = numeric(resolve(inches));
      const b = numeric(resolve(mm));
      for (const [k, v] of Object.entries(a)) {
        // 4-decimal rounding on the way in is the only permitted drift: a
        // quarter inch must not come back as 6.3499 mm of pattern.
        expect(b[k], `${g.name}: ${k} drifted between inches and millimetres`).toBeCloseTo(v, 2);
      }
    });
  }
});

describe('resolveInputs never throws', () => {
  /**
   * The pages call resolveInputs for their derived-numbers panel and for the
   * placeholders in the settings panel, and they do it on every keystroke —
   * including before validation has had anything to say. A resolve that throws
   * on a scalar where a list belongs, or on an unknown preset from a
   * hand-edited file, takes the whole page down with it. Three did.
   */
  const GARBAGE: Record<string, unknown> = {
    NaN, negative: -1, zero: 0, huge: 1e9, Infinity, emptyString: '', null: null,
    garbageString: 'garbage', array: [], object: {}, scalarForList: 10, nanList: [NaN],
  };

  for (const g of GENERATORS) {
    const resolve = RESOLVERS[g.name];
    if (!resolve) continue;
    it(`${g.name}: survives garbage in every input`, () => {
      for (const key of g.keys) {
        for (const [name, value] of Object.entries(GARBAGE)) {
          const inputs = { ...g.defaults(), [key]: value } as AnyInputs;
          expect(() => resolve(inputs), `${g.name}.${key} = ${name}`).not.toThrow();
        }
      }
    });
  }
});
