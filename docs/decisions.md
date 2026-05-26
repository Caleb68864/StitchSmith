
## 2026-05-26 — Edge.id + Piece.seamAllowances added to engine
- Symptom: Tri-Zip `seam_allowance` UI input was collected but never applied to geometry; no way to attach SA per edge.
- Fix: Added `id: string` to all `Edge` variants and `seamAllowances?: Record<EdgeId, number>` to `Piece`. Threaded path-scoped id generators (`makeEdgeIdGen`) through every tri-zip module. Fixed topHandle fold-line role from 'cut' to 'fold'.
- Surfaces: src/lib/pattern-engine/graph/{Edge,Piece,index}.ts, src/generators/tri-zip-backpack/modules/*, engine + tri-zip tests.
- Watch: New generators must use `makeEdgeIdGen` and populate `seamAllowances` to participate in SA rendering.
- Commit: c7ebed2

## 2026-05-26 — Per-edge SA offset + SVG outer cut line
- Symptom: Even with Edge.id in place, there was no way to compute the SA-offset polygon, and the SVG export only drew the body cut line — so the user couldn't see what to cut with allowance.
- Fix: Added `offsetPolygonPerEdge` (variable distance per edge) and `computeSeamAllowancePolygon` (Piece + Path → offset polygon, sampling arcs/beziers at 24 segments). SVG exporter now accepts `defaultSeamAllowance` and renders a dashed green outer cut line for every closed path on every piece. Tri-Zip `ExportPanel` and `PatternPreview` pass `inputs.seam_allowance` through.
- Surfaces: src/lib/pattern-engine/geometry/{offset,index}.ts, src/lib/pattern-engine/exports/svg.ts, src/components/tri-zip-backpack/{ExportPanel,PatternPreview}.tsx, geometry-offset.test.ts, exports-svg.test.ts.
- Watch: Inward (negative) SA on tight inner curves can self-intersect; the helper returns an Err Result rather than silently producing bad geometry. UI should surface that error.
- Commit: <pending>
