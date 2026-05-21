---
sub_spec_id: SS-04
phase: run
depends_on: ['SS-02']
dispatch: factory
---

# Sub-Spec 4 — LocalStorage persistence and project state hook

## Scope

Debounced LocalStorage auto-save, robust load with fallback. React state hook `useToolRollProject` exposing project + mutation methods. Storage key: `stitchsmith.tool-roll.v1`. Schema-validated load. Storage-unavailable graceful degradation.

## Files (new)

- `src/storage/localStorage.ts`
- `src/storage/localStorage.test.ts`
- `src/state/useToolRollProject.ts`
- `src/state/useToolRollProject.test.ts`

## Interface Contracts

**Provides (consumed by SS-06/08/10):**
- `loadProject(): ToolRollProject | null`
- `saveProject(p: ToolRollProject): void` (debounced, idempotent, swallows storage errors)
- `clearProject(): void`
- `useToolRollProject()` hook returning `{ project, setProject, addTool, updateTool, duplicateTool, deleteTool, moveToolUp, moveToolDown, updateSettings, resetProject, importProject, storageWarning }`.

**Requires (from SS-02/03):** types, `defaultToolRollSettings`, `sampleTools`, `generateId`, `validateTool`, `validateSettings`.

## Implementation Steps (TDD)

### Step 1. Storage layer tests + impl

`localStorage.test.ts`:

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loadProject, saveProject, clearProject, STORAGE_KEY } from './localStorage';

beforeEach(() => { localStorage.clear(); vi.useFakeTimers(); });

describe('storage', () => {
  it('returns null when empty', () => { expect(loadProject()).toBeNull(); });
  it('round-trips a valid project', () => {
    const p = { schemaVersion: 1 as const, projectName: 'x', generatorId: 'tool-roll' as const, units: 'mm' as const, settings: {/* defaults */}, tools: [], createdAt: '', updatedAt: '' };
    saveProject(p as any);
    vi.runAllTimers();
    expect(loadProject()).toMatchObject({ projectName: 'x' });
  });
  it('returns null on invalid JSON', () => {
    localStorage.setItem(STORAGE_KEY, '{not json');
    expect(loadProject()).toBeNull();
  });
  it('returns null on schema mismatch', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ schemaVersion: 99 }));
    expect(loadProject()).toBeNull();
  });
  it('saveProject does not throw when storage is unavailable', () => {
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('QuotaExceededError'); });
    expect(() => { saveProject({} as any); vi.runAllTimers(); }).not.toThrow();
    setItem.mockRestore();
  });
});
```

Implement `localStorage.ts`:

```ts
import type { ToolRollProject } from '../generators/tool-roll/types';

export const STORAGE_KEY = 'stitchsmith.tool-roll.v1';
const DEBOUNCE_MS = 400;
let timer: ReturnType<typeof setTimeout> | null = null;
let pending: ToolRollProject | null = null;
let warnedOnce = false;

export function loadProject(): ToolRollProject | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (parsed?.schemaVersion !== 1 || parsed?.generatorId !== 'tool-roll' || !parsed?.settings || !Array.isArray(parsed?.tools)) return null;
    return parsed as ToolRollProject;
  } catch { return null; }
}

export function saveProject(p: ToolRollProject): void {
  pending = p;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pending)); }
    catch (err) { if (!warnedOnce) { console.warn('StitchSmith: LocalStorage unavailable, session will not persist', err); warnedOnce = true; } }
    timer = null;
  }, DEBOUNCE_MS);
}

export function clearProject(): void { try { localStorage.removeItem(STORAGE_KEY); } catch { /* swallow */ } }
export function isStorageWarned(): boolean { return warnedOnce; }
```

### Step 2. State hook tests + impl

`useToolRollProject.test.ts` (using `@testing-library/react`'s `renderHook`):

```ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useToolRollProject } from './useToolRollProject';

describe('useToolRollProject', () => {
  it('starts with sample project when storage is empty', () => {
    localStorage.clear();
    const { result } = renderHook(() => useToolRollProject());
    expect(result.current.project.tools.length).toBeGreaterThan(0);
  });
  it('addTool increments tool count', () => {
    const { result } = renderHook(() => useToolRollProject());
    const before = result.current.project.tools.length;
    act(() => result.current.addTool({ name: 'new', width: 10, thickness: 2, height: 100, visibleAmount: 20 }));
    expect(result.current.project.tools.length).toBe(before + 1);
  });
  it('resetProject restores sample tools', () => {
    const { result } = renderHook(() => useToolRollProject());
    act(() => result.current.deleteTool(result.current.project.tools[0].id));
    act(() => result.current.resetProject());
    expect(result.current.project.tools.length).toBeGreaterThan(0);
  });
});
```

Implement `useToolRollProject.ts`:

- On mount: try `loadProject()`. If null, build a starter project from `defaultToolRollSettings` + `sampleTools` with `crypto.randomUUID()`-ish ids and `createdAt`/`updatedAt`.
- `setProject(p)` updates state + calls `saveProject(p)` (debounced).
- `addTool(partial)` → creates a `ToolItem` with `generateId('tool')`, appends, calls `setProject`.
- `updateTool(id, patch)` → maps tools, replaces matching id.
- `duplicateTool(id)` → finds, deep-copies with new id, inserts after original.
- `deleteTool(id)`.
- `moveToolUp(id)`, `moveToolDown(id)` → array index swap.
- `updateSettings(patch)` → merges into `project.settings`.
- `resetProject()` → starter project, calls `setProject`.
- `importProject(p)` → replaces state with validated project.
- `storageWarning` → boolean from `isStorageWarned()`.

### Step 3. Verify + commit

```bash
npm test -- --run
npm run build
git add src/storage src/state
git commit -m "factory(SS-04): LocalStorage persistence + useToolRollProject hook [factory-managed]"
```

## Verification Commands

| Verifier | Command |
|----------|---------|
| Storage tests pass | `npm test src/storage -- --run` |
| Hook tests pass | `npm test src/state -- --run` |

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| Storage key constant | [STRUCTURAL] | `grep -q "stitchsmith.tool-roll.v1" src/storage/localStorage.ts \|\| (echo "FAIL: wrong storage key" && exit 1)` |
| Exports loadProject/saveProject/clearProject | [STRUCTURAL] | `grep -q "export function loadProject" src/storage/localStorage.ts && grep -q "export function saveProject" src/storage/localStorage.ts && grep -q "export function clearProject" src/storage/localStorage.ts \|\| (echo "FAIL: storage exports missing" && exit 1)` |
| Hook exists | [STRUCTURAL] | `grep -q "export function useToolRollProject" src/state/useToolRollProject.ts \|\| (echo "FAIL: useToolRollProject not exported" && exit 1)` |
| Tests pass | [MECHANICAL] | `npm test -- --run` |
