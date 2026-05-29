
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

## 2026-05-27 — Pouch engine SS-05 integration polish + end-to-end smoke
- Symptom: SS-05 final wiring — needed mag-pouch v3 LocalStorage migrator, end-to-end smoke covering buildPattern → preview → exporters, README mention, and the WarningsPanel surface on MagPouchPage.
- Fix: added src/lib/pattern-engine/exports/migrators/mag-pouch-v3.ts and registered it in migrators/index.ts. Added src/lib/pouch-engine/__tests__/end-to-end.test.ts (68 tests: full preset matrix, warning surfacing, BOM exhaustiveness, exporter happy paths). Updated MagPouchPage.tsx to surface buildPattern warnings via the existing WarningsPanel pattern (no custom revalidation per M13). Added a mag-pouch line to README.md.
- Surfaces: src/lib/pattern-engine/exports/migrators/mag-pouch-v3.ts, src/lib/pattern-engine/exports/migrators/index.ts, src/lib/pouch-engine/__tests__/end-to-end.test.ts, src/components/mag-pouch/MagPouchPage.tsx, README.md.
- Watch: bundle still under the 350 KB gzipped target (165 KB main, 178 KB lazy pdf chunk). Pouch-engine spec is now end-to-end complete: SS-01..SS-05 all on the canonical branch.
- Commit: <pending>

## 2026-05-28 — Tri-Zip steps never rendered; genericProjectStorage untested
- Symptom: Tri-Zip buildPattern collected assembly steps into allSteps but returned only the Pattern object, so the steps were silently discarded. TriZipPage had no ConstructionSteps component in its sidebar, unlike every other generator. genericProjectStorage had zero tests despite containing toast-firing code paths.
- Fix: Changed buildPattern return type to Pattern & { steps: Step[] } by spreading the pattern and appending allSteps. Wired steps into TriZipPage sidebar via ConstructionSteps. Added genericProjectStorage.test.ts covering jsdom baseline (P28), probe-failure toast, write-failure toast, one-shot deduplication, in-memory fallback, migrate(), and isValid rejection (P26).
- Surfaces: src/generators/tri-zip-backpack/buildPattern.ts, src/components/tri-zip-backpack/TriZipPage.tsx, src/storage/genericProjectStorage.test.ts.
- Watch: buildPattern return type is now Pattern & { steps } — callers that destructure only Pattern fields (ExportPanel, PatternPreview) remain valid via structural typing; tests confirm no regression across 1175 cases.
- Commit: polish(P25-P28)

## 2026-05-28 — No PWA manifest, service worker, or offline capability
- Symptom: StitchSmith had no web app manifest, install prompt, or service worker. Reloading without a network connection showed a browser error page even though all generators work entirely client-side.
- Fix: Added vite-plugin-pwa (v1.3.0) with generateSW mode. Workbox precaches all JS/CSS/HTML/SVG assets. Manifest declares name, theme_color (#18181b), display: standalone, start_url /, and an SVG icon. Plugin auto-injects the manifest link and SW registration script into index.html at build time.
- Surfaces: vite.config.ts, public/icon.svg, package.json (new devDep), dist/sw.js + dist/manifest.webmanifest (generated).
- Watch: precache totals 1060 KB raw (well under any reasonable cache budget). autoUpdate mode silently updates the SW on next navigation — no user prompt needed for a tool like this. If generators grow significantly, revisit runtime caching vs precaching split.
- Commit: feat(P24)
