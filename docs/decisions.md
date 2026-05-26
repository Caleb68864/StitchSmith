
## 2026-05-26 — Edge.id + Piece.seamAllowances added to engine
- Symptom: Tri-Zip `seam_allowance` UI input was collected but never applied to geometry; no way to attach SA per edge.
- Fix: Added `id: string` to all `Edge` variants and `seamAllowances?: Record<EdgeId, number>` to `Piece`, per SS-01 spec. Threaded path-scoped id generators (`makeEdgeIdGen`) through every tri-zip module. Fixed topHandle fold-line role from 'cut' to 'fold'.
- Surfaces: src/lib/pattern-engine/graph/{Edge,Piece,index}.ts, src/generators/tri-zip-backpack/modules/*, all engine + tri-zip test fixtures.
- Watch: Future generators must also use `makeEdgeIdGen` and populate `seamAllowances` to participate in SA rendering once step 2 lands.
- Commit: <pending hash>
