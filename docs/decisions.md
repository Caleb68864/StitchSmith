
## 2026-05-26 — Toggleable piece labels (efd4350)

## 2026-05-26 — Rotate labels on narrow pieces
- Symptom: Tri-Zip Gusset Strip (zipper-width wide, full-height tall) had its horizontal label spilling past the cut line into the next piece. Same hazard for any tall-thin piece.
- Fix: svg.ts now rotates the piece label -90° when `bbox.height > bbox.width * 2`, so the text runs along the piece (book-spine orientation). Font size formula tightened (narrowDim / 8 instead of /12) so the label fills the piece better when rotated.
- Surfaces: src/lib/pattern-engine/exports/svg.ts.
- Commit: <pending>
