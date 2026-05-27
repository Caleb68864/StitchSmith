// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { buildPouch } from '../index.js';
import { NotImplementedError } from '../construction/ConstructionStrategy.js';
import type { PouchSpec } from '../construction/ConstructionStrategy.js';

const baseObject = { width: 64, depth: 25, height: 191 };
const baseFit = { width_ease: 6, depth_ease: 6, height_ease: 0 };

describe('stub construction methods throw NotImplementedError', () => {
  it('boxed_gusset throws NotImplementedError with method name in message', () => {
    const spec: PouchSpec = {
      object: baseObject,
      fit: baseFit,
      construction: 'boxed_gusset',
      seamAllowance: 9.5,
      units: 'mm',
    };
    expect(() => buildPouch(spec)).toThrow(NotImplementedError);
    expect(() => buildPouch(spec)).toThrow('boxed_gusset');
  });

  it('center_gusset throws NotImplementedError with method name in message', () => {
    const spec: PouchSpec = {
      object: baseObject,
      fit: baseFit,
      construction: 'center_gusset',
      seamAllowance: 9.5,
      units: 'mm',
    };
    expect(() => buildPouch(spec)).toThrow(NotImplementedError);
    expect(() => buildPouch(spec)).toThrow('center_gusset');
  });

  it('taco throws NotImplementedError with method name in message', () => {
    const spec: PouchSpec = {
      object: baseObject,
      fit: baseFit,
      construction: 'taco',
      seamAllowance: 9.5,
      units: 'mm',
    };
    expect(() => buildPouch(spec)).toThrow(NotImplementedError);
    expect(() => buildPouch(spec)).toThrow('taco');
  });

  it('NotImplementedError has name === "NotImplementedError"', () => {
    const spec: PouchSpec = {
      object: baseObject,
      fit: baseFit,
      construction: 'boxed_gusset',
      seamAllowance: 9.5,
    };
    let caught: unknown;
    try {
      buildPouch(spec);
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(NotImplementedError);
    expect((caught as NotImplementedError).name).toBe('NotImplementedError');
  });
});
