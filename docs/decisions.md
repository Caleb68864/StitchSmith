
## 2026-05-26 — Toggleable piece labels (name + cut count + fold/mirror hint)
- Symptom: Tri-Zip preview rendered pieces with no in-piece labels. Tool Roll had its showLabels toggle; tri-zip didn't. Cutters had no on-pattern hint for how many of each piece to cut or whether the piece was a mirrored pair / cut on fold.
- Fix:
  - Engine svg.ts: pieceToSvgGroup now takes the piece's bbox and a `showLabels` flag. When labels are on, draws a two-line `<text>` centered inside the piece: line 1 is `piece.name`, line 2 is `Cut N` plus `on fold` (if `piece.cutOnFold`) or `(mirrored pair)` (if `piece.mirror` and not cutOnFold). Font size scales with the piece's smaller side, clamped to 8-28 mm, so labels stay legible without overwhelming small pieces.
  - SvgOptions adds `showLabels?: boolean` (default true).
  - Piece type gains `cutOnFold?: boolean`. Existing patterns don't set it; the field is reserved for future cut-on-fold pieces.
  - PatternPreview adds a toggle button (tag icon) to the toolbar next to zoom. ExportPanel accepts a `showLabels` prop and threads it into patternToSvg so the SVG download matches the on-screen preview.
- Surfaces: src/lib/pattern-engine/exports/svg.ts, src/lib/pattern-engine/graph/Piece.ts, src/components/tri-zip-backpack/{PatternPreview,ExportPanel,TriZipPage}.tsx.
- Commit: <pending>
