
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

## 2026-05-27 — Pouch engine SS-03 mag-pouch generator core
- Symptom: no headless generator for single-magazine pouches; SS-03 of the pouch-engine spec.
- Fix: added src/generators/mag-pouch/ with types, inputs schema, six predefined magazine presets (ar15_30/20, pmag_gen2/gen3, lancer_l5, m4_stanag), defaults, toPouchSpec, buildPattern, steps, AK-profile detection (warning only — height ≥ 8.5" AND thickness ≥ 1.05"), and per-field validateInputs returning Record<string,string>. 236 unit tests across 4 test files cover magazines, validation, AK detection, and a 96-combination parametric buildPattern matrix.
- Surfaces: src/generators/mag-pouch/{types,inputs,magazines,unsupportedMagazines,defaults,toPouchSpec,buildPattern,steps,index}.ts and src/generators/mag-pouch/__tests__/{buildPattern,magazines,inputs-validation,detectAkProfile}.test.ts.
- Watch: SS-04 wires the UI to buildPattern; SS-04's MagPouchSettingsPanel must populate MagPouchInputs and surface per-field errors from validateInputs. Bundle-size cap of 350 KB gzipped will be measured in SS-04.
- Commit: <pending>

## 2026-05-27 — Pouch engine SS-03 build cleanup (unused imports)
- Symptom: `npm run build` failed after SS-03 with TS6133 noUnused errors on imported-but-unused helpers (DEFAULT_EASE_*, toIn, toMm).
- Fix: removed three unused import/helper blocks in buildPattern.ts, inputs.ts, toPouchSpec.ts. No behavior change. Build now passes; 236 SS-03 tests still pass.
- Surfaces: src/generators/mag-pouch/buildPattern.ts, src/generators/mag-pouch/inputs.ts, src/generators/mag-pouch/toPouchSpec.ts.
- Watch: factory's idempotency-proof gate caught this on the next run; treat as a reminder to always run `npm run build` in worker tests, not just unit tests.
- Commit: <pending>

## 2026-05-27 — Pouch engine SS-04 mag-pouch UI + landing-page wiring + export panel
- Symptom: no Mag Pouch user surface; SS-04 of the pouch-engine spec. Needed accordion settings panel, live SVG preview, six exporters via lazy façade, cut-list table, idempotent pattern registry integration, landing-page card, and an App.tsx route.
- Fix: added src/components/mag-pouch/ with MagPouchPage, MagPouchSettingsPanel (Accordion with MagazineSection/FitSection/RetentionSection/ClosureSection/AttachmentSection/DrainageSection), PatternPreview (reuses shared PatternEngineLegend per M16), ExportPanel (lazy façade via loadPdfExporter/loadDxfExporter/loadTiledHtmlExporter — no direct lazy-target imports), CutListTable. Added src/state/useMagPouchProject.ts (LocalStorage key "stitchsmith.mag-pouch.project"). Modified src/app/patternRegistry.ts with idempotent append guard (early-return when "mag-pouch" already present) and src/app/__tests__/patternRegistry.test.ts asserting length-unchanged + no-duplicates + byte-identical + entry-immutability per the blocker-gate answer. Modified src/app/App.tsx (view-switch) and src/components/landing/LandingPage.tsx (consumes PATTERNS).
- Surfaces: src/components/mag-pouch/{MagPouchPage,MagPouchSettingsPanel,PatternPreview,ExportPanel,CutListTable}.tsx, src/components/mag-pouch/sections/{Magazine,Fit,Retention,Closure,Attachment,Drainage}Section.tsx, src/components/mag-pouch/__tests__/{MagPouchPage,ExportPanel,CutListTable,InstructionsPanel,no-ui-revalidation}, src/state/useMagPouchProject.ts, src/app/patternRegistry.ts, src/app/__tests__/patternRegistry.test.ts, src/components/landing/LandingPage.tsx, src/app/App.tsx.
- Watch: SS-05 integration polish + end-to-end tests + warnings catalog still pending. Main bundle reported 541 KB pre-gzip / 165 KB gzipped — well under the 350 KB gzipped target.
- Commit: <pending>
