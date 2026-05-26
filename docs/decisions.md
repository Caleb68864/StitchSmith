
## 2026-05-26 — Edge.id + Piece.seamAllowances (c7ebed2)
## 2026-05-26 — Per-edge SA offset + SVG outer cut line (bbb7133)
## 2026-05-26 — hem_allowance + fold-role edges (7815632)
## 2026-05-26 — Drop direct-zipper phantom piece (b8cc520)
## 2026-05-26 — Derive laptop sleeve from pack inputs (3f4243e)
## 2026-05-26 — Engine hardening: NaN/Infinity guards (49808c0)

## 2026-05-26 — Polish pass 1: UX cleanup
- Symptom: Tool Roll page rendered two stacked `<header>` elements (the App-level one + AppHeader). Both Reset buttons were destructive without confirmation. Validation errors used raw field keys ("y_split_height_percent: Must be between 1 and 99") instead of human labels.
- Fix:
  - App.tsx now renders ONE header per view: landing shows the brand, tool-roll shows AppHeader (which now accepts onHome and gates its title as a back-to-home button), tri-zip shows a slim header with brand-as-back-button + subtitle.
  - AppHeader.tsx: Reset now confirms via window.confirm before firing. Title becomes a back-to-home button when onHome is provided.
  - TriZipPage.tsx: Reset confirms. Validation messages drop the field-key prefix and use a `FIELD_LABELS` lookup ("Y-split height: Must be between 1 and 99"). Added seam_allowance / hem_allowance to the client-side deriveErrors so the UI matches the engine's validateInputs.
  - App.test.tsx: `vi.spyOn(window, 'confirm').mockReturnValue(true)` in beforeEach so the existing Reset test keeps passing. Tri-zip navigation test uses getAllByText since the subtitle now appears in two places (header + page title block).
- Surfaces: src/app/App.tsx, src/components/layout/AppHeader.tsx, src/components/tri-zip-backpack/TriZipPage.tsx, src/app/App.test.tsx.
- Watch: deriveErrors duplicates engine validateInputs logic. If a new invariant lands in the engine, mirror it here too (or refactor to share the validator).
- Commit: <pending>
