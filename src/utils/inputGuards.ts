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

/** Words that must not come back sentence-cased when a field name is humanised. */
const WORD_FIXUPS: Readonly<Record<string, string>> = {
  pals: 'PALS', molle: 'MOLLE', velcro: 'Velcro', qd: 'QD', lbv: 'LBV', sa: 'seam allowance',
  id: 'ID', ak: 'AK', ar: 'AR', y: 'Y', x: 'X', t: 'T',
};

/** Trailing unit suffixes on a field name: the message states the unit itself. */
const TRAILING_UNITS = new Set(['deg', 'degrees', 'mm', 'cm', 'in', 'inches', 'pct', 'percent']);

/**
 * "pouch_width" → "Pouch width", "pals_rows_side" → "PALS rows side".
 *
 * Only 16 of the ~370 guard rules carried an explicit `label`, so nearly every
 * message a user could see named the internal key. Deriving the label means
 * every rule reads properly without 370 hand-written strings; an explicit
 * `label` still wins where the key does not humanise well.
 */
export function humaniseField(field: string): string {
  const raw = field.split(/[_\s]+/).filter(Boolean);
  while (raw.length > 1 && TRAILING_UNITS.has(raw[raw.length - 1].toLowerCase())) raw.pop();
  const words = raw.map((w) => WORD_FIXUPS[w.toLowerCase()] ?? w);
  if (words.length === 0) return field;
  const [first, ...rest] = words;
  const head = WORD_FIXUPS[first.toLowerCase()] === first && first === first.toUpperCase()
    ? first
    : first.charAt(0).toUpperCase() + first.slice(1);
  return [head, ...rest].join(' ');
}

/** "in" is fine on a label but reads badly mid-sentence ("a number in in"). */
function unitWord(units: 'mm' | 'in'): string { return units === 'in' ? 'inches' : 'millimetres'; }

/** The unit suffix to put on a numeric bound, so a limit never reads as a bare number. */
function boundUnit(kind: GuardKind, units: 'mm' | 'in'): string {
  if (kind === 'length') return ` ${units}`;
  if (kind === 'percent') return '%';
  if (kind === 'angle') return '°';
  return '';
}

export function checkRule(field: string, value: unknown, rule: GuardRule, units: 'mm' | 'in'): GuardIssue | null {
  if (value === undefined || value === null) return null;
  const label = rule.label ?? humaniseField(field);
  switch (rule.kind) {
    case 'length':
    case 'count':
    case 'ratio':
    case 'percent':
    case 'angle':
    case 'number': {
      if (!isFiniteNumber(value)) return { field, message: `${label} needs a number${rule.kind === 'length' ? ` in ${unitWord(units)}` : ''}, and ${describe(value)} is not one. Clear the box to go back to the default.` };
      const min = rule.min ?? (rule.kind === 'number' ? -Infinity : 0);
      const max = rule.max ?? (rule.kind === 'length' ? (units === 'in' ? MAX_LENGTH_IN : MAX_LENGTH_MM) : rule.kind === 'count' ? 1000 : rule.kind === 'ratio' ? 1 : rule.kind === 'percent' ? 100 : rule.kind === 'angle' ? 360 : Infinity);
      const u = boundUnit(rule.kind, units);
      if (value < min) return { field, message: `${label} must be at least ${min}${u}, not ${formatNumberForMessage(value)}${u}.` };
      if (value > max) return { field, message: `${label} must be at most ${max}${u}, not ${formatNumberForMessage(value)}${u}.` };
      if ((rule.integer || rule.kind === 'count') && !Number.isInteger(value)) return { field, message: `${label} must be a whole number, so ${formatNumberForMessage(value)} will not do.` };
      return null;
    }
    case 'enum':
      if (typeof value !== 'string' || !(rule.allowed ?? []).includes(value)) return { field, message: `${label} must be ${orList((rule.allowed ?? []).map(humaniseValue))}, and ${describe(value)} is not one of those.` };
      return null;
    case 'bool':
      if (typeof value !== 'boolean') return { field, message: `${label} is a yes/no setting, so ${describe(value)} will not do.` };
      return null;
    case 'string':
      if (typeof value !== 'string') return { field, message: `${label} must be text, so ${describe(value)} will not do.` };
      return null;
    case 'numArray':
      if (!Array.isArray(value)) return { field, message: `${label} must be a list of numbers, and ${describe(value)} is not one.` };
      if (value.some((x) => !isFiniteNumber(x))) return { field, message: `${label} has an entry that is not a number. Every entry needs a measurement in ${units}.` };
      if (rule.max !== undefined && value.some((x) => x > rule.max!)) return { field, message: `${label} has an entry above ${rule.max} ${units}.` };
      if (rule.min !== undefined && value.some((x) => x < rule.min!)) return { field, message: `${label} has an entry below ${rule.min} ${units}.` };
      return null;
    case 'object':
      if (typeof value !== 'object' || Array.isArray(value)) return { field, message: `${label} is missing or malformed in this project file.` };
      return null;
  }
}

/** "a, b or c" — a readable list of the allowed values. */
function orList(items: readonly string[]): string {
  if (items.length === 0) return 'unset';
  if (items.length === 1) return items[0];
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`;
}

/** Enum members are stored snake_case; show them the way the select does. */
function humaniseValue(v: string): string { return v.replace(/_/g, ' '); }

function describe(v: unknown): string {
  if (typeof v === 'number') return Number.isNaN(v) ? 'that' : formatNumberForMessage(v);
  if (typeof v === 'string') return v === '' ? 'an empty string' : `"${v}"`;
  if (Array.isArray(v)) return 'a list';
  if (v && typeof v === 'object') return 'an object';
  return String(v);
}

/** 1e9 is unreadable in a sentence; 1,000,000,000 is not much better, so cap the digits shown. */
function formatNumberForMessage(v: number): string {
  if (!Number.isFinite(v)) return String(v);
  if (Math.abs(v) >= 1e6) return v.toExponential(2).replace('e+', ' × 10^');
  return String(Math.round(v * 1e4) / 1e4);
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
