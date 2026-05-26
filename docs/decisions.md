
## 2026-05-26 — Edge.id + Piece.seamAllowances
- Symptom: Tri-Zip `seam_allowance` UI collected but never applied; no way to attach SA per edge.
- Fix: Added `id: string` to all `Edge` variants + `seamAllowances?: Record<EdgeId, number>` to `Piece`. Threaded `makeEdgeIdGen` through every tri-zip module. Fixed topHandle fold-line role.
- Surfaces: engine graph, all tri-zip modules, tests.
- Watch: New generators must use `makeEdgeIdGen` and populate `seamAllowances`.
- Commit: c7ebed2

## 2026-05-26 — Per-edge SA offset + SVG outer cut line
- Symptom: No engine helper to compute SA-offset polygon; SVG only drew body cut line.
- Fix: `offsetPolygonPerEdge` + `computeSeamAllowancePolygon` (samples arcs/beziers at 24 segments). SVG `defaultSeamAllowance` option draws dashed green outer cut line.
- Surfaces: engine geometry + exports, tri-zip preview + export panel.
- Watch: Inward SA on tight curves can self-intersect; helper returns Err Result.
- Commit: bbb7133

## 2026-05-26 — hem_allowance input + fold-role edges
- Symptom: Tri-Zip had no hem concept; laptop sleeve top opening was cut flush; no fold lines anywhere.
- Fix: Added `hem_allowance` to TriZipInputs (default 25 mm, validated). Laptop sleeve extends cut height + emits fold edge + zeros top edge's SA.
- Surfaces: tri-zip types/inputs/laptopSleeve, geometry section, tests.
- Watch: Add the same pattern to any future module with a free hem edge.
- Commit: 7815632

## 2026-05-26 — Drop direct-zipper phantom piece
- Symptom: `zipper_method: 'direct'` emitted a labeled placeholder piece with no cuttable geometry.
- Fix: Direct mode now returns `pieces: []` + `seamRef: null`. SeamRef type widened. buildPattern guards. verifySharedSeams already tolerates single-occurrence seams.
- Surfaces: modules/triZipSubsystem, buildPattern, subsystem + buildPattern tests.
- Watch: If direct-mode ever needs a piece (zipper-tape backing), make it cuttable; don't reintroduce a phantom.
- Commit: b8cc520

## 2026-05-26 — Derive laptop sleeve dimensions from pack inputs
- Symptom: laptopSleeve module hardcoded SLEEVE_WIDTH=280, SLEEVE_HEIGHT=370, SLEEVE_DEPTH=20. On smaller packs the sleeve was larger than the back panel; on larger packs the sleeve was uselessly small.
- Fix: New `computeSleeveDimensions(packWidth, packHeight)` derives width = max(200, packWidth - 40) and height = max(240, packHeight - 60), with depth fixed at 25 mm (laptop thickness is decoupled from pack depth). Clearance + minimum constants are file-local with explanatory comments.
- Surfaces: modules/laptopSleeve.ts, buildPattern tests (+2).
- Watch: If laptop_sleeve gets a user-controllable padding/spacing input later, route it through computeSleeveDimensions so the clamp/floor logic stays in one place.
- Commit: <pending>
