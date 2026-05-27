
## 2026-05-26 — Toggleable piece labels (efd4350)
## 2026-05-26 — Rotate labels on narrow pieces (9a866fb)
## 2026-05-26 — Shared engine legend (147aa36)
## 2026-05-26 — Construction-steps panel on roll-top page (bcc2317)
## 2026-05-26 — Roll-top SA swap + expanded instructions (cc065d9)

## 2026-05-26 — Roll-top SA was double-counted; switched to inward stitch lines
- Symptom: After the e0/e2 swap fix, the SA polygon still looked off. Root cause was double-counting — the cut dimensions already include all four allowances baked in (cutWidth = bottom_length + 2× frenchSeamAllowance, cutHeight = body + collar + top_hem + bottom_seam), and Piece.seamAllowances was ALSO applying the same values as an outward offset. The four asymmetric values (25.4 / 19 / 9.5 / 19) made the doubled SA polygon look "uneven."
- Fix: Set every entry in seamAllowances to 0 so the outline IS the cut line. Added comment block explaining the math. Emit three new stitch-role open paths INSIDE the panel (left, right, bottom) so the user still sees where the stitches fall — engine svg.ts renders 'seam' role as red solid lines.
- Surfaces: src/generators/roll-top-sack/buildPattern.ts.
- Watch: Future patterns choose ONE convention — either bake SA into the cut and emit inward stitch lines (roll-top style), or use body dimensions for the cut and let Piece.seamAllowances draw an outward SA polygon (tri-zip style). Mixing the two double-counts.
- Commit: <pending>
