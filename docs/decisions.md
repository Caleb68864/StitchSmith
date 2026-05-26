
## 2026-05-26 — Edge.id + Piece.seamAllowances added to engine
- Symptom: Tri-Zip `seam_allowance` UI input was collected but never applied to geometry; no way to attach SA per edge.
- Fix: Added `id: string` to all `Edge` variants and `seamAllowances?: Record<EdgeId, number>` to `Piece`. Threaded path-scoped id generators (`makeEdgeIdGen`) through every tri-zip module. Fixed topHandle fold-line role from 'cut' to 'fold'.
- Surfaces: src/lib/pattern-engine/graph/{Edge,Piece,index}.ts, src/generators/tri-zip-backpack/modules/*, engine + tri-zip tests.
- Watch: New generators must use `makeEdgeIdGen` and populate `seamAllowances` to participate in SA rendering.
- Commit: c7ebed2

## 2026-05-26 — Per-edge SA offset + SVG outer cut line
- Symptom: Even with Edge.id in place, there was no way to compute the SA-offset polygon, and the SVG export only drew the body cut line.
- Fix: Added `offsetPolygonPerEdge` and `computeSeamAllowancePolygon` to the engine (samples arcs/beziers at 24 segments). SVG exporter accepts `defaultSeamAllowance` and renders a dashed green outer cut line for every closed path. Tri-Zip preview + SVG export pass `inputs.seam_allowance`.
- Surfaces: src/lib/pattern-engine/geometry/{offset,index}.ts, src/lib/pattern-engine/exports/svg.ts, src/components/tri-zip-backpack/{ExportPanel,PatternPreview}.tsx, related tests.
- Watch: Inward (negative) SA on tight inner curves can self-intersect; helper returns Err Result.
- Commit: bbb7133

## 2026-05-26 — Hem allowance + fold-role edges (laptop sleeve)
- Symptom: Tri-Zip had no concept of hems. Laptop sleeve top opening was cut flush with the body — no hem allowance, no fold line.
- Fix: Added `hem_allowance` to TriZipInputs (default 25 mm, validated). UI exposes the field next to seam_allowance. laptopSleeve module extends the front + back panels' cut height by hem_allowance, emits a `role: 'fold'` open path at y=hem_allowance, and overrides the top edge's SA to 0 so the SA outer line doesn't double-count the hem.
- Surfaces: src/generators/tri-zip-backpack/{types,inputs,modules/laptopSleeve}.ts, src/components/tri-zip-backpack/sections/TriZipGeometrySection.tsx, buildPattern.test.ts.
- Watch: Only the laptop sleeve uses hem currently. If future modules add hem-bearing edges (e.g. open-top pockets), follow the same pattern — extend cut + emit fold + zero the SA on that edge.
- Commit: <pending>
