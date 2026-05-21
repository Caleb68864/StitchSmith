---
sub_spec_id: SS-02
phase: run
depends_on: ['SS-01']
dispatch: factory
---

# Sub-Spec 2 — Type definitions, defaults, and sample data

## Scope

Define every TypeScript type from design §6, §7, §10, §16. Implement `defaultToolRollSettings` (§7.4), `sampleTools` (§38), `PAPER_SIZES_MM`, unit conversion, id generation, formatting, download helper. Pure data + utilities only — no React imports.

## Files (new)

- `src/generators/tool-roll/types.ts`
- `src/generators/tool-roll/defaults.ts`
- `src/utils/units.ts`
- `src/utils/units.test.ts`
- `src/utils/ids.ts`
- `src/utils/ids.test.ts`
- `src/utils/formatting.ts`
- `src/utils/download.ts`

## Files (modify)

None.

## Interface Contracts

**Provides (consumed by SS-03/04/06/07/08/09/10):**
- Types: `UnitSystem`, `ToolItem`, `ToolRollProject`, `ToolRollSettings`, `ToolRollLayout`, `PanelShape`, `PocketPanelShape`, `Point`, `PocketLayout`, `StitchLine`, `FoldLine`, `HemLine`, `SeamAllowanceLine`, `Notch`, `TieMark`, `PatternLabel`, `DimensionLine`, `PatternWarning`, `PrintLayout`, `PrintTile`, `BoundingBox`, `SvgPathData`.
- Enums: `SortMode`, `PocketTopStyle`, `PocketHeightMode`, `FlapHeightMode`, `TiePlacementMode`, `PrintPaperSize`, `PrintOrientation`, `LabelMode`.
- Constants: `defaultToolRollSettings`, `sampleTools`, `PAPER_SIZES_MM`.
- Functions: `inchesToMm(value)`, `mmToInches(value)`, `getPaperSize(size, orientation)`, `generateId()`, `formatDimension(value, units)`, `downloadTextFile(name, content, mime)`.

**Requires:** SS-01 scaffold (TypeScript + Vitest harness).

## Implementation Steps (TDD)

### Step 1. Write unit conversion tests first

Create `src/utils/units.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { inchesToMm, mmToInches, PAPER_SIZES_MM, getPaperSize } from './units';

describe('units', () => {
  it('inchesToMm', () => { expect(inchesToMm(1)).toBe(25.4); });
  it('mmToInches', () => { expect(mmToInches(25.4)).toBe(1); });
  it('round trip', () => { expect(mmToInches(inchesToMm(2.5))).toBeCloseTo(2.5); });
  it('PAPER_SIZES_MM has letter and a4', () => {
    expect(PAPER_SIZES_MM.letter.width).toBeCloseTo(215.9);
    expect(PAPER_SIZES_MM.a4.height).toBeCloseTo(297);
  });
  it('getPaperSize landscape swaps dimensions', () => {
    const p = getPaperSize('letter', 'landscape');
    expect(p.width).toBeCloseTo(279.4);
    expect(p.height).toBeCloseTo(215.9);
  });
});
```

Run `npm test -- --run`. Confirm it fails (no module yet).

### Step 2. Implement `src/utils/units.ts`

```ts
export type UnitSystem = 'mm' | 'in';

export const PAPER_SIZES_MM = {
  letter: { width: 215.9, height: 279.4 },
  a4:     { width: 210,   height: 297   },
} as const;

export type PrintPaperSize = 'letter' | 'a4';
export type PrintOrientation = 'portrait' | 'landscape';

export function inchesToMm(value: number): number { return value * 25.4; }
export function mmToInches(value: number): number { return value / 25.4; }

export function getPaperSize(size: PrintPaperSize, orientation: PrintOrientation) {
  const p = PAPER_SIZES_MM[size];
  return orientation === 'portrait' ? { width: p.width, height: p.height } : { width: p.height, height: p.width };
}
```

Re-run `npm test -- --run`. Should pass.

### Step 3. Implement `src/utils/ids.ts` + test

`ids.ts`:

```ts
export function generateId(prefix = 'id'): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}-${Date.now().toString(36)}`;
}
```

`ids.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { generateId } from './ids';

describe('generateId', () => {
  it('produces unique non-empty strings', () => {
    const a = generateId('tool');
    const b = generateId('tool');
    expect(a).not.toBe(b);
    expect(a).toMatch(/^tool-/);
  });
});
```

### Step 4. Implement `src/utils/formatting.ts`

```ts
import type { UnitSystem } from './units';
import { mmToInches } from './units';

export function formatDimension(valueMm: number, units: UnitSystem): string {
  if (units === 'in') {
    return `${mmToInches(valueMm).toFixed(2)} in`;
  }
  return `${valueMm.toFixed(1)} mm`;
}
```

### Step 5. Implement `src/utils/download.ts`

```ts
export function downloadTextFile(filename: string, content: string, mimeType: string): void {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
```

### Step 6. Implement `src/generators/tool-roll/types.ts`

Translate every type and enum from design §6, §7, §10. Export each as a named export. Do NOT duplicate `UnitSystem` from `units.ts` — instead `export type { UnitSystem } from '../../utils/units';` (or re-define here and only export from one place; pick one — types file is preferred for clean import paths).

Key definitions (full list per design):

```ts
import type { UnitSystem, PrintPaperSize, PrintOrientation } from '../../utils/units';
export type { UnitSystem, PrintPaperSize, PrintOrientation };

export type SortMode = 'manual' | 'widthAscending' | 'widthDescending' | 'heightAscending' | 'heightDescending' | 'pocketDepthAscending' | 'pocketDepthDescending';
export type PocketTopStyle = 'stepped' | 'sloped';
export type PocketHeightMode = 'individual' | 'steppedToIncrement' | 'sameAsTallest';
export type FlapHeightMode = 'fixed' | 'basedOnTallestTool' | 'basedOnPocketDepth';
export type TiePlacementMode = 'centered' | 'basedOnRollDiameter' | 'manual';
export type LabelMode = 'none' | 'toolNames' | 'toolNamesAndDimensions';

export type ToolItem = { id: string; name: string; width: number; thickness: number; height: number; visibleAmount: number; lockedOrder?: number; notes?: string; };

export type ToolRollSettings = { /* every field from design §7.3 */ };

export type Point = { x: number; y: number };
export type BoundingBox = { x: number; y: number; width: number; height: number };
export type SvgPathData = string;

// Lines/marks/labels per §10.5
// PanelShape, PocketPanelShape per §10.1, §10.2
// PocketLayout per §10.4
// PrintLayout, PrintTile per §16.4
// ToolRollLayout per §10 root
// ToolRollProject per §7.1
// PatternWarning per §10.5
```

Reference design §7 and §10 directly when filling in `ToolRollSettings` and `ToolRollLayout`.

### Step 7. Implement `src/generators/tool-roll/defaults.ts`

Copy `defaultToolRollSettings` and `sampleTools` verbatim from design §7.4 and §38. No changes to numeric defaults — those are sewing-domain values gated by escalation.

### Step 8. Verify

```bash
npm test -- --run
npm run build
```

Both must exit 0.

### Step 9. Commit

```bash
git add src/utils src/generators/tool-roll
git commit -m "factory(SS-02): types, defaults, and unit utilities [factory-managed]"
```

## Verification Commands

| Verifier | Command |
|----------|---------|
| All unit tests pass | `npm test -- --run` |
| Build clean | `npm run build` |
| Types compile under strict | `npx tsc --noEmit` |

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| types.ts exports all required types | [STRUCTURAL] | `grep -q "export type ToolItem" src/generators/tool-roll/types.ts && grep -q "export type ToolRollSettings" src/generators/tool-roll/types.ts && grep -q "export type ToolRollLayout" src/generators/tool-roll/types.ts \|\| (echo "FAIL: types.ts missing required type exports" && exit 1)` |
| defaults.ts exports defaults | [STRUCTURAL] | `grep -q "defaultToolRollSettings" src/generators/tool-roll/defaults.ts && grep -q "sampleTools" src/generators/tool-roll/defaults.ts \|\| (echo "FAIL: defaults.ts incomplete" && exit 1)` |
| units.ts exports conversion + paper sizes | [STRUCTURAL] | `grep -q "PAPER_SIZES_MM" src/utils/units.ts && grep -q "inchesToMm" src/utils/units.ts && grep -q "getPaperSize" src/utils/units.ts \|\| (echo "FAIL: units.ts incomplete" && exit 1)` |
| Tests pass | [MECHANICAL] | `npm test -- --run` |
| Build clean | [MECHANICAL] | `npm run build` |
