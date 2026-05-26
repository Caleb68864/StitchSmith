
## 2026-05-26 — Tri-Zip seam-allowance + hem completeness series
- c7ebed2: Edge.id + Piece.seamAllowances
- bbb7133: Per-edge SA offset + SVG outer cut line
- 7815632: hem_allowance + fold-role edges
- b8cc520: Drop direct-zipper phantom piece
- 3f4243e: Derive laptop sleeve from pack inputs
- 49808c0: NaN/Infinity hardening
- dca51b0: Polish 1 — single header, confirm-before-reset, labeled errors

## 2026-05-26 — Polish pass 2: visual quality + delight
- Symptom: Tri-Zip preview rendered an SVG with four distinct line styles (cut black solid, SA green dashed, fold blue dashed, seam red solid) but no legend to explain what they meant. The preview also gave no feedback about piece count, total quantity to cut, or active SA/hem values — the user had to count pieces by eye. Landing copy was generic and didn't explain what the tool actually does.
- Fix:
  - New `TriZipLegend` component lists the four SVG line styles with stroke samples and one-line descriptions of when to use each cut line.
  - PatternPreview now shows a metadata strip above the SVG: piece-type count, total quantity to cut, and a "SA: N mm · Hem: N mm" reminder so the user can verify the values without bouncing back to the sidebar.
  - PatternPreview's empty + error states are now distinct: the "validation errors" state is informational; build-error state is destructive-styled and shows the actual engine error message.
  - LandingPage hero copy upgraded from "Browser-based sewing pattern generators. Choose a project to get started." to a sentence that names the output formats (SVG, PDF, DXF) and the parametric value-prop ("cut line, seam, and hem to scale"). Added a footer hint that projects autosave + Export creates portable files.
  - Pattern cards lift slightly on hover (translate-y + shadow) for cheap delight.
- Surfaces: src/components/tri-zip-backpack/{Legend.tsx (new), PatternPreview.tsx, TriZipPage.tsx}, src/components/landing/LandingPage.tsx.
- Commit: <pending>
