// @vitest-environment node
import { describe, it, expect, vi, afterEach } from 'vitest';
import { pipelineSteps, runCalcPipeline } from '../geometry/calc.js';
import type { PouchSpec } from '../construction/ConstructionStrategy.js';

const baseSpec: PouchSpec = {
  object: { width: 64, depth: 25, height: 191 },
  fit: { width_ease: 6, depth_ease: 6, height_ease: 0 },
  construction: 'folded_t',
  seamAllowance: 9.5,
  units: 'mm',
};

const STEP_ORDER = [
  'parseSpec',
  'internalDimensions',
  'checkAspectRatio',
  'computePanelGeometry',
  'applySeamAllowances',
  'buildEdges',
  'assemblePieces',
] as const;

type StepName = (typeof STEP_ORDER)[number];

describe('calc pipeline step order', () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('calls all 7 pipeline steps in the correct order', () => {
    const callOrder: StepName[] = [];

    // Capture real implementations before spying
    const originals = {} as Record<StepName, (...args: never[]) => unknown>;
    for (const name of STEP_ORDER) {
      originals[name] = pipelineSteps[name] as (...args: never[]) => unknown;
    }

    // Install tracking wrappers
    for (const name of STEP_ORDER) {
      const orig = originals[name];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pipelineSteps as any)[name] = (...args: unknown[]) => {
        callOrder.push(name);
        return (orig as (...a: unknown[]) => unknown)(...args);
      };
    }

    try {
      runCalcPipeline(baseSpec);
    } finally {
      // Restore
      for (const name of STEP_ORDER) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (pipelineSteps as any)[name] = originals[name];
      }
    }

    expect(callOrder).toEqual([...STEP_ORDER]);
  });

  it('each step is called exactly once', () => {
    const callCounts = {} as Record<StepName, number>;
    for (const name of STEP_ORDER) callCounts[name] = 0;

    const originals = {} as Record<StepName, (...args: never[]) => unknown>;
    for (const name of STEP_ORDER) {
      originals[name] = pipelineSteps[name] as (...args: never[]) => unknown;
    }

    for (const name of STEP_ORDER) {
      const orig = originals[name];
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (pipelineSteps as any)[name] = (...args: unknown[]) => {
        callCounts[name]++;
        return (orig as (...a: unknown[]) => unknown)(...args);
      };
    }

    try {
      runCalcPipeline(baseSpec);
    } finally {
      for (const name of STEP_ORDER) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (pipelineSteps as any)[name] = originals[name];
      }
    }

    for (const name of STEP_ORDER) {
      expect(callCounts[name], `${name} should be called exactly once`).toBe(1);
    }
  });
});
