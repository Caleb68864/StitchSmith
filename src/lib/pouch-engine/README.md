# Pouch Engine

A pattern-generation engine for sewn pouches (magazine pouches, tool pouches, general-purpose carriers).  All internal measurements are in **millimetres**.

## Quick start

```ts
import { buildPouch } from './pouch-engine/index.js';

const { pattern, warnings } = buildPouch({
  object:       { width: 64, depth: 25, height: 191 }, // PMAG 30-round dimensions
  fit:          { width_ease: 6, depth_ease: 6, height_ease: 0 },
  construction: 'folded_t',
  seamAllowance: 9.5,
  units:        'mm',
});

console.log(pattern.pieces.length); // → 1 body piece
console.log(warnings);              // → [] (or aspect-ratio warnings)
```

## Module layout

```
pouch-engine/
  index.ts                   ← buildPouch(), PouchSpec, ConstructionMethod, defaults
  object/
    CarriedObject.ts         ← CarriedObject interface
    shapes.ts                ← ObjectShape, ObjectProfile
    index.ts
  fit/
    ease.ts                  ← FitStyle, easeDefaults, resolveEase
    exposure.ts              ← ExposedPercentage, DEFAULT_EXPOSED_PERCENTAGE
    index.ts                 ← FitParams
  geometry/
    calc.ts                  ← 7-step pipeline, pipelineSteps, internalDimensions
    seamAllowance.ts         ← addSA1D, uniformSARecord, foldAwareSARecord
    index.ts
  construction/
    ConstructionStrategy.ts  ← ConstructionStrategy interface, NotImplementedError
    foldedT.ts               ← foldedT strategy + foldedTDefaults (FULL)
    boxedGusset.ts           ← stub — throws NotImplementedError
    centerGusset.ts          ← stub — throws NotImplementedError
    taco.ts                  ← stub — throws NotImplementedError
    index.ts
  components/
    flap.ts                  ← FlapSpec, FlapStyle, validateFlapSpec
    closure.ts               ← ClosureSpec, ClosureStyle, validateClosureSpec
    index.ts
  __tests__/
    boundaries.test.ts       ← engine import-boundary contract
    calc-order.test.ts       ← 7-step pipeline call order
    foldedT.test.ts          ← folded-T geometry + aspect-ratio warnings
    foldedT-stubs.test.ts    ← stub strategies throw NotImplementedError
    ease.test.ts             ← ease defaults and internalDimensions formula
    flap.test.ts             ← flap validation
    closure.test.ts          ← closure validation
```

## Calculation pipeline (Requirement 4)

`runCalcPipeline(spec)` executes these 7 steps in order:

| # | Step | Description |
|---|------|-------------|
| 1 | `parseSpec` | Validate and normalise the raw `PouchSpec`; resolve default ease values |
| 2 | `internalDimensions` | `width = obj.width + ease.width_ease`, `depth = obj.depth + ease.depth_ease`, `height = obj.height * exposed_pct` |
| 3 | `checkAspectRatio` | Emit warnings when `internal_depth > internal_width / 2` for folded-T |
| 4 | `computePanelGeometry` | Derive flat panel dimensions (wings, front, bottom band, back, optional flap) |
| 5 | `applySeamAllowances` | Expand cut dimensions by `seamAllowance × 2` per axis |
| 6 | `buildEdges` | Construct `Edge` objects with semantic `role` values (`fold`, `cut`) |
| 7 | `assemblePieces` | Construct `Piece` objects from edges and attach SA map |

Each step is a method of the exported `pipelineSteps` object, enabling vitest spies.

## Construction methods

| Method | Status | Notes |
|--------|--------|-------|
| `folded_t` | ✅ Implemented | Best for `internal_depth ≤ internal_width / 2` |
| `boxed_gusset` | 🚧 Stub | Throws `NotImplementedError` |
| `center_gusset` | 🚧 Stub | Throws `NotImplementedError` |
| `taco` | 🚧 Stub | Throws `NotImplementedError` |

## Engine boundaries

The pouch engine **must not** import from `src/generators/` or `src/components/`.  The `boundaries.test.ts` contract test enforces this at CI time.

## Seam allowance

Every generator built on this engine must pass a `seamAllowance` (mm, finite, ≥ 0) to `buildPouch`.  The SA is applied to cut edges; fold edges receive 0 SA.
