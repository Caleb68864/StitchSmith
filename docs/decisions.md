
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

## 2026-05-28 — Main bundle 619 KB raw, Vite chunk warning, no route-level splitting
- Symptom: All five generator pages were eagerly imported in App.tsx. Every user loaded ToolRollPage, TriZipPage, RollTopSackPage, MagPouchPage, and BookCoverPage code on first paint regardless of which generator they use. Vite warned "(!) Some chunks are larger than 500 kB after minification."
- Fix: Converted the five eager page imports to React.lazy() + Suspense. Rollup now splits each generator into its own chunk (20–63 KB each). App tests updated to await lazy-mounted elements using waitFor with explicit 5-second timeouts to avoid flakiness in the full suite.
- Surfaces: src/app/App.tsx (lazy imports + Suspense wrapper), src/app/App.test.tsx (async waitFor upgrades).
- Watch: main chunk is now 278 KB raw / 89 KB gzip (was 619 KB / 184 KB). Vite chunk warning gone. PWA precache still picks up all chunks; no cache budget changes needed. If a generator grows past ~100 KB gzip, consider splitting its SettingsPanel separately.
- Commit: perf(P27)

## 2026-05-29 — Zip pouch boxing stitch lines drawn as full-height verticals; baked-in SA convention violated
- Symptom: Factory worker drew boxing corner marks as vertical lines spanning the full panel height, and set `Piece.seamAllowances` to `seam_allowance` (outward offset) on top of already-baked-in SA cut dimensions — double-counting SA. Boxing lines appeared at the top of the panel rather than as short horizontal marks at the bottom corners, and the outer cut line appeared offset outward from the correct cut boundary.
- Fix: Changed boxing fold paths to short horizontal lines at `y = cutHeight - stitchOffset` (bottom corners only), spanning `2×stitchOffset` wide. Zeroed all `seamAllowances` (baked-in SA convention — same as Roll-Top). Added left and right side seam stitch lines which were also missing. Updated 2 test assertions to match correct horizontal-mark geometry.
- Surfaces: src/generators/zip-pouch/buildPattern.ts, src/generators/zip-pouch/__tests__/buildPattern.test.ts.
- Watch: The baked-in SA convention (cut dims include SA, `seamAllowances` = 0) must be consistent across the generator. Any future modification that adds `Piece.seamAllowances` to zip-pouch pieces will double-count SA.
- Commit: fix(zip-pouch)

## 2026-08-16 — vitest swept agent worktrees into the test run
- Symptom: `npm test -- --run` reported 165 test files / 133 failures; the extra 80 files were full repo copies under `.claude/worktrees/**` (harness-created agent worktrees) whose React tests fail when resolved against the outer `node_modules`.
- Fix: `vite.config.ts` `test.exclude` now lists `.claude/**` alongside the vitest defaults (`**/node_modules/**`, `**/dist/**`); `.gitignore` ignores `.claude/worktrees/`.
- Surfaces: vite.config.ts, .gitignore.
- Watch: if vitest's default exclude list changes, keep the two default globs in sync — setting `exclude` replaces the defaults rather than extending them.
- Commit: improve(dx)

## 2026-08-16 — book-cover validation used coercing global isFinite()
- Symptom: `isFinite('200')`, `isFinite(null)` are true, so string/null dimensions from a hand-edited or corrupted project file passed `validateInputs` and reached geometry (string concatenation / NaN coordinates, blank SVG, no error). Every other generator already used `Number.isFinite`.
- Fix: replaced all 5 `isFinite(` calls in `src/generators/book-cover/inputs.ts` with `Number.isFinite(`; added rejection tests for `'200'`, `null`, `''`, and a string `seam_allowance`.
- Surfaces: src/generators/book-cover/inputs.ts, src/generators/book-cover/__tests__/validateInputs.test.ts.
- Watch: any new numeric guard in a generator must use `Number.isFinite`, never the global.
- Commit: improve(book-cover)

## 2026-08-16 — Cut-list CSV did not quote fields
- Symptom: `exportCutListCsv` interpolated material names raw; a name like `Cordura 500D, coated` shifted every following column in Excel/Sheets, silently corrupting the cut list.
- Fix: added an RFC 4180 `csvField()` helper (quote when the value contains `,` `"` CR or LF; double embedded quotes) and mapped every data cell through it.
- Surfaces: src/lib/pattern-engine/exports/cutList.ts, src/lib/pattern-engine/__tests__/exports-cutList.test.ts.
- Watch: header row is a fixed literal and stays unquoted; if headers ever become dynamic, pass them through `csvField` too.
- Commit: improve(cut-list)

## 2026-08-16 — Project-JSON import accepted Infinity and array inputs
- Symptom: `JSON.parse('1e999')` yields `Infinity`, which is `typeof 'number'` and passed `validateAgainstSchema`; generators without their own finiteness guard then produced Infinity-sized geometry (blank pattern, no friendly error). `inputs: []` also slipped past the top-level `typeof === 'object'` gate before the plain-object check.
- Fix: `validateAgainstSchema` rejects non-finite values for `type: 'number'` fields with a field-named message; the envelope gate now also rejects arrays for `inputs`.
- Surfaces: src/lib/pattern-engine/exports/projectJson.ts, src/lib/pattern-engine/__tests__/exports-projectJson.test.ts.
- Watch: migrators run before schema validation for older versions; a migrator that fabricates numeric fields is still covered because validation runs on the migrated result.
- Commit: improve(project-json)

## 2026-08-16 — Tool Roll validation let NaN / non-numeric fields through
- Symptom: `validateTool` / `validateSettings` used only `<= 0`-style comparisons, which are false for NaN and for strings from a hand-edited project file (`importProjectJson` does not type-check tool fields). Such values reached `calculateToolRollLayout` and produced `NaN` in SVG path data with no user-facing error.
- Fix: explicit `Number.isFinite` checks over the numeric tool fields (`width`, `height`, `thickness`, `visibleAmount`) and numeric settings (`seamAllowance`, `minimumPocketWidth`, `pocketHeightIncrement`, `pocketHeightPercentage`, `tileOverlap`) emit `severity: 'error'` warnings before the range checks.
- Surfaces: src/generators/tool-roll/validation.ts, src/generators/tool-roll/validation.test.ts.
- Watch: the UI already filters NaN on blur, so this only changes behavior for imported/corrupt data; new numeric settings should be added to `SETTINGS_NUMERIC_FIELDS`.
- Commit: improve(tool-roll)

## 2026-08-16 — Shared project import accepted envelopes without inputs; file-read errors were silent
- Symptom: `parseProjectJson` (src/export/projectEnvelopeIO.ts, used by 6 generator pages) checked only `generatorId`. A file with the right id but missing/null/array `inputs` was pushed into React state, crashed on `buildPattern(project.inputs)`, and the autosave effect persisted it (though the storage `isValid` guard restores defaults on reload). Separately, both `FileReader` import handlers wired only `onload`, so a read failure did nothing at all.
- Fix: `parseProjectJson` now wraps `JSON.parse` with a friendly error, rejects non-object roots, and requires a plain-object `inputs`; `PatternPageShell` and `AppHeader` add `reader.onerror` → `alert(...)`. New `projectEnvelopeIO.test.ts`.
- Surfaces: src/export/projectEnvelopeIO.ts, src/export/projectEnvelopeIO.test.ts, src/components/shared/PatternPageShell.tsx, src/components/layout/AppHeader.tsx.
- Watch: per-generator schemaVersion is still not checked at import (each hook's `isValid` guard only runs on load). If a page ever needs it, pass the expected version to `parseProjectJson` rather than adding a second parser.
- Commit: improve(import)

## 2026-08-16 — Unescaped project name / notes in exported HTML
- Symptom: `exportPrintableHtml` interpolated `project.projectName` into `<title>` and each construction note into `<li>` raw; the Tri-Zip instructions export did the same for the title. A name containing `</title><script>` (e.g. from a shared project file) produced a script-bearing HTML file, and benign `&`/`<` corrupted output. `tiledHtml.ts` and `renderHtml` already escaped — this was an inconsistency.
- Fix: new `src/utils/escapeHtml.ts`; applied at the three interpolation sites; test asserts the script payload is neutralised and notes are entity-encoded.
- Surfaces: src/utils/escapeHtml.ts, src/export/exportPrintableHtml.ts, src/components/tri-zip-backpack/ExportPanel.tsx, src/export/exportPrintableHtml.test.ts.
- Watch: any new template-literal HTML builder must route user text through `escapeHtml` (or the engine's `renderHtml`).
- Commit: improve(export)

## 2026-08-16 — Book Cover PDF download used a detached anchor
- Symptom: `book-cover/ExportPanel.tsx` created an `<a download>` and called `click()` without appending it to the document, then revoked the object URL on the next statement. Every other download path (`utils/download.ts`, tri-zip/mag-pouch panels, `projectEnvelopeIO`) appends first. Detached-anchor clicks are not reliably honoured by Firefox, so the PDF could silently no-op.
- Fix: extracted `downloadBlob(filename, blob)` in `src/utils/download.ts` (the existing `downloadTextFile` now delegates to it) and used it for the Book Cover PDF.
- Surfaces: src/utils/download.ts, src/components/book-cover/ExportPanel.tsx.
- Watch: new binary export paths should call `downloadBlob` rather than hand-rolling the anchor dance.
- Commit: improve(book-cover)

## 2026-08-16 — PDF export now draws the SA-offset cut line; mag-pouch preview shows SA
- Symptom: CLAUDE.md requires SVG *and* PDF exports to render the seam-allowance cut line distinctly, but `exports/pdf.ts` only drew body edges (solid black, no SA option). Users printing the PDF got the finished-size outline with no cut line. Separately, mag-pouch's on-screen `PatternPreview` omitted `defaultSeamAllowance` while every other generator's preview passed it, so the preview and the SVG export disagreed.
- Fix: `PdfOptions.defaultSeamAllowance` added; PDF draws the SA polygon (thin, dashed, green — same styling as SVG) beneath the body line and positions the piece using the SA-inclusive bbox so the outer line stays inside the page margin. book-cover / mag-pouch / tri-zip / circle-skirt ExportPanels pass the same SA they already pass to SVG. mag-pouch `PatternPreview` now takes `inputs` and passes `seamAllowance * 25.4`.
- Surfaces: src/lib/pattern-engine/exports/pdf.ts, src/components/{book-cover,mag-pouch,tri-zip-backpack}/ExportPanel.tsx, src/components/mag-pouch/{PatternPreview,MagPouchPage}.tsx, tests in src/lib/pattern-engine/__tests__/exports-pdf*.test.ts.
- Watch: roll-top-sack and zip-pouch ExportPanels don't use `exportPatternToPdf` (they use tiled HTML), so nothing to wire there. PDF fold/stitch edges are still solid black (SVG dashes them) — a follow-up if print fidelity matters. mag-pouch stores SA in inches; the `* 25.4` conversion lives in three places now (SVG export, PDF export, preview) — a small helper would consolidate it.
- Commit: feat(pdf-export)

## 2026-08-16 — Cut-list yardage ignored seam allowance; SA bbox helper triplicated
- Symptom: `exportCutList` computed area from the finished-body bbox, so reported yardage was short by the SA band (e.g. 150×100 @10 mm SA: 15000 vs 20400 mm², −26%). Meanwhile `bboxFromPieceWithSa` existed as private copies in `svg.ts` and (after the PDF SA change) `pdf.ts`.
- Fix: moved the helper to `src/lib/pattern-engine/geometry/saBbox.ts`; SVG/PDF exporters import it; `exportCutList` gains an optional `{ defaultSeamAllowance }` and uses the SA-inclusive bbox. Tri-Zip and Mag Pouch ExportPanels pass the same SA they already pass to SVG/PDF. Omitting the option keeps the previous body-only result.
- Surfaces: src/lib/pattern-engine/geometry/saBbox.ts, src/lib/pattern-engine/exports/{svg,pdf,cutList}.ts, src/components/{tri-zip-backpack,mag-pouch}/ExportPanel.tsx, src/lib/pattern-engine/__tests__/exports-cutList.test.ts.
- Watch: generators with baked-in SA (zip-pouch, roll-top) have `seamAllowances = 0`/none and pass SA=0 to exporters, so they're unaffected; keep that convention when wiring new cut lists.
- Commit: improve(cut-list)

## 2026-08-18 — Zip Pouch: doubled SA cut line on baked-in-SA styles; BOM undercounted new pieces
- Symptom: `makeHalfCrossPanel` (cross-bottom), `makeGussetStrip`, and the front-zipper `fullGusset` set `seamAllowances: {}` instead of explicit per-edge zeros. Since cut geometry already bakes in SA and `{}` is truthy, `computeSeamAllowancePolygon`'s `defaultSeamAllowance` fallback re-offset the polygon, doubling the drawn SA cut line on preview/SVG/PDF for cross-bottom, gusset-strip, and multi-panel styles. Separately, `bom.ts`'s gusset-strip/multi-panel branches predated the zipper-end-tab pieces (and the front-zipper split front-top/front-bottom/full-perimeter-gusset layout) added to `buildPattern.ts`, so the BOM undercounted fabric relative to what's actually drawn.
- Fix: added explicit `e0..eN: 0` seamAllowances to all three baked-in-SA pieces, matching the `buildRectPiece`/`buildPanelPiece` convention. Updated `buildBom`'s gusset-strip (both zipper positions) and multi-panel branches to emit rows matching the current piece lists (zipper-end-tabs, front-top/bottom strips, full-perimeter gusset).
- Surfaces: src/generators/zip-pouch/buildPattern.ts, src/generators/zip-pouch/bom.ts, src/generators/zip-pouch/__tests__/buildPattern.test.ts, src/generators/zip-pouch/__tests__/bom.test.ts.
- Watch: any new piece with baked-in SA must declare explicit per-edge zeros (never `{}`) — `computeSeamAllowancePolygon` treats `{}` and `undefined` differently even though both look "empty". Any new construction-style piece added to `buildPattern.ts` needs a matching `bom.ts` branch update in the same change.
- Commit: fix(zip-pouch)

## 2026-08-18 — Zip Pouch: wrong cut formulas in three construction styles; steps ignored style
- Symptom: `/code-review high` on the prior commit surfaced geometry bugs, each verified by re-deriving the panel decomposition. (1) `crossBottomDims` halved a formula that already described a single face — `(width + depth + 2sa)/2` yields `width/2`, so the half-cross panel carried half a face and the assembled pouch came out half the requested height (EDC 240×80, should be 240×140). (2) The front-zipper split summed the two front strips to `width + 2sa`, the *unsplit* panel height, adding no allowance for the two new raw edges the zipper seam creates — the front finished 2·sa shorter than the back and could not join the same gusset. (3) U-gusset notches used `finished_length + sa`, but the strip runs `[sa][width][length][width][sa]`, putting both marks mid-bottom (190/210) instead of at the corners (110/290). (4) Cross-panel corner annotations retraced cut edges e6/e7 and e2/e1 with role `fold`, drawing a blue "crease here" dash directly on the solid cut line. (5) `buildSteps` emitted the boxed 2-panel text for every style and was fed boxed cut dims, so multi-panel exports said "Cut 2 panels at 200 × 130 mm" beside a 5-piece pattern — a CLAUDE.md violation.
- Fix: new `dimensions.ts` is the single source of cut geometry for all four styles; `buildPattern.ts` and `bom.ts` both read from it, so the BOM cannot drift from what is drawn. Corrected the three formulas. Corner annotations now trace the *phantom* corner (the removed square's outer sides) with role `notch`. Gusset bands gained stitch lines and corner notches via a shared `makeGussetBand`. `buildSteps` dispatches per construction style, with `refsPieces` naming real piece ids.
- Surfaces: src/generators/zip-pouch/dimensions.ts (new), buildPattern.ts, bom.ts, __tests__/{constructionStyles,bom,buildPattern}.test.ts.
- Watch: `constructionStyles.test.ts` previously asserted the wrong half-cross height (80), converting the bug into a regression guard — new tests assert the *assembled* result (face height == finished_width, front strips == back panel) rather than raw cut numbers, so a formula error can't be locked in again. Still open: the generator bakes SA into cut dims and declares per-edge zeros, so no SA-offset cut line is drawn for zip-pouch at all — defensible but unmet against CLAUDE.md's "exports MUST render the SA-offset cut line"; decide whether to document the exception or move zip-pouch to finished-dims pieces.
- Commit: fix(zip-pouch)

## 2026-08-18 — Zip Pouch: cross-bottom cutout left stale; BOM/step zipper length drifted
- Symptom: a second review of the prior commit found the cross-bottom fix incomplete. `halfCrossHeight` gained the centre-seam SA but `cornerCutout` stayed at `depth/2`, and the three cross-bottom dimensions are one coupled system: the panel's regions are separated by FOLDS at `y=C`, `x=C`, `x=W-C`, so `C` must absorb the SA on the outer edges. `panelCutWidth = length + depth + 2sa` only balances when `C = depth/2 + sa` (face width `W-2C` = length; one end = two arms of `C-sa` = depth). With `C = depth/2` the EDC pouch delivered a 200 mm face for a 180 mm request and 20 mm of depth instead of 40. Separately, `buildBom` still computed the multi-panel zipper as `frontBackWidth + 4sa` while the new `buildMultiPanelSteps` used `zipperLengthFor` — BOM said 300 mm, step text said 250 mm. Cross-bottom steps also never sewed the side arms (panel A's arm to panel B's arm along `x=0` and `x=W`), so following them left the pouch open at both ends; corner annotations sat in the cut-away squares; multi-panel step 1 was titled "Cut all six panels" over a five-panel list.
- Fix: `cornerCutout = depth/2 + sa`, with the coupling derived in a comment on `crossBottomDims`. New `zipperLengthForStyle(r)` is the one place zipper length is computed; BOM and every step builder call it. Added the missing "Sew the side arms" step (cross-bottom is now 6 steps). Corner annotations became the functional corner-seam stitch lines, inset `sa` away from the notch into the half-bottom band (`x>C`) and the arm (`y>C`).
- Surfaces: src/generators/zip-pouch/dimensions.ts, buildPattern.ts, bom.ts, __tests__/constructionStyles.test.ts.
- Watch: the cross-bottom test now measures all four finished dimensions from the drawn FOLD positions (`W-2C`, `H-C-sa`, `2(C-sa)`, `C-sa`) rather than restating the formulas — asserting `h === 140` passed while `cornerCutout` was wrong. Multi-panel zipper length changed 300→250 mm for the reference inputs; the old `+4·sa` term had no derivation behind it. Still unmet: zip-pouch draws no SA-offset cut line at all (see the prior entry).
- Commit: fix(zip-pouch)

## 2026-08-18 — Zip Pouch: documented the baked-in-SA convention; closed the open SA question
- Symptom: CLAUDE.md said exports "MUST render the SA-offset cut line", but Zip Pouch bakes SA into cut dimensions and declares per-edge zeros, so it draws no such line. Flagged as open across two prior entries. The rule as written also gave no way to tell a deliberate baked-in generator from one that had simply left `seamAllowances` empty — the exact bug fixed in f5c46df.
- Fix: CLAUDE.md now names two conventions. **A — finished-dims pieces** (the default, used by the other six generators): the engine offsets and draws the SA cut line. **B — baked-in SA** (documented exception, used by Zip Pouch): cut dims include SA, every cut edge carries an explicit `0`, and the generator must instead emit `stitch`-role sew lines and quote cut dims in step text. Mixing conventions inside one generator is called out as the failure mode. Writing that contract exposed a gap: the half-cross panel had stitch lines only on the zipper edge and corners, not on the centre-of-bottom seam or the two arm seams its own steps tell you to sew — added as `:seam-stitch`.
- Surfaces: CLAUDE.md, src/generators/zip-pouch/buildPattern.ts, dimensions.ts, __tests__/buildPattern.test.ts.
- Watch: a new test asserts every piece in every style carries at least one `stitch`-role edge, so Convention B's second half cannot rot the way it had. `zipperLengthForStyle` carries a comment recording that multi-panel's old `+4·sa` term was dropped deliberately (300 → 250 mm for reference inputs), so it is not reinstated later as a phantom fix.
- Commit: docs(claude-md) + fix(zip-pouch)
