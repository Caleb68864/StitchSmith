
## 2026-05-26 — Bug fixes from preview screenshot review
- Symptom 1: With SA + hem on, adjacent pieces in the preview overlapped because the layout algorithm bbox'd only the body cut, ignoring the SA polygon that extends outward.
- Symptom 2: Preview was static — no zoom/pan, so users couldn't inspect detail on a tall pack.
- Symptom 3: Switching presets after editing fields kept the edits because the user's overrides masked the preset values — opposite of expected behavior.
- Fix:
  - svg.ts: new `bboxFromPieceWithSa` unions the body bbox with the SA polygon's bbox. Layout uses this so SA outer cut lines never overlap with the next piece.
  - PatternPreview: wheel zoom (cursor-anchored), drag pan, zoom in/out/reset buttons. Scale clamped to 10%–800%.
  - StyleAndDimensionsSection: PRESET_CONTROLLED_FIELDS list; on preset change, if any of those have been customized, confirm with the user that the edits will be lost; on confirm, clear them all to undefined so the new preset's values flow through `resolveInputs`. A subtle hint appears below the preset selector whenever overrides are active.
- Surfaces: src/lib/pattern-engine/exports/svg.ts, src/components/tri-zip-backpack/PatternPreview.tsx, src/components/tri-zip-backpack/sections/StyleAndDimensionsSection.tsx.
- Commit: <pending>
