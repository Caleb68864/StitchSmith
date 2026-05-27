import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useBookCoverProject, makeDefaultBookCoverProject } from './useBookCoverProject.js';

describe('makeDefaultBookCoverProject', () => {
  it('has generatorId book-cover', () => {
    const p = makeDefaultBookCoverProject();
    expect(p.generatorId).toBe('book-cover');
  });

  it('has schemaVersion 4', () => {
    const p = makeDefaultBookCoverProject();
    expect(p.schemaVersion).toBe(4);
  });

  it('has expected default dimensions', () => {
    const p = makeDefaultBookCoverProject();
    expect(p.inputs.book_height).toBe(240);
    expect(p.inputs.book_width).toBe(165);
    expect(p.inputs.spine_width).toBe(20);
    expect(p.inputs.flap_depth).toBe(30);
    expect(p.inputs.units).toBe('mm');
  });

  it('has default seam_allowance', () => {
    const p = makeDefaultBookCoverProject();
    expect(p.inputs.seam_allowance).toBe(9.5);
  });

  it('has default top_bottom_hem', () => {
    const p = makeDefaultBookCoverProject();
    expect(p.inputs.top_bottom_hem).toBe(12);
  });

  it('starts with no accessories', () => {
    const p = makeDefaultBookCoverProject();
    expect(p.inputs.outer_pocket).toBeUndefined();
    expect(p.inputs.inner_pocket).toBeUndefined();
    expect(p.inputs.pen_holder).toBeUndefined();
  });
});

describe('useBookCoverProject', () => {
  it('initial project has generatorId book-cover', () => {
    const { result } = renderHook(() => useBookCoverProject());
    expect(result.current.project.generatorId).toBe('book-cover');
  });

  it('initial project has schemaVersion 4', () => {
    const { result } = renderHook(() => useBookCoverProject());
    expect(result.current.project.schemaVersion).toBe(4);
  });

  it('updateInputs merges partial changes and bumps updatedAt', () => {
    const { result } = renderHook(() => useBookCoverProject());
    const before = result.current.project.updatedAt;

    act(() => {
      result.current.updateInputs({ book_height: 300 });
    });

    expect(result.current.project.inputs.book_height).toBe(300);
    expect(result.current.project.inputs.book_width).toBe(165);
    expect(result.current.project.inputs.units).toBe('mm');
    expect(typeof result.current.project.updatedAt).toBe('string');
    expect(new Date(result.current.project.updatedAt).getTime()).toBeGreaterThanOrEqual(
      new Date(before).getTime(),
    );
  });

  it('updateInputs preserves other fields', () => {
    const { result } = renderHook(() => useBookCoverProject());
    act(() => {
      result.current.updateInputs({ spine_width: 30 });
    });
    expect(result.current.project.inputs.book_height).toBe(240);
    expect(result.current.project.inputs.seam_allowance).toBe(9.5);
  });

  it('resetProject restores defaults', () => {
    const { result } = renderHook(() => useBookCoverProject());
    act(() => {
      result.current.updateInputs({ book_height: 999 });
    });
    act(() => {
      result.current.resetProject();
    });
    expect(result.current.project.inputs.book_height).toBe(240);
    expect(result.current.project.projectName).toBe('My Book Cover');
  });

  it('toggleOuterPocket enables outer pocket', () => {
    const { result } = renderHook(() => useBookCoverProject());
    expect(result.current.project.inputs.outer_pocket).toBeUndefined();
    act(() => {
      result.current.toggleOuterPocket(true);
    });
    expect(result.current.project.inputs.outer_pocket).toBeDefined();
    expect(result.current.project.inputs.outer_pocket?.width).toBeGreaterThan(0);
  });

  it('toggleOuterPocket disables outer pocket', () => {
    const { result } = renderHook(() => useBookCoverProject());
    act(() => {
      result.current.toggleOuterPocket(true);
    });
    act(() => {
      result.current.toggleOuterPocket(false);
    });
    expect(result.current.project.inputs.outer_pocket).toBeUndefined();
  });

  it('toggleInnerPocket enables and disables inner pocket', () => {
    const { result } = renderHook(() => useBookCoverProject());
    act(() => {
      result.current.toggleInnerPocket(true);
    });
    expect(result.current.project.inputs.inner_pocket).toBeDefined();
    act(() => {
      result.current.toggleInnerPocket(false);
    });
    expect(result.current.project.inputs.inner_pocket).toBeUndefined();
  });

  it('togglePenHolder enables and disables pen holder', () => {
    const { result } = renderHook(() => useBookCoverProject());
    act(() => {
      result.current.togglePenHolder(true);
    });
    expect(result.current.project.inputs.pen_holder).toBeDefined();
    expect(result.current.project.inputs.pen_holder?.count).toBeGreaterThan(0);
    act(() => {
      result.current.togglePenHolder(false);
    });
    expect(result.current.project.inputs.pen_holder).toBeUndefined();
  });

  it('importProject rejects wrong generatorId', () => {
    const { result } = renderHook(() => useBookCoverProject());
    expect(() => {
      act(() => {
        // @ts-expect-error intentional wrong generatorId for test
        result.current.importProject({ generatorId: 'tool-roll', schemaVersion: 4, inputs: {} });
      });
    }).toThrow();
  });

  it('importProject accepts correct generatorId', () => {
    const { result } = renderHook(() => useBookCoverProject());
    const p = makeDefaultBookCoverProject();
    const modified = { ...p, projectName: 'Imported Cover' };
    act(() => {
      result.current.importProject(modified);
    });
    expect(result.current.project.projectName).toBe('Imported Cover');
  });
});
