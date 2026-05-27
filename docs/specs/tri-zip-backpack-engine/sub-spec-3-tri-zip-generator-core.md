---
type: phase-spec
sub_spec_id: SS-03
phase: run
wave: 2
depends_on: ['SS-01']
dispatch: factory
master_spec: "docs/specs/2026-05-25-tri-zip-backpack-engine.md"
title: "Tri-Zip generator core — modules, style presets, buildPattern"
---

# SS-03 — Tri-Zip generator core

## Context

Pure data layer. Each pattern piece is a module that emits a `Piece` and contributes `Step`s. `buildPattern.ts` orchestrates modules into a `Pattern`. Style presets are parameter bundles using the values in the master spec's "Style preset parameter table". No UI — that's SS-04.

Runs in parallel with SS-02. Only depends on SS-01.

## Scope

- `src/generators/tri-zip-backpack/` with `types.ts`, `inputs.ts`, `stylePresets.ts`, `buildPattern.ts`, `steps.ts`, `index.ts`.
- 13 module files under `modules/`, one per pattern piece.
- 4 test files covering buildPattern, presets, backPanel module, triZipSubsystem module.

## Files

- **Files (new):** see master SS-03 (21 files).

## Interface Contracts

### TriZipInputs
- Direction: SS-03 → SS-04 (consumed by `useTriZipProject`, `TriZipSettingsPanel`)
- Owner: SS-03
- Shape: see master spec; includes `height`, `width`, `depth`, `units`, `stylePresetName`, per-section parameter overrides.
- File: `src/generators/tri-zip-backpack/types.ts`

### StylePreset
- Direction: SS-03 → SS-04
- Owner: SS-03
- Shape: matches the parameter table in master design (strap_width, foam_thickness, curve_style, back_panel_shape, compression_straps, hip_belt, laptop_sleeve attachment, sternum_strap, y_split_height_%, center_panel_width_%).
- File: `src/generators/tri-zip-backpack/stylePresets.ts`

### buildPattern
- Direction: SS-03 → SS-04 (rendered by PatternPreview), SS-04 (driven by useTriZipProject)
- Owner: SS-03
- Shape: `function buildPattern(inputs: TriZipInputs, preset: StylePreset): Result<Pattern, BuildError>`
- File: `src/generators/tri-zip-backpack/buildPattern.ts`

## Implementation Steps (TDD)

### Step 1. Test: stylePresets shape

`__tests__/stylePresets.test.ts`:
- Six named exports: `urban_assault`, `tactical`, `hiking`, `camera`, `medical`, `minimalist`.
- Each matches the parameter table in master.
- Default `zipper_method === 'gusseted'`, default `zipper_gusset_width === 25` (mm), default `frame_sheet === 'none'`.

### Step 2. Implement stylePresets.ts

Copy the parameter table from master spec into typed objects.

### Step 3. Test: types + inputs validation

`__tests__/inputs.test.ts` (write inline in `inputs.ts` test):
- `validateInputs({ height: -1, ... })` → returns per-field error result for `height`.
- `validateInputs({ height: 0, width: 300, depth: 200, units: 'mm', stylePresetName: 'urban_assault' })` → returns error for `height: must be positive`.
- Valid input → returns ok.

### Step 4. Implement types.ts + inputs.ts

`types.ts` defines `TriZipInputs`. `inputs.ts` exports `validateInputs` returning a discriminated `Result<TriZipInputs, ValidationError[]>`.

### Step 5. Test: backPanel module emits the right Piece

`__tests__/modules-backPanel.test.ts`:
- Given `{ height: 510, width: 300, depth: 200 }` and `back_panel_shape: 'rounded'`, the emitted piece has:
  - `id: 'back-panel'`
  - `mirror: false, quantity: 1`
  - paths length = 1 (single closed perimeter path)
  - bbox approximately 300 mm × 510 mm
- For `back_panel_shape: 'square'`, all corners are right angles. For `'rounded'`, four corner arcs. For `'tactical'`, top corners square + bottom corners arc'd (or per preset).

### Step 6. Implement back panel module

`modules/backPanel.ts`. Construct the perimeter path: bottom-left → bottom-right → top-right → top-left → close. Insert corner arcs as `Edge` of kind `arc` for rounded/tactical variants.

### Step 7. Test: triZipSubsystem geometry

`__tests__/modules-triZipSubsystem.test.ts`:
- For `zipper_method: 'gusseted'`, the subsystem emits a zipper-gusset strip piece (length = zipper run perimeter).
- For `zipper_method: 'direct'`, no gusset piece is emitted.
- Y-split occurs at `y_split_height_percent` of front face height. Verify by checking the front-wing piece's interior edge transitions from "down" to "diagonal" at the expected y-coordinate.
- Shared seam IDs: front-center-panel's right zipper edge and the zipper-gusset's left edge share the same `id` string AND their lengths match within float epsilon.

### Step 8. Implement triZipSubsystem module

`modules/triZipSubsystem.ts`. Compute Y-split point. Construct the zipper-gusset strip (if gusseted). Emit pieces. Share edge IDs with frontCenterPanel + frontWing as needed.

### Step 9. Implement the remaining piece modules

Stub each module first (returns empty Piece), then build up. Order:
- `frontCenterPanel.ts`
- `frontWing.ts` (emitted as one Piece with `mirror: true, quantity: 2`)
- `perimeterGusset.ts` (single piece OR multiple if `split_gusset: true`)
- `shoulderStraps.ts` (curve_style straight/ergonomic/s_curve; `quantity: 2`)
- `sternumStrap.ts` (only when `sternum_strap: true`)
- `hipBelt.ts` (none / webbing / padded)
- `topHandle.ts`
- `compressionStraps.ts` (none / side / side_and_bottom)
- `frameSheet.ts` (none / hdpe / foam — sized to fit inside back panel minus 10 mm margin)
- `laptopSleeve.ts` (sleeve geometry; attachment per preset)

For each: a simple unit-test that the module emits at least one Piece (when enabled) and the bbox is non-zero.

### Step 10. Implement buildPattern

`buildPattern.ts`:
1. Validate inputs → on error return `Result.err`.
2. Merge preset defaults with input overrides.
3. Run each enabled module's `build(params)` function.
4. Collect Pieces into a single Pattern.
5. Verify shared-seam edges: walk pieces, collect edges by shared id, assert all instances of the same id have equal length within epsilon. Mismatch → `Result.err({ kind: 'shared-seam-mismatch', edgeId, lengths })`.
6. Return `Result.ok(pattern)`.

### Step 11. Implement steps.ts

Each module exports an optional `contributeSteps(params): Step[]`. `steps.ts` collects them. Engine's `instructions/compile.ts` (from SS-01) handles ordering.

### Step 12. Test: buildPattern integration

`__tests__/buildPattern.test.ts`:
- All six presets with the same dimensions produce non-empty Patterns without throwing.
- Patterns differ across presets in at least one observable (piece count, bbox area, strap_width, back_panel_shape). No two presets produce byte-identical `exports/svg.ts` output (use `exportSvg` from SS-01).
- `zipper_method: 'gusseted'` adds a zipper-gusset piece; `'direct'` does not.
- `compression_straps`: `'none'` → 0 straps, `'side'` → 2, `'side_and_bottom'` → 4.
- `frame_sheet: 'hdpe'` → frame piece present, sized inside back panel.
- Shared-seam length mismatch produces a typed error (inject a deliberately wrong length to verify).
- Front wing is one Piece with `mirror: true, quantity: 2`.

### Step 13. Wire `index.ts` barrel

Export `buildPattern`, `validateInputs`, `STYLE_PRESETS`, types.

### Step 14. Run tests + build

`npm test -- --run src/generators/tri-zip-backpack/`. `npm run build`. Both green.

### Step 15. Commit

```bash
git add src/generators/tri-zip-backpack
git commit -m "feat(tri-zip): generator core — modules, style presets, buildPattern [SS-03]"
```

## Verification Commands

- `npm test -- --run src/generators/tri-zip-backpack/`
- `npm run build`

## Checks

| Criterion | Type | Command |
|---|---|---|
| stylePresets exports six presets | STRUCTURAL | `grep -cE "^export const (urban_assault\|tactical\|hiking\|camera\|medical\|minimalist)" src/generators/tri-zip-backpack/stylePresets.ts \| awk '{ if ($1 < 6) { print "FAIL: <6 presets"; exit 1 } }'` |
| types.ts exports TriZipInputs | STRUCTURAL | `grep -q "TriZipInputs" src/generators/tri-zip-backpack/types.ts \|\| (echo "FAIL: TriZipInputs missing" && exit 1)` |
| buildPattern function exists | STRUCTURAL | `grep -q "export function buildPattern\|export const buildPattern" src/generators/tri-zip-backpack/buildPattern.ts \|\| (echo "FAIL: buildPattern missing" && exit 1)` |
| All module files exist | STRUCTURAL | `for f in backPanel frontCenterPanel frontWing perimeterGusset triZipSubsystem shoulderStraps sternumStrap hipBelt topHandle compressionStraps frameSheet laptopSleeve; do test -f "src/generators/tri-zip-backpack/modules/$f.ts" \|\| (echo "FAIL: module $f missing" && exit 1); done` |
| Tri-zip tests pass | MECHANICAL | `npm test -- --run src/generators/tri-zip-backpack/ 2>&1 \| tail -1; [ ${PIPESTATUS[0]} -eq 0 ] \|\| (echo "FAIL: tri-zip tests" && exit 1)` |

## Acceptance Criteria (from master SS-03)

See master SS-03 — including the **distinctness criterion** added by red-team:

> Given identical dimensions, the six presets produce `Pattern` objects that differ in at least one observable dimension AND no two presets produce byte-identical SVG output via `exports/svg.ts`.

## Escalation Triggers

- A preset's intent cannot be expressed in the parameter space without a bespoke module per preset. Escalate before adding the module — propose adding the module to the engine's public surface explicitly.
- Y-split corner radius / Y intersection radius needs a new parameter not in the design's open-questions list.
