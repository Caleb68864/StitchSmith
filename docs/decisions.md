
## 2026-05-26 — Toggleable piece labels (efd4350)
## 2026-05-26 — Rotate labels on narrow pieces (9a866fb)
## 2026-05-26 — Shared engine legend (147aa36)
## 2026-05-26 — Construction-steps panel on roll-top page (bcc2317)
## 2026-05-26 — Roll-top SA swap + expanded instructions (cc065d9)
## 2026-05-26 — Roll-top SA was double-counted; inward stitch lines (bbee9b3)
## 2026-05-26 — Label fold/stitch lines (c464d18)

## 2026-05-26 — Box-corner marker clarity (color, label, walkthrough)
- Symptom: Vertical ticks at the bottom of the body panel (boxed-corner stitch markers) rendered as black solid lines — visually indistinguishable from cut lines. User read them as something to cut. Construction step was one terse sentence.
- Fix:
  - svg.ts: 'stitch' role now renders red-dashed (was black-solid via the default branch). 'notch' role gets a distinct purple stroke. Comment block above the color logic documents the five role conventions.
  - buildPattern: boxed-corner path gains label "Box corner — see step" and a comment block explaining the semantics for future readers.
  - Construction step expanded from one sentence to a six-step numbered walkthrough covering the pinch-open motion, seam-on-seam alignment check, measure-from-tip arithmetic, trim allowance warning, and the finished base dimensions sanity check.
- Surfaces: src/lib/pattern-engine/exports/svg.ts, src/generators/roll-top-sack/buildPattern.ts.
- Commit: <pending>

## 2026-05-27 — Pouch engine SS-02 attachment + drainage components
- Symptom: pouch-engine had no PALS/MOLLE/belt/ALICE/velcro strap geometry or open-corner/grommet/sewn drainage geometry; SS-02 of the pouch-engine spec.
- Fix: added components/attachment.ts and components/drainage.ts with the source-design formulas (PALS row count via floor((H-12.7)/25.4), 25.4 mm webbing, 38.1 mm bartack pitch; grommet-vs-high-exposure warning at 0.85). Re-exported through components/index.ts and the pouch-engine barrel. 46 unit tests in __tests__/attachment.test.ts and __tests__/drainage.test.ts cover the math + warning copy.
- Surfaces: src/lib/pouch-engine/components/attachment.ts, src/lib/pouch-engine/components/drainage.ts, src/lib/pouch-engine/components/index.ts, src/lib/pouch-engine/index.ts, src/lib/pouch-engine/__tests__/attachment.test.ts, src/lib/pouch-engine/__tests__/drainage.test.ts.
- Watch: SS-03 buildPattern must consume buildAttachment/buildDrainage outputs; SS-01 calc pipeline expects a Piece array but SS-02 drainage uses piecePatches (mutation) — verify the strategy interface matches when SS-03/SS-04 lands.
- Commit: <pending>
