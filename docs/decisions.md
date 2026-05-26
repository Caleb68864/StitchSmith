
## 2026-05-26 — Edge.id + Piece.seamAllowances
- Symptom: Tri-Zip `seam_allowance` UI input collected but never applied; no way to attach SA per edge.
- Fix: Added `id: string` to all `Edge` variants and `seamAllowances?: Record<EdgeId, number>` to `Piece`. Threaded `makeEdgeIdGen` through every tri-zip module. Fixed topHandle fold-line role.
- Surfaces: engine graph types, all tri-zip modules, tests.
- Watch: New generators must use `makeEdgeIdGen` and populate `seamAllowances`.
- Commit: c7ebed2

## 2026-05-26 — Per-edge SA offset + SVG outer cut line
- Symptom: No engine helper to compute SA-offset polygon; SVG only drew body cut line.
- Fix: `offsetPolygonPerEdge` + `computeSeamAllowancePolygon` (samples arcs/beziers at 24 segments). SVG exporter accepts `defaultSeamAllowance` and draws dashed green outer cut line.
- Surfaces: engine geometry + exports, tri-zip preview + export panel.
- Watch: Inward SA on tight curves can self-intersect; helper returns Err Result.
- Commit: bbb7133

## 2026-05-26 — hem_allowance input + fold-role edges
- Symptom: Tri-Zip had no hem concept; laptop sleeve top opening cut flush, no fold lines anywhere.
- Fix: Added `hem_allowance` to TriZipInputs (default 25 mm, validated). Laptop sleeve extends panel cut height + emits `role: 'fold'` open path at the body-top line + zeros the top edge's SA so SA doesn't double-count the hem.
- Surfaces: tri-zip types/inputs/laptopSleeve, geometry section, buildPattern tests.
- Watch: Add the same pattern to any future module with a free hem edge.
- Commit: 7815632

## 2026-05-26 — Drop direct-zipper phantom piece
- Symptom: `zipper_method: 'direct'` emitted a labeled placeholder piece ("Tri-Zip Direct Zipper") with no cuttable geometry, only the shared seam ref. It cluttered the cut list and SVG with something the user couldn't actually cut.
- Fix: `buildTriZipSubsystem` now returns `pieces: []` and `seamRef: null` in direct mode. SeamRef type widened to `SeamRef | null`. buildPattern skips null seamRefs. `verifySharedSeams` already tolerates seam paths that appear only once, so the FCP-only seam in direct mode is fine.
- Surfaces: modules/triZipSubsystem, buildPattern caller, both subsystem tests + buildPattern test.
- Watch: If a future variant of direct-mode actually needs a piece (e.g. zipper-tape backing), bring back the piece but make it cuttable; do not reintroduce a phantom.
- Commit: <pending>
