import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMagPouchProject, makeDefaultMagPouchProject } from './useMagPouchProject.js';

describe('useMagPouchProject.importProject', () => {
  it('rejects a project from another generator', () => {
    const { result } = renderHook(() => useMagPouchProject());
    expect(() => {
      act(() => {
        // @ts-expect-error intentional wrong generatorId
        result.current.importProject({ ...makeDefaultMagPouchProject(), generatorId: 'tri-zip-backpack' });
      });
    }).toThrow(/Mag Pouch/i);
    expect(result.current.project.generatorId).toBe('mag-pouch');
  });

  it('accepts a mag-pouch project', () => {
    const { result } = renderHook(() => useMagPouchProject());
    act(() => {
      result.current.importProject({ ...makeDefaultMagPouchProject(), projectName: 'Imported' });
    });
    expect(result.current.project.projectName).toBe('Imported');
  });
});
