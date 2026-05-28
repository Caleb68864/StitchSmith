import { describe, it, expect } from 'vitest';
import { buildPattern } from '../buildPattern.js';
import type { BookCoverInputs } from '../types.js';

const BASE: BookCoverInputs = {
  book_height: 200,
  book_width: 150,
  spine_width: 25,
  flap_depth: 70,
  units: 'mm',
};

function baseStepCount(): number {
  const result = buildPattern(BASE);
  if (!result.ok) throw new Error('base pattern failed');
  return result.value.steps.length;
}

describe('closure steps — none', () => {
  it('closure omitted produces no closure steps', () => {
    const result = buildPattern(BASE);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const closureSteps = result.value.steps.filter(s => s.group === 'Closure');
    expect(closureSteps).toHaveLength(0);
  });

  it('closure: none produces no closure steps', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'none' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const closureSteps = result.value.steps.filter(s => s.group === 'Closure');
    expect(closureSteps).toHaveLength(0);
  });

  it('closure: none step count matches omitted closure', () => {
    const noClosureResult = buildPattern(BASE);
    const noneResult = buildPattern({ ...BASE, closure: { kind: 'none' } });
    expect(noClosureResult.ok).toBe(true);
    expect(noneResult.ok).toBe(true);
    if (!noClosureResult.ok || !noneResult.ok) return;
    expect(noneResult.value.steps.length).toBe(noClosureResult.value.steps.length);
  });
});

describe('closure steps — zipper', () => {
  it('zipper adds at least 1 closure step', () => {
    const base = baseStepCount();
    const result = buildPattern({ ...BASE, closure: { kind: 'zipper', gauge: '#5' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.steps.length).toBeGreaterThan(base);
  });

  it('zipper step title contains "zipper"', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'zipper', gauge: '#5' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const zipperStep = result.value.steps.find(s =>
      s.title.toLowerCase().includes('zipper')
    );
    expect(zipperStep).toBeDefined();
  });

  it('zipper step body mentions gauge and coil', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'zipper', gauge: '#5' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const zipperStep = result.value.steps.find(s =>
      s.title.toLowerCase().includes('zipper')
    );
    expect(zipperStep).toBeDefined();
    expect(zipperStep!.body).toMatch(/#5/);
    expect(zipperStep!.body.toLowerCase()).toMatch(/coil/);
  });

  it('zipper step body mentions perimeter length in mm', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'zipper', gauge: '#5' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const zipperStep = result.value.steps.find(s =>
      s.title.toLowerCase().includes('zipper')
    );
    expect(zipperStep).toBeDefined();
    expect(zipperStep!.body).toMatch(/\d+ mm/);
  });

  it('#8 gauge zipper step body mentions #8', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'zipper', gauge: '#10' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const zipperStep = result.value.steps.find(s =>
      s.title.toLowerCase().includes('zipper')
    );
    expect(zipperStep).toBeDefined();
    expect(zipperStep!.body).toMatch(/#10/);
  });
});

describe('closure steps — elastic', () => {
  it('elastic adds at least 1 closure step', () => {
    const base = baseStepCount();
    const result = buildPattern({ ...BASE, closure: { kind: 'elastic' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.steps.length).toBeGreaterThan(base);
  });

  it('elastic step title contains "elastic"', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'elastic' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const elasticStep = result.value.steps.find(s =>
      s.title.toLowerCase().includes('elastic')
    );
    expect(elasticStep).toBeDefined();
  });
});

describe('closure steps — snap', () => {
  it('snap adds at least 1 closure step', () => {
    const base = baseStepCount();
    const result = buildPattern({ ...BASE, closure: { kind: 'snap' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.steps.length).toBeGreaterThan(base);
  });

  it('snap step title contains "snap"', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'snap' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const snapStep = result.value.steps.find(s =>
      s.title.toLowerCase().includes('snap')
    );
    expect(snapStep).toBeDefined();
  });
});

describe('closure steps — flap-buckle', () => {
  it('flap-buckle adds at least 1 closure step', () => {
    const base = baseStepCount();
    const result = buildPattern({ ...BASE, closure: { kind: 'flap-buckle' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.steps.length).toBeGreaterThan(base);
  });

  it('flap-buckle step title contains "buckle" or "strap"', () => {
    const result = buildPattern({ ...BASE, closure: { kind: 'flap-buckle' } });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const buckleStep = result.value.steps.find(s =>
      s.title.toLowerCase().includes('buckle') || s.title.toLowerCase().includes('strap')
    );
    expect(buckleStep).toBeDefined();
  });
});
