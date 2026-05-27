// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { resolveEase, easeDefaults, validateEase } from '../fit/ease.js';
import { internalDimensions } from '../geometry/calc.js';
import type { FitParams } from '../fit/index.js';

describe('ease defaults', () => {
  it('snug has smaller ease than standard', () => {
    expect(easeDefaults.snug.width_ease).toBeLessThan(easeDefaults.standard.width_ease);
    expect(easeDefaults.snug.depth_ease).toBeLessThan(easeDefaults.standard.depth_ease);
  });

  it('relaxed has larger ease than standard', () => {
    expect(easeDefaults.relaxed.width_ease).toBeGreaterThan(easeDefaults.standard.width_ease);
    expect(easeDefaults.relaxed.depth_ease).toBeGreaterThan(easeDefaults.standard.depth_ease);
  });
});

describe('resolveEase', () => {
  it('returns standard defaults when no args', () => {
    const ease = resolveEase();
    expect(ease).toEqual(easeDefaults.standard);
  });

  it('applies overrides on top of base fit style', () => {
    const ease = resolveEase('snug', { width_ease: 10 });
    expect(ease.width_ease).toBe(10);
    expect(ease.depth_ease).toBe(easeDefaults.snug.depth_ease);
  });
});

describe('validateEase', () => {
  it('returns no errors for valid ease values', () => {
    expect(validateEase({ width_ease: 6, depth_ease: 6, height_ease: 0 })).toHaveLength(0);
  });

  it('returns an error for negative ease', () => {
    const errors = validateEase({ width_ease: -1, depth_ease: 6, height_ease: 0 });
    expect(errors.length).toBeGreaterThan(0);
  });
});

describe('internalDimensions formula', () => {
  it('adds ease to width and depth, multiplies height by exposed_percentage', () => {
    const obj = { width: 64, depth: 25, height: 191 };
    const fit: FitParams = {
      width_ease: 6,
      depth_ease: 6,
      height_ease: 0,
      exposed_percentage: 1.0,
    };
    const dims = internalDimensions(obj, fit);
    expect(dims.width).toBe(70);
    expect(dims.depth).toBe(31);
    expect(dims.height).toBe(191);
  });

  it('applies exposed_percentage to height', () => {
    const obj = { width: 100, depth: 50, height: 200 };
    const fit: FitParams = {
      width_ease: 0,
      depth_ease: 0,
      height_ease: 0,
      exposed_percentage: 0.75,
    };
    const dims = internalDimensions(obj, fit);
    expect(dims.height).toBe(150);
  });

  it('defaults exposed_percentage to 1.0 when undefined', () => {
    const obj = { width: 100, depth: 50, height: 200 };
    const fit: FitParams = {
      width_ease: 0,
      depth_ease: 0,
      height_ease: 0,
    };
    const dims = internalDimensions(obj, fit);
    expect(dims.height).toBe(200);
  });
});
