
## 2026-05-26 — Edge.id + Piece.seamAllowances
- Symptom: Tri-Zip `seam_allowance` UI collected but never applied; no way to attach SA per edge.
- Fix: Added `id` to Edge variants + `seamAllowances` to Piece. Threaded id generators through tri-zip modules.
- Surfaces: engine graph, all tri-zip modules.
- Commit: c7ebed2

## 2026-05-26 — Per-edge SA offset + SVG outer cut line
- Symptom: No engine helper for SA-offset polygon; SVG only drew body cut line.
- Fix: `offsetPolygonPerEdge` + `computeSeamAllowancePolygon` + SVG `defaultSeamAllowance` option.
- Commit: bbb7133

## 2026-05-26 — hem_allowance + fold-role edges
- Symptom: No hem concept; laptop sleeve top cut flush.
- Fix: New `hem_allowance` input + laptop sleeve emits fold edge + zeros top-edge SA.
- Commit: 7815632

## 2026-05-26 — Drop direct-zipper phantom piece
- Symptom: Direct zipper mode emitted a placeholder piece with no cuttable geometry.
- Fix: Direct mode returns `pieces: []` and `seamRef: null`.
- Commit: b8cc520

## 2026-05-26 — Derive laptop sleeve from pack inputs
- Symptom: Sleeve hardcoded 280×370×20 mm regardless of pack size.
- Fix: `computeSleeveDimensions` derives from pack width/height with clearance + minimum floors.
- Commit: 3f4243e

## 2026-05-26 — Engine hardening pass
- Symptom: `offsetPolygon`, `offsetPolygonPerEdge`, and validate input paths didn't guard against NaN/Infinity. A NaN SA from upstream would silently produce NaN coordinates in the SA polygon, which the SVG renderer would emit as "NaN" in the path data — a broken SVG with no error feedback.
- Fix: Added explicit NaN/Infinity rejection in both offset helpers, with a typed error Result naming which value (vertex i, distance i, or d) is non-finite. Also extended tri-zip `validateInputs` to reject NaN/Infinity height/width/depth — previously only zero/negative were caught.
- Surfaces: src/lib/pattern-engine/geometry/offset.ts, src/generators/tri-zip-backpack/inputs.ts, geometry-offset.test.ts (+4 cases), buildPattern.test.ts (+4 cases: NaN dims, Infinity dims, NaN seam_allowance, tiny pack at sleeve floor).
- Watch: Bbox helpers still produce NaN if upstream feeds NaN coords — but with the new guards in the validators those inputs never reach bbox. If a future generator skips validation, harden bboxFromPoints too.
- Commit: <pending>
