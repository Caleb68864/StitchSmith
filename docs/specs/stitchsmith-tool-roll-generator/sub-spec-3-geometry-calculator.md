---
sub_spec_id: SS-03
phase: run
depends_on: ['SS-02']
dispatch: factory
---

# Sub-Spec 3 — Geometry calculator and validation

## Scope

Implement the pure-function generator core. All math from design §8–§14, §16, §32, §35, §36. No React imports. Heavily unit-tested with Vitest.

## Files (new)

- `src/generators/tool-roll/geometry.ts`
- `src/generators/tool-roll/geometry.test.ts`
- `src/generators/tool-roll/calculateToolRollLayout.ts`
- `src/generators/tool-roll/calculateToolRollLayout.test.ts`
- `src/generators/tool-roll/validation.ts`
- `src/generators/tool-roll/validation.test.ts`
- `src/generators/tool-roll/constructionNotes.ts`
- `src/generators/tool-roll/renderHelpers.ts`

## Files (modify)

None.

## Interface Contracts

**Provides (consumed by SS-06/07/08/09/10):**
- `calculatePocketWidth(tool, settings): number`
- `calculatePocketDepth(tool): number`
- `sortTools(tools, sortMode): ToolItem[]`
- `calculatePrintLayout(patternWidth, patternHeight, settings): PrintLayout`
- `buildPocketPanelPath(pockets, settings): string`
- `buildBackPanelPath(layoutValues): string`
- `calculateToolRollLayout(tools, settings, units): ToolRollLayout`
- `validateTool(tool): PatternWarning[]`
- `validateSettings(settings): PatternWarning[]`
- `validateLayout(layout): PatternWarning[]`
- `generateConstructionNotes(layout, settings): string[]`

**Requires (from SS-02):** all types, `defaultToolRollSettings`, `PAPER_SIZES_MM`, `getPaperSize`, `generateId`.

## Implementation Steps (TDD)

### Step 1. Pocket math tests + impl

Test first in `geometry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calculatePocketDepth, calculatePocketWidth, sortTools } from './geometry';
import { defaultToolRollSettings, sampleTools } from './defaults';

describe('calculatePocketDepth', () => {
  it('subtracts visible amount from height', () => {
    expect(calculatePocketDepth({ id: 't', name: 't', width: 10, thickness: 0, height: 100, visibleAmount: 30 })).toBe(70);
  });
});

describe('calculatePocketWidth', () => {
  it('applies side gap + thickness ease', () => {
    const s = { ...defaultToolRollSettings, sideGap: 5, thicknessEaseFactor: 0.5, minimumPocketWidth: 0 };
    const t = { id: 't', name: 't', width: 20, thickness: 4, height: 100, visibleAmount: 10 };
    expect(calculatePocketWidth(t, s)).toBe(20 + 5 * 2 + 4 * 0.5);
  });
  it('honors minimum pocket width', () => {
    const s = { ...defaultToolRollSettings, sideGap: 0, thicknessEaseFactor: 0, minimumPocketWidth: 50 };
    const t = { id: 't', name: 't', width: 5, thickness: 0, height: 100, visibleAmount: 10 };
    expect(calculatePocketWidth(t, s)).toBe(50);
  });
});

describe('sortTools', () => {
  const tools = [...sampleTools];
  it('widthAscending', () => {
    const r = sortTools(tools, 'widthAscending').map(t => t.width);
    expect(r).toEqual([...r].sort((a, b) => a - b));
  });
  it('manual preserves order', () => {
    expect(sortTools(tools, 'manual').map(t => t.id)).toEqual(tools.map(t => t.id));
  });
  // Add tests for all 7 modes.
});
```

Implement `geometry.ts` to satisfy: formulas from design §8 (`pocketDepth`, `pocketWidth`), §9 (`sortTools` for all 7 modes), §16.3 (`calculatePrintLayout`), and path-building helpers (§11.2–§11.4 and §13).

### Step 2. Print layout test + impl

```ts
describe('calculatePrintLayout', () => {
  it('Letter portrait math', () => {
    const layout = calculatePrintLayout(600, 350, { ...defaultToolRollSettings, printPaperSize: 'letter', printOrientation: 'portrait', printMargin: 12.7, tileOverlap: 12.7 });
    expect(layout.columns).toBeGreaterThanOrEqual(4);
    expect(layout.rows).toBeGreaterThanOrEqual(2);
    expect(layout.pages.length).toBe(layout.columns * layout.rows);
    expect(layout.pages[0].viewBox).toMatch(/^0 0 /);
  });
});
```

Implement per design §16.3 formula. Each `PrintTile` includes `id`, `row`, `column`, `pageNumber`, `x` (mm), `y` (mm), `width` (paper width mm), `height` (paper height mm), `viewBox` (string), `label` (`Tool Roll — Page N of M — Row R Col C`).

### Step 3. Layout assembly test + impl

`calculateToolRollLayout.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { calculateToolRollLayout } from './calculateToolRollLayout';
import { defaultToolRollSettings, sampleTools } from './defaults';

describe('calculateToolRollLayout', () => {
  it('produces a complete layout from sample tools', () => {
    const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');
    expect(layout.patternWidth).toBeGreaterThan(0);
    expect(layout.patternHeight).toBeGreaterThan(0);
    expect(layout.pockets.length).toBe(sampleTools.length);
    expect(layout.backPanel).toBeDefined();
    expect(layout.pocketPanel).toBeDefined();
    expect(layout.flap).toBeDefined();
    expect(layout.constructionNotes.length).toBeGreaterThan(0);
  });
  it('omits flap when flapEnabled is false', () => {
    const settings = { ...defaultToolRollSettings, flapEnabled: false };
    const layout = calculateToolRollLayout(sampleTools, settings, 'mm');
    expect(layout.flap).toBeUndefined();
  });
});
```

Implement `calculateToolRollLayout.ts` with this orchestration:

1. `validateTool` for each tool, collect warnings.
2. `validateSettings(settings)`, collect warnings.
3. `sortTools(tools, settings.sortMode)`.
4. Compute per-pocket `pocketWidth`, `pocketDepth` (apply `pocketHeightMode`).
5. Compute aggregate `maxPocketDepth`, `maxToolHeight`, `maxVisibleAmount`.
6. Compute `flapHeight` per `flapHeightMode` (§13.3), then `bodyHeight`, `backPanelHeight`.
7. Compute pocket X positions (§11.2), assemble `PocketLayout[]`.
8. Compute pocket Y positions (§11.3).
9. Build `pocketPanel.cutPath` via `buildPocketPanelPath` (stepped, or sloped if supported).
10. Build `backPanel.cutPath`, `backPanel.stitchPath`.
11. Generate `stitchLines`, `foldLines`, `hemLines`, `seamAllowanceLines`, `notches`, `tieMarks`, `labels`, `dimensionLines`.
12. `calculatePrintLayout(patternWidth, patternHeight, settings)`.
13. `validateLayout(layout)`, merge warnings.
14. `generateConstructionNotes(layout, settings)`.

### Step 4. Validation test + impl

```ts
import { validateTool } from './validation';

describe('validateTool', () => {
  it('flags visibleAmount >= height as error', () => {
    const warnings = validateTool({ id: 't', name: 't', width: 10, thickness: 0, height: 100, visibleAmount: 100 });
    expect(warnings.some(w => w.severity === 'error')).toBe(true);
  });
  it('flags width <= 0 as error', () => {
    const warnings = validateTool({ id: 't', name: 't', width: 0, thickness: 0, height: 100, visibleAmount: 10 });
    expect(warnings.some(w => w.severity === 'error')).toBe(true);
  });
});
```

Implement `validation.ts` per design §27.

### Step 5. Construction notes

Implement `constructionNotes.ts` returning an ordered list of strings reflecting the spec §32 example, parameterized by settings (e.g., if `flapEnabled` is false, omit the flap step; if `bindingAllowance > 0`, add a binding step).

### Step 6. Verify

```bash
npm test -- --run
npm run build
```

### Step 7. Commit

```bash
git add src/generators/tool-roll
git commit -m "factory(SS-03): pure geometry + validation + construction notes [factory-managed]"
```

## Verification Commands

| Verifier | Command |
|----------|---------|
| All geometry tests pass | `npm test src/generators/tool-roll -- --run` |
| Type check | `npx tsc --noEmit` |

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| geometry.ts exports signature | [STRUCTURAL] | `grep -q "calculatePocketWidth" src/generators/tool-roll/geometry.ts && grep -q "calculatePocketDepth" src/generators/tool-roll/geometry.ts && grep -q "sortTools" src/generators/tool-roll/geometry.ts && grep -q "calculatePrintLayout" src/generators/tool-roll/geometry.ts \|\| (echo "FAIL: geometry.ts missing exports" && exit 1)` |
| calculator entry exists | [STRUCTURAL] | `grep -q "export function calculateToolRollLayout" src/generators/tool-roll/calculateToolRollLayout.ts \|\| (echo "FAIL: calculateToolRollLayout export missing" && exit 1)` |
| validation exports | [STRUCTURAL] | `grep -q "export function validateTool" src/generators/tool-roll/validation.ts && grep -q "export function validateSettings" src/generators/tool-roll/validation.ts && grep -q "export function validateLayout" src/generators/tool-roll/validation.ts \|\| (echo "FAIL: validation.ts missing exports" && exit 1)` |
| Tests pass | [MECHANICAL] | `npm test -- --run` |
