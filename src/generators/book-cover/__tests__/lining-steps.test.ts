import { describe, it, expect } from 'vitest';
import { buildPattern } from '../buildPattern.js';
import type { BookCoverInputs } from '../types.js';

const BASE: BookCoverInputs = {
  units: 'mm',
  book_height: 210,
  book_width: 148,
  spine_width: 15,
  flap_depth: 65,
};

function getSteps(inputs: BookCoverInputs) {
  const result = buildPattern(inputs);
  if (!result.ok) throw new Error(result.error.message);
  return result.value.steps;
}

describe('buildSteps — lining enabled: 7-step canonical sequence', () => {
  it('returns at least 7 steps when lining is enabled', () => {
    const steps = getSteps({ ...BASE, lining: { enabled: true } });
    expect(steps.length).toBeGreaterThanOrEqual(7);
  });

  it('first step title contains "cut" (case-insensitive) when lining is enabled', () => {
    const steps = getSteps({ ...BASE, lining: { enabled: true } });
    expect(steps[0].title.toLowerCase()).toContain('cut');
  });

  it('second step title contains "interfacing" when lining is enabled', () => {
    const steps = getSteps({ ...BASE, lining: { enabled: true } });
    expect(steps[1].title.toLowerCase()).toContain('interfacing');
  });

  it('third step title contains "internal" when lining is enabled', () => {
    const steps = getSteps({ ...BASE, lining: { enabled: true } });
    expect(steps[2].title.toLowerCase()).toContain('internal');
  });

  it('fourth step title contains "sleeve" when lining is enabled', () => {
    const steps = getSteps({ ...BASE, lining: { enabled: true } });
    expect(steps[3].title.toLowerCase()).toContain('sleeve');
  });

  it('fifth step title contains "perimeter" when lining is enabled', () => {
    const steps = getSteps({ ...BASE, lining: { enabled: true } });
    expect(steps[4].title.toLowerCase()).toContain('perimeter');
  });

  it('sixth step title contains "closure" when lining is enabled', () => {
    const steps = getSteps({ ...BASE, lining: { enabled: true } });
    expect(steps[5].title.toLowerCase()).toContain('closure');
  });

  it('seventh step title contains "fit" when lining is enabled', () => {
    const steps = getSteps({ ...BASE, lining: { enabled: true } });
    expect(steps[6].title.toLowerCase()).toContain('fit');
  });

  it('step ids are unique when lining is enabled', () => {
    const steps = getSteps({ ...BASE, lining: { enabled: true } });
    const ids = steps.map(s => s.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('step bodies reference numeric mm values when lining is enabled', () => {
    const steps = getSteps({ ...BASE, lining: { enabled: true } });
    const hasMm = steps.some(s => s.body.includes('mm'));
    expect(hasMm).toBe(true);
  });
});

describe('buildSteps — lining disabled: 5-step legacy sequence', () => {
  it('returns the existing steps when lining is disabled', () => {
    const steps = getSteps({ ...BASE, lining: { enabled: false } });
    expect(steps.length).toBeGreaterThanOrEqual(5);
  });

  it('first step title is "Gather materials" when lining is disabled', () => {
    const steps = getSteps({ ...BASE, lining: { enabled: false } });
    expect(steps[0].title).toBe('Gather materials');
  });

  it('second step title is "Cut the body and inner flap pieces" when lining is disabled', () => {
    const steps = getSteps({ ...BASE, lining: { enabled: false } });
    expect(steps[1].title).toBe('Cut the body and inner flap pieces');
  });

  it('returns the same number of steps as no-lining baseline', () => {
    const withDisabled = getSteps({ ...BASE, lining: { enabled: false } });
    const withoutLining = getSteps(BASE);
    expect(withDisabled.length).toBe(withoutLining.length);
  });

  it('first 5 step ids match when lining is absent vs disabled', () => {
    const withDisabled = getSteps({ ...BASE, lining: { enabled: false } });
    const withoutLining = getSteps(BASE);
    for (let i = 0; i < 5; i++) {
      expect(withDisabled[i].id).toBe(withoutLining[i].id);
    }
  });
});
