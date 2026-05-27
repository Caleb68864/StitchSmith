
## 2026-05-26 — Toggleable piece labels (efd4350)
## 2026-05-26 — Rotate labels on narrow pieces (9a866fb)
## 2026-05-26 — Shared engine legend (147aa36)
## 2026-05-26 — Construction-steps panel on roll-top page (bcc2317)
## 2026-05-26 — Roll-top SA swap + expanded instructions (cc065d9)
## 2026-05-26 — Roll-top SA was double-counted; switched to inward stitch lines (bbee9b3)

## 2026-05-26 — Label fold/stitch lines so meaning is self-evident
- Symptom: Both the top-hem fold and the collar fold render as identical blue dashed lines. User couldn't tell which fold to crease during construction (top hem) vs which was just a reference for closing the bag (collar). Same ambiguity for side vs bottom stitch lines.
- Fix: Added optional `Path.label?: string`. SVG exporter draws a small label colored to match the line stroke near the start of the path. Roll-top labels its four annotation paths: top hem "fold above this line under", collar "roll here to close", side/bottom "Side seam"/"Bottom seam". Legend captions rewritten to point readers at the per-line labels.
- Surfaces: src/lib/pattern-engine/graph/Path.ts, src/lib/pattern-engine/exports/svg.ts, src/generators/roll-top-sack/buildPattern.ts, src/components/shared/PatternEngineLegend.tsx.
- Commit: <pending>
