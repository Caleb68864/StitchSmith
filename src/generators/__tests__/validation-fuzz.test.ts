// @vitest-environment node
/**
 * Validation fuzz (hardening pass H1): every generator's validateInputs must
 * survive garbage in every input key without throwing, reject the truly
 * invalid values with an error, and — when it accepts — buildPattern must not
 * throw and must return finite geometry.
 */
import { describe, it, expect } from 'vitest';
import { GENERATORS, type AnyInputs, type Verdict } from './generators.table.js';
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import { validateSettings, validateTool } from '../tool-roll/validation.js';
import { calculateToolRollLayout } from '../tool-roll/calculateToolRollLayout.js';
import { defaultToolRollSettings, sampleTools } from '../tool-roll/defaults.js';

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
