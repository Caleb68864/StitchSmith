/**
 * Shared input guards (hardening pass H1). Every generator's `validateInputs`
 * runs `sweepInputs` first so garbage from a cleared field, a hand-edited
 * project file or a stale localStorage entry is rejected with a field-keyed
 * message instead of throwing or turning into NaN geometry.
 *
 *  - `null` and `undefined` mean "use the default" (users clear fields).
 *  - Numbers must be finite; lengths have a sanity ceiling (5 m / 200 in).
 *  - Selects must be one of the allowed strings.
 *  - Arrays must be arrays of finite numbers.
 */

export type GuardKind = 'length' | 'count' | 'ratio' | 'percent' | 'angle' | 'number' | 'enum' | 'bool' | 'numArray' | 'string' | 'object';

export interface GuardRule {
  kind: GuardKind;
  allowed?: readonly string[];
  min?: number;
  max?: number;
  integer?: boolean;
  label?: string;
}

export type GuardSpec = Record<string, GuardRule>;

export interface GuardIssue { field: string; message: string }

/** Largest length a pattern piece can sensibly have, per display unit. */
export const MAX_LENGTH_MM = 5000;
export const MAX_LENGTH_IN = 200;

/** Copy of `inputs` with every top-level `null` removed so `??` and `!== undefined` checks both fall back. */
export function stripNulls<T extends object>(inputs: T): T {
  if (!inputs || typeof inputs !== 'object') return inputs;
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(inputs as Record<string, unknown>)) if (v !== null) out[k] = v;
  return out as T;
}

export function unitsOf(inputs: unknown, fallback: 'mm' | 'in' = 'mm'): 'mm' | 'in' {
  const u = (inputs as { units?: unknown } | null)?.units;
  return u === 'in' || u === 'mm' ? u : fallback;
}

function isFiniteNumber(v: unknown): v is number { return typeof v === 'number' && Number.isFinite(v); }

export function checkRule(field: string, value: unknown, rule: GuardRule, units: 'mm' | 'in'): GuardIssue | null {
  if (value === undefined || value === null) return null;
  const label = rule.label ?? field;
  switch (rule.kind) {
    case 'length':
    case 'count':
    case 'ratio':
    case 'percent':
    case 'angle':
    case 'number': {
      if (!isFiniteNumber(value)) return { field, message: `${label} must be a finite number (got ${describe(value)}).` };
      const min = rule.min ?? (rule.kind === 'number' ? -Infinity : 0);
      const max = rule.max ?? (rule.kind === 'length' ? (units === 'in' ? MAX_LENGTH_IN : MAX_LENGTH_MM) : rule.kind === 'count' ? 1000 : rule.kind === 'ratio' ? 1 : rule.kind === 'percent' ? 100 : rule.kind === 'angle' ? 360 : Infinity);
      if (value < min) return { field, message: `${label} must be at least ${min} (got ${value}).` };
      if (value > max) return { field, message: `${label} must be at most ${max}${rule.kind === 'length' ? ` ${units}` : ''} (got ${value}).` };
      if ((rule.integer || rule.kind === 'count') && !Number.isInteger(value)) return { field, message: `${label} must be a whole number (got ${value}).` };
      return null;
    }
    case 'enum':
      if (typeof value !== 'string' || !(rule.allowed ?? []).includes(value)) return { field, message: `${label} must be one of ${(rule.allowed ?? []).join(', ')} (got ${describe(value)}).` };
      return null;
    case 'bool':
      if (typeof value !== 'boolean') return { field, message: `${label} must be true or false (got ${describe(value)}).` };
      return null;
    case 'string':
      if (typeof value !== 'string') return { field, message: `${label} must be text (got ${describe(value)}).` };
      return null;
    case 'numArray':
      if (!Array.isArray(value)) return { field, message: `${label} must be a list of numbers (got ${describe(value)}).` };
      if (value.some((x) => !isFiniteNumber(x))) return { field, message: `${label} contains a value that is not a finite number.` };
      if (rule.max !== undefined && value.some((x) => x > rule.max!)) return { field, message: `${label} contains a value above ${rule.max}.` };
      if (rule.min !== undefined && value.some((x) => x < rule.min!)) return { field, message: `${label} contains a value below ${rule.min}.` };
      return null;
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) return { field, message: `${label} must be an object (got ${describe(value)}).` };
      return null;
  }
}

function describe(v: unknown): string {
  if (typeof v === 'number') return Number.isNaN(v) ? 'NaN' : String(v);
  if (typeof v === 'string') return v === '' ? 'an empty string' : `"${v}"`;
  if (Array.isArray(v)) return 'a list';
  if (v && typeof v === 'object') return 'an object';
  return String(v);
}

/** Run every rule; returns the issues in spec order (one per field). */
export function sweepInputs(inputs: object, spec: GuardSpec, units: 'mm' | 'in'): GuardIssue[] {
  const issues: GuardIssue[] = [];
  const rec = inputs as Record<string, unknown>;
  for (const [field, rule] of Object.entries(spec)) {
    const issue = checkRule(field, rec[field], rule, units);
    if (issue) issues.push(issue);
  }
  return issues;
}
