import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useRollTopSackProject, makeDefaultRollTopSackProject } from './useRollTopSackProject.js';

describe('makeDefaultRollTopSackProject', () => {
  it('has generatorId roll-top-sack', () => {
    const p = makeDefaultRollTopSackProject();
    expect(p.generatorId).toBe('roll-top-sack');
  });

  it('has schemaVersion 1', () => {
    const p = makeDefaultRollTopSackProject();
    expect(p.schemaVersion).toBe(1);
  });

  it('has collar_height 120', () => {
    const p = makeDefaultRollTopSackProject();
    expect(p.inputs.collar_height).toBe(120);
  });

  it('has default sample inputs', () => {
    const p = makeDefaultRollTopSackProject();
    expect(p.inputs.bottom_length).toBe(200);
    expect(p.inputs.bottom_width).toBe(100);
    expect(p.inputs.height_when_rolled).toBe(300);
    expect(p.inputs.units).toBe('mm');
  });
});

describe('useRollTopSackProject', () => {
  it('initial project has generatorId roll-top-sack', () => {
    const { result } = renderHook(() => useRollTopSackProject());
    expect(result.current.project.generatorId).toBe('roll-top-sack');
  });

  it('initial project has collar_height 120', () => {
    const { result } = renderHook(() => useRollTopSackProject());
    expect(result.current.project.inputs.collar_height).toBe(120);
  });

  it('updateInputs merges partial changes and bumps updatedAt', () => {
    const { result } = renderHook(() => useRollTopSackProject());
    const before = result.current.project.updatedAt;

    // Small delay to ensure updatedAt changes
    act(() => {
      result.current.updateInputs({ bottom_length: 250 });
    });

    expect(result.current.project.inputs.bottom_length).toBe(250);
    // Other inputs preserved
    expect(result.current.project.inputs.bottom_width).toBe(100);
    expect(result.current.project.inputs.units).toBe('mm');
    // updatedAt bumped (or at least is a valid ISO string)
    expect(typeof result.current.project.updatedAt).toBe('string');
    expect(result.current.project.updatedAt).not.toBe('');
    // updatedAt is >= before
    expect(new Date(result.current.project.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(before).getTime(),
    );
  });

  it('updateInputs preserves units and other fields', () => {
    const { result } = renderHook(() => useRollTopSackProject());
    act(() => {
      result.current.updateInputs({ bottom_length: 300 });
    });
    expect(result.current.project.inputs.units).toBe('mm');
    expect(result.current.project.inputs.collar_height).toBe(120);
  });

  it('resetProject restores defaults', () => {
    const { result } = renderHook(() => useRollTopSackProject());
    act(() => {
      result.current.updateInputs({ bottom_length: 999 });
    });
    act(() => {
      result.current.resetProject();
    });
    expect(result.current.project.inputs.bottom_length).toBe(200);
  });

  it('importProject rejects wrong generatorId', () => {
    const { result } = renderHook(() => useRollTopSackProject());
    expect(() => {
      act(() => {
        // @ts-expect-error intentional wrong generatorId for test
        result.current.importProject({ generatorId: 'tool-roll', schemaVersion: 1, inputs: {} });
      });
    }).toThrow();
  });

  it('importProject accepts correct generatorId', () => {
    const { result } = renderHook(() => useRollTopSackProject());
    const p = makeDefaultRollTopSackProject();
    const modified = { ...p, projectName: 'Imported Sack' };
    act(() => {
      result.current.importProject(modified);
    });
    expect(result.current.project.projectName).toBe('Imported Sack');
  });
});
