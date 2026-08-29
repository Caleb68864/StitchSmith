import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useTriZipProject, makeDefaultTriZipProject } from './useTriZipProject.js';

describe('useTriZipProject.importProject', () => {
  it('rejects a project from another generator', () => {
    const { result } = renderHook(() => useTriZipProject());
    expect(() => {
      act(() => {
        // @ts-expect-error intentional wrong generatorId
        result.current.importProject({ ...makeDefaultTriZipProject(), generatorId: 'mag-pouch' });
      });
    }).toThrow(/tri-zip/i);
    expect(result.current.project.generatorId).toBe('tri-zip-backpack');
  });

  it('accepts a tri-zip project', () => {
    const { result } = renderHook(() => useTriZipProject());
    act(() => {
      result.current.importProject({ ...makeDefaultTriZipProject(), projectName: 'Imported' });
    });
    expect(result.current.project.projectName).toBe('Imported');
  });
});
