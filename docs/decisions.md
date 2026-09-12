
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

## 2026-08-18 — Zip Pouch: inch mode was drawn as millimetres; zipper end tab unfoldable
- Symptom: review flagged the zipper end tab as a hard-coded 15 mm added to unit-relative inputs. Investigating showed the tab was one symptom of a generator-wide bug: `resolveInputs` never normalised units, so inch inputs were drawn as though they were millimetres. Verified with an 7.09 in pouch in multi-panel: pieces came out `front-panel 7.87 × 4.72` beside `zipper-end-tab 2.35 × 15.39` — a >3× outlier that (via `rowHeight = max(bbox.height)` in `patternToSvg`) nearly tripled the exported page height and shrank every real piece in the preview. Every BOM note also labelled inch numbers "mm"; `DEFAULT_SEAM_ALLOWANCE_MM` (10) and `DEFAULT_GROSGRAIN_WIDTH_MM` (15.875) were applied raw as inches when omitted; and `zipperLengthFor`'s `+25` / round-to-50 rounded to the nearest 50 *inches*. Separately the tab, cut at `finished + sa`, was told by its own step text to be folded in half and sewn — leaving `(15 − sa)/2` = 2.5 mm at the default allowance and **negative** at 15.875 mm (5/8", which the generator accepts).
- Fix: `resolveInputs` converts every user-supplied length to mm once, and its contract now states that all `ResolvedInputs` lengths are millimetres with `units` retained only for labelling. That makes the mm constants, the stock-length rounding and every "mm" string true by construction, and leaves the `15` tab constant correct without special-casing. Tab height became `2 · (finished + sa)`, which folds to `finished + sa` and finishes at exactly `finished`. BOM notes route through a `mm()` formatter, since converting inches leaves float dust (4.72 × 25.4 = 119.88799999…).
- Also: the boxing constraint still listed `cross-bottom`, but that guard describes the 'boxed' style's folded corner triangle. The half-cross panel CUTS its corner, and all three regions stay positive for any depth, so a drawable 300 × 40 × 100 mm pouch was being rejected with a message that no longer described the geometry. Restricted the guard to 'boxed'.
- Surfaces: src/generators/zip-pouch/inputs.ts, dimensions.ts, bom.ts, __tests__/{units,constructionStyles}.test.ts.
- Watch: a test now asserts inch and equivalent-mm inputs produce identical BOM and piece lists, and that no piece is >3× out of scale with its siblings — the shape the mm-literal bug took. `ZipPouchSettingsPanel` still hardcodes "SA: {n} mm" in its readout and passes raw display-unit `seam_allowance` as `defaultSeamAllowance` to the exporters; harmless today because baked-in-SA pieces declare per-edge zeros, but wrong if Zip Pouch ever moves to Convention A.
- Commit: fix(zip-pouch)

## 2026-08-18 — Zip Pouch: unit switch wiped preset dimensions; step text carried float dust
- Symptom: driving the running app with Playwright (all four styles, both unit modes) surfaced two faults the 1419-test suite did not. (1) Switching Units to "in" while a size preset was selected blanked all three dimension fields and dropped the form into "Fix these before exporting / finished_length is required". `convertInputsUnits` forces `preset: 'custom'`, but a preset leaves the dimension inputs empty — they resolve from the preset at build time — so converting only the *present* numbers discarded them. (2) With inch inputs now normalised to mm, step text printed raw binary-float dust: "119.88799999999999 mm", "29.971999999999998 mm". The BOM had a local `mm()` formatter; the step builders did not. Labels also read "Seam Allowance (mm)" / "Grosgrain Width (mm)" while showing inch values, and the preview readout said "SA: 0.39 mm".
- Fix: `convertInputsUnits` materialises the preset's dimensions (expressed in the *current* display unit, since `PRESET_DEFAULTS` are mm) before converting. The BOM's local formatter moved to `dimensions.ts` as `fmt` and now wraps every user-visible number in both the BOM and all four step builders. Unit-bearing labels and the preview readout follow `inputs.units`.
- Surfaces: src/components/zip-pouch/ZipPouchSettingsPanel.tsx, PatternPreview.tsx, src/generators/zip-pouch/dimensions.ts, bom.ts, buildPattern.ts.
- Watch: both faults are UI/formatting and sat outside the generator's unit tests — the geometry was already right. Verified in-browser: cross-bottom's rendered SVG path derives exactly 220 × 120 × 30 mm from the drawn folds for the Pencil preset, multi-panel's cut list matches its five drawn pieces, and SVG export produces a valid 4.4 KB document with correct mm page units. Step text still reports millimetres while the user works in inches; that is deliberate (mm is the pattern unit) but worth revisiting if inch users complain.
- Commit: fix(zip-pouch)

## 2026-08-18 — Book Cover: four baked-in-SA pieces drew a doubled seam allowance
- Symptom: the doubled-SA bug class fixed in Zip Pouch (f5c46df) also existed in Book Cover. `velcro-panel`, `retention-strap` and `spare-mag-pocket` each compute `cutWidth = finished + 2 * SA` and label themselves with those cut dims, then declared `seamAllowances: {}`. `computeSeamAllowancePolygon` reads `piece.seamAllowances ?? {}`, so an empty object still counts as present, `svg.ts`'s `piece.seamAllowances || defaultSa > 0` guard passes, and `flattenPath` falls back to `defaultSeamAllowance` for every edge. `PatternPreview` and both export paths pass `defaultSeamAllowance: inputs.seam_allowance ?? 9.5` unconditionally, so the preview and exports drew an SA line 9.5 mm outside a cut line that already included 9.5 mm. `bookmark-ribbon` had the same declaration but is cut from ribbon stock and takes no allowance at all. The same file already declared explicit zeros on six other pieces, so it was mixing both CLAUDE.md conventions — the exact failure mode that document names.
- Fix: added a `zeroSeamAllowances(...outlines)` helper carrying the rationale, and used it for the four pieces plus the two loop-built maps it replaces. Left `card-slot-stack` alone: it adds no SA to its geometry, so whether it wants an engine-drawn offset is a design question, not an evident bug.
- Surfaces: src/generators/book-cover/buildPattern.ts, __tests__/internal-features-geometry.test.ts.
- Watch: the new tests were confirmed to FAIL on the pre-fix code (4 failures, "expected undefined to be +0") before the fix landed, so they are real regression guards rather than tautologies. Baseline before this change: build pass, typecheck pass, 1419/1419 tests. After: build pass, typecheck pass, 1423/1423.
- Commit: improve(correctness)

## 2026-08-18 — Tool Roll: storage guard accepted foreign and malformed projects
- Symptom: CLAUDE.md names each hook's `isValid` guard as the source of truth for the project envelope, and states that schemaVersion 1 is shared by Tool Roll AND Roll-Top Sack as sibling schemas "distinguished by `generatorId`". Tool Roll is the one generator not using the shared `makeProjectStorage({ isValid })` helper, and its `isValidProject` in src/storage/localStorage.ts checked `schemaVersion === 1` and nothing else. Probed both cases directly: a Roll-Top Sack project written under the tool-roll storage key was ACCEPTED and loaded (`generatorId: 'roll-top-sack'`, `tools: undefined`); and a bare `{ schemaVersion: 1 }` was accepted, returning a project whose `settings` were filled from defaults but whose `tools` stayed `undefined` — every consumer calls `project.tools.map(...)`, so that is a crash on load rather than the intended fall-back to the starter project.
- Fix: the guard now also requires `generatorId === 'tool-roll'`, `Array.isArray(tools)`, and a non-null object `settings`, matching what all six sibling hooks check. `serialize()` has always written `generatorId`, `tools` and `settings`, so nothing this module ever persisted is rejected by the added checks — the tightening cannot orphan a real saved project.
- Surfaces: src/storage/localStorage.ts, src/state/useToolRollProject.test.ts.
- Watch: the three new tests were confirmed FAILING on the pre-fix guard (including "expected 'roll-top-sack' to be 'tool-roll'") before the fix landed. Tool Roll still uses the older bespoke storage module rather than `makeProjectStorage`; consolidating them would remove this whole divergence class, but that is a refactor with no current defect attached and was not done here.
- Commit: improve(reliability)

## 2026-08-18 — Circle Skirt built every pattern at 1/25 scale; project guards accepted null inputs
- Symptom (F1, critical): `src/generators/circle-skirt/inputs.ts` documented "All dimension inputs are treated as mm; unit conversion is the UI layer's responsibility" — but no circle-skirt UI file ever did it. `CircleSkirtPage.tsx:30` defines a `toMm` used only for its own validation messages; all three `buildPattern` call sites (CircleSkirtPage:54, PatternPreview:17, ExportPanel:35) passed raw inputs. The shipped default project ships `units: 'in'` with waist 28 / length 24, so out of the box the engine built **51.6 × 51.6 mm panels** — verified by probe — while the mm-based seam (15) and hem (20) allowances stayed full size. Not even uniformly scaled, and every SVG/PDF/DXF carried it.
- Symptom (F2, high): all six remaining `isValid` guards used `typeof v.inputs === 'object'`, and `typeof null === 'object'`. Corrupt or hand-edited localStorage with `"inputs": null` passed, was restored by the hook's useState initializer, then threw on first property access. The project hooks run in `App.tsx:62-63`, above `<ErrorBoundary>` at `:154`, so the boundary cannot catch it and the bad value is re-read every reload — a blank page surviving refresh. `parseProjectJson` already rejected this on the import path, with a comment explaining why; the storage-load path was never back-ported.
- Fix: `resolveInputs` now normalises to mm, converting only the body/garment measurements the settings panel labels `(${units})` — waist_circumference, skirt_length, hip_circumference. Ease, seam/hem allowance, band height, elastic width and fabric width are labelled "(mm)" in the panel regardless of the toggle and pass through untouched. Converting in resolve (not the UI) also covers `validateInputs`, which delegates to it, and removes the three-call-site failure mode that caused this. New shared `isPlainObject` used by all six guards.
- Surfaces: src/generators/circle-skirt/inputs.ts, __tests__/inputs.test.ts, src/utils/isPlainObject.ts, src/state/use{BookCover,CircleSkirt,MagPouch,RollTopSack,TriZip,ZipPouch}Project.ts, src/state/useBookCoverProject.test.ts.
- Watch: `inputs.test.ts` previously asserted "dimensions are passed through unchanged", locking in F1 — replaced with tests asserting conversion, inch/mm equivalence, and that the *shipped default* resolves to a wearable skirt (`cut_outer_r > 500`, was 25.8). The F2 test was confirmed failing on the pre-fix guard. Default now resolves to 746 mm panels; independently checked: r = (28·25.4 + 20)/2π = 116.4, R = 116.4 + 609.6 = 726, +20 hem = 746.
- Still open from this sweep: the Circle Skirt unit toggle reinterprets numbers instead of converting them (CircleSkirtSettingsPanel.tsx:161,169 — same shape in RollTopSack and BookCover panels); async export handlers are try/finally with no catch in three near-identical ExportPanels; mag-pouch and tri-zip `importProject` skip the generatorId guard their five siblings have; debounced autosave never flushes on pagehide.
- Commit: improve(correctness) + improve(reliability)

## 2026-08-28 — Unit toggle reinterpreted numbers; Book Cover accessory dims were mislabelled
- Symptom: the mm/in toggle in the Circle Skirt, Roll-Top Sack and Book Cover settings panels called `onChange({ units })` and nothing else, so a 28 in waist became a 28 mm waist — a 25.4× change to the garment with no visible cue (the field still read "28"). Zip Pouch already had `convertInputsUnits`; the other three were never given the equivalent. Investigating Book Cover exposed a second, pre-existing fault: pocket width/height and pen-holder slot width are labelled `(${units})` in the panel, but `inputs.ts` compares them raw against mm book dimensions and `buildPattern` draws them raw, so in inch mode a "4 in" pocket was a 4 mm pocket.
- Fix: new `convertLengthValues(obj, keys, from, to)` in `src/utils/units.ts` converts only the named keys and rounds to 4 dp so an in→mm→in round trip lands on the typed value. Each panel declares its `DISPLAY_UNIT_FIELDS` (the fields it labels with the unit) and a `handleUnitsChange` that is a no-op when the active unit is re-clicked. Book Cover accessory dims follow the zipper-corner-radius precedent in the same file: stored in mm, converted at the input edge (`fromMm` for display, `toMm` on change), so the hook's mm defaults stay right in both modes and the toggle leaves them alone. Book Cover and Roll-Top number inputs now use `step="any"` so fractional inch values are not flagged invalid.
- Surfaces: src/utils/units.ts, units.test.ts, src/components/circle-skirt/CircleSkirtSettingsPanel.tsx, __tests__/CircleSkirtSettingsPanel.units.test.tsx, src/components/roll-top-sack/RollTopSackSettingsPanel.tsx, __tests__/RollTopSackSettingsPanel.units.test.tsx, src/components/book-cover/BookCoverSettingsPanel.tsx, __tests__/BookCoverSettingsPanel.test.tsx.
- Watch: the converted-field lists are the contract — Circle Skirt converts waist/length/hip only (ease, SA, hem, band, elastic, fabric width are always mm per `resolveInputs`); Roll-Top converts the four body dims (SA is always mm). Adding a new unit-labelled field to a panel means adding it to `DISPLAY_UNIT_FIELDS`. Existing saved Book Cover projects that were edited in inch mode already hold "inch" numbers in mm-typed pocket fields; they will now display 25.4× smaller than what the user typed, which is the true value the generator was always cutting.
- Commit: improve(correctness)

## 2026-08-28 — Export failures were swallowed; tiled print no-op'd under popup blockers; two import guards missing; autosave lost on tab close
- Symptom: (1) The PDF/DXF/tiled handlers in the circle-skirt, mag-pouch, tri-zip and book-cover ExportPanels were `try/finally` with no `catch`. The exporters are lazy `import()`s, so after a redeploy the stale chunk URL 404s, the promise rejects, the button un-greys and nothing downloads — with no message anywhere. (2) Circle Skirt and Mag Pouch's tiled-HTML export did `window.open` and silently returned when the popup was blocked; Tri-Zip already downloaded the file instead. (3) `importProject` in `useMagPouchProject` and `useTriZipProject` accepted any project object; the other five hooks throw on a foreign `generatorId`. (4) Both storage modules debounce writes (250 ms generic, 500 ms tool-roll) and never flushed, so the last edits before a tab close or navigation were lost.
- Fix: new `src/components/shared/runExport.ts` — `runExport(label, setBusy, fn)` wraps the busy flag, catches, logs and toasts `"<label> export failed"` with the error message; every async export handler in the four panels now goes through it. `printOrDownloadHtml(html, filename)` opens-and-prints, or on a blocked popup downloads `<project>-tiled.html` and toasts an info explaining what happened. Mag Pouch and Tri-Zip `importProject` gained the same generatorId guard as their siblings. Both storage modules extracted `writeNow`, added `flush`/`flushProject`, and register a `pagehide` listener (the last hook that fires on iOS Safari, which never fires `unload`).
- Surfaces: src/components/shared/runExport.ts (+ __tests__), src/components/{circle-skirt,mag-pouch,tri-zip-backpack,book-cover}/ExportPanel.tsx (+ __tests__/ExportPanel.failure.test.tsx each), src/state/useMagPouchProject.ts (+ test), src/state/useTriZipProject.ts (+ test), src/storage/genericProjectStorage.ts, src/storage/localStorage.ts (+ tests).
- Watch: the panel tests mock `exports/lazy.js` to reject, which is the real production failure shape (chunk 404), not a synthetic one. `runExport` intentionally logs via `console.error` so the failure is visible in devtools too — expect that line in test output. The three remaining synchronous handlers (SVG, cut list) build in-memory and cannot fail the same way. Tool Roll, Roll-Top and Zip Pouch ExportPanels have no lazy exporters and were not touched.
- Commit: improve(reliability)

## 2026-08-28 — Circle Skirt Instructions button was dead; App smoke tests flaked under load; favicon 404
- Symptom: (1) Circle Skirt's ExportPanel rendered an enabled "Instructions" button with `onClick={() => {}}` and a "(coming soon)" tooltip, although `buildPattern` has returned engine `Step[]` since the generator landed and the page already renders them in `ConstructionSteps`. (2) `App.test.tsx` passed 28/28 in isolation (24 s) but 4 lazy-route smoke tests failed in the full 120 s run: each `waitFor` had a 5 s budget, and the first mount of a lazy chunk under a loaded machine exceeded it. (3) `index.html` linked `/vite.svg`, which is not in `public/` (only `icon.svg`, the PWA manifest icon), so every page load 404'd the favicon; the page also had no description, theme-color or color-scheme meta.
- Fix: `handleInstructions` mirrors Tri-Zip — `renderHtml(buildPattern(inputs).steps)` wrapped in a titled HTML document and downloaded as `<project>-instructions.html`; the button is disabled with the other exports when inputs are invalid. `App.test.tsx` uses a single `LAZY_TIMEOUT` (20 s) for every lazy-route wait and raises its own `testTimeout` above it — a real regression still fails immediately, only a slow success is tolerated. `index.html` points at `/icon.svg` and carries description / theme-color (`#18181b`, matching the manifest) / color-scheme meta.
- Surfaces: src/components/circle-skirt/ExportPanel.tsx, __tests__/ExportPanel.instructions.test.tsx, src/app/App.test.tsx, index.html.
- Watch: the instructions test asserts every step *title* from `buildPattern` appears in the download, so a step added to the generator is automatically covered. The 20 s budget is per `waitFor`, not per file; if the suite grows enough that this trips again, the fix is `pool`/`maxWorkers` tuning in vite.config, not a larger number.
- Commit: improve(polish)

## 2026-08-29 — Exporters wrote NaN geometry; Circle Skirt buildPattern could hang the tab
- Symptom: an adversarial probe (every numeric input × {0, −1, NaN, ∞, 1e9, 1e-4}) across all six engine generators showed two classes of fault. (1) Circle Skirt's `resolveInputs` is total — NaN in, NaN out — and `buildPattern` never consulted `validateInputs`, so a missing waist built panels with NaN coordinates, `sweep_angle_deg = Infinity` threw "Invalid array length" from `Array.from({ length: num_panels })`, and `sweep_angle_deg = 1e9` allocated ~11 million panels and killed the vitest worker (in the browser: a frozen tab). The UI gates on `validateInputs` today, so this needed a hand-edited project file or a future call site to reach — but the generator's own contract allowed it. (2) `patternToSvg`, `exportPatternToPdf` and `exportPatternToDxf` accepted non-finite geometry and emitted it: `width="NaNmm" viewBox="0 0 NaN 100"`, `width="Infinitymm"`. Mag Pouch's `buildPattern` also has no internal validation (its page gates correctly), so the same output was reachable there.
- Fix: new `assertFinitePattern(pattern)` in `src/lib/pattern-engine/graph/validate.ts` walks every edge (start/end, arc centre+radius, bezier control points) and every per-edge seam allowance, throwing an error that names the piece and edge. All three exporters call it first (tiled HTML goes through `patternToSvg`). Circle Skirt `buildPattern` now runs `validateInputs` and throws `Invalid circle-skirt inputs: <messages>` — every existing caller already wraps it in try/catch, and `PatternPreview` surfaces the message as `buildError`.
- Surfaces: src/lib/pattern-engine/graph/validate.ts (new), graph/index.ts, exports/{svg,pdf,dxf}.ts, __tests__/finite-geometry.test.ts, src/generators/circle-skirt/buildPattern.ts, __tests__/buildPattern.test.ts.
- Watch: the probe's other "throws" (roll-top, book-cover, zip-pouch) were harness artefacts — those generators return `Result` objects and handled every bad value, including `seam_allowance = 0`, correctly. `assertFinitePattern` deliberately does not check `Piece.annotations` or label positions; those are cosmetic and a NaN there does not corrupt the cut file. The 1e9-sweep regression test would hang rather than fail if the guard were removed — run that file with `--testTimeout` if it ever goes quiet.
- Commit: improve(hardening)

## 2026-08-29 — Tool Roll settings: no control had an accessible name
- Symptom: driving the running app with Playwright and asking each page for form controls with no label association flagged Tool Roll alone — 48 controls (25 numeric inputs, 8 switches, 10 selects, plus conditional rows). `Row` rendered a `<Label>` with no `htmlFor`, so the visible text sat beside the control without being attached to it: screen readers announced "edit text" / "switch" with no name, and clicking a label did not focus its field. Every other generator's panel uses `<Label htmlFor>` correctly.
- Fix: `Row` now labels its control. It accepts an explicit `htmlFor`; otherwise it takes the single child's `id`, or mints one with `useId()` and clones it onto the child. Radix `Select`'s root does not forward `id`, so the ten selects got an explicit `id` on `SelectTrigger` and a matching `htmlFor` on their row (a `<label for>` on a `<button>` is valid and is what associates the row text with the combobox).
- Surfaces: src/components/tool-roll/ToolRollSettingsPanel.tsx, __tests__/ToolRollSettingsPanel.a11y.test.tsx.
- Watch: the test enables every optional feature, opens every accordion section, and asserts the list of unnamed textbox/spinbutton/switch/combobox controls is empty — adding a new `Row` whose child has no `id` is still fine (auto id), but a new Select must carry `htmlFor` + trigger `id` or the test names it.
- Commit: improve(a11y)

## 2026-08-29 — Circle Skirt allowances entered in mm under an inches toggle; Zip Pouch selects unlabelled
- Symptom: (1) Circle Skirt's panel offered an in/mm toggle but hard-labelled Seam Allowance, Hem Allowance, Band Height and Elastic Width "(mm)", so an inch user entered waist and length in inches and, two fields down, allowances in millimetres. The generator contract (those fields are always mm in `resolveInputs`) was correct; the form was just exposing it. (2) The live-app accessible-name audit that caught Tool Roll also flagged Zip Pouch's Size Preset and Construction Style selects — `<Label>` with no `htmlFor`, trigger with no `id`.
- Fix: Circle Skirt follows the Book Cover precedent: those four fields stay stored in mm, and the panel converts at the input edge (`display` rounds to 4 dp for the field, `store` converts back), with labels reading `(${units})` and a 1/8 in step in inch mode. The unit toggle still leaves them alone, because their stored value never changes. Zip Pouch's two selects gained `id` + `htmlFor`.
- Surfaces: src/components/circle-skirt/CircleSkirtSettingsPanel.tsx, __tests__/CircleSkirtSettingsPanel.units.test.tsx, src/components/zip-pouch/ZipPouchSettingsPanel.tsx, __tests__/ZipPouchSettingsPanel.a11y.test.tsx.
- Watch: the Circle Skirt step text still quotes allowances in mm ("including 15mm seam allowance") while the form shows 0.59 in; the pattern unit is mm by design (same call as Zip Pouch, 2026-08-18). App-wide, every form control now has an accessible name — the audit found zero unnamed controls on the other five pages.
- Commit: improve(polish)

## 2026-09-11 — Mag Pouch rebuilt on the vault research; shoulder straps moved to a strap engine
- Symptom: the Mag Pouch sized its cell from the magazine (2.8"), so a PALS-mounted pouch would not mount in spec spacing; PALS "straps" were N short pieces at a 1" row pitch (the real spec is 1" rows with 1" gaps, vertical mount straps per column); the lid length was the hook length (3") instead of wrapping the exposed magazine; `closure_overlap` was validated but never used; the "exposed percentage" input actually meant coverage; only single AR pouches existed although the vault's best-evidenced build is the multi-cell SOE card (built twice on camera, cut list reconciled). Tri-Zip shoulder straps were one rectangle-with-curves piece: no foam, no mesh, no webbing, no SA convention, and a length that ignored the gusset depth (the exact medpack failure in the vault).
- Fix (mag pouch): new `pleated_card` construction in the pouch engine (hemmed back + folded face pleated into 1–8 cells; hems baked in, explicit 0 SA — Convention B), `resolve.ts` as the single source of every derived dimension, PALS-grid span quantization (3" rifle, .308 → 4.5" or warn), face-per-cell formula (mag_w + 2·mag_t + 5/16"), cradle / pleat / open bottoms, interior loop, Velcro-dot / Kydex / bungee retention, face PALS bars, derived lid length, .308 and AK presets with platform-driven defaults, vault-ordered steps (interior first, bottom before sides), dimensioned BOM with cut tags, derived-numbers panel. PALS component rewritten to spec.
- Fix (straps): `src/lib/strap-engine/` — `buildPaddedStrap` emits outer shell, backer (mesh or Cordura), foam (inset, own material), tail and top-anchor webbing, hardware and steps for five architectures (foam+mesh, SOE tacked ends, SOE quilted through-webbing, crushable sleeve, slick); J/S/straight outlines with tapered ends; bound = explicit 0 SA, turned = SA on every edge. Tri-Zip consumes it; tail length = height − pad + gusset depth + 200 mm adjustment.
- Also: `.claude/settings.local.json` (ClaudeTerminal hooks with Windows paths) untracked and gitignored — it made every tool call log a MODULE_NOT_FOUND on Linux.
- Surfaces: src/lib/pouch-engine/{construction/pleatedCard.ts,components/{attachment,retention,cradle,facePals}.ts}, src/generators/mag-pouch/{resolve,toPouchSpec,buildPattern,bom,steps,inputs,types,magazines,defaults}.ts, src/components/mag-pouch/**, src/lib/strap-engine/**, src/generators/tri-zip-backpack/{types,inputs,modules/shoulderStraps}.ts, src/components/tri-zip-backpack/sections/ShoulderStrapsSection.tsx, CLAUDE.md, docs/plans/2026-09-11-pattern-roadmap.md.
- Watch: Mag Pouch schemaVersion stays 3 — every new input is optional with the old behaviour as default, but a saved folded-T PALS project now renders a 3" cell (was 2.8") and a 6" lid (was 3"); both are corrections, not regressions. Tri-Zip strap piece ids grew from one to five; anything filtering on `shoulder-strap` still finds the outer shell.
- Commit: <pending>

## 2026-09-11 — 3D fold preview (roadmap Stage 1) and the missing folded-T fold
- Symptom: no way to see a pattern folded before cutting; the roadmap's 3D stage was unstarted. Building it exposed that the folded-T body drew only one horizontal fold between the front and the bottom band — with no bottom-to-back fold the body cannot form a U, and the flat pattern was missing a crease line.
- Fix: `src/lib/fold-engine/` (polygon split by full-span fold lines, hinge tree rooted at the label/grain point, Rodrigues rotation per hinge, ear-clip triangulation; 14 tests incl. the folded-T box and the card mouth fold). `src/components/shared/FoldPreview3D.tsx` gates on WebGL and lazy-loads `FoldViewer.tsx` (Three.js + OrbitControls in its own 127 KB gzipped chunk). Mag Pouch page supplies the magazine solid and its base in flat coordinates. Pouch engine: added the bottom-to-back fold and labelled all five folded-T folds.
- Surfaces: src/lib/fold-engine/**, src/components/shared/{FoldPreview3D,FoldViewer}.tsx, src/components/mag-pouch/MagPouchPage.tsx, src/lib/pouch-engine/geometry/calc.ts, package.json (three).
- Watch: rigid hinges cannot show a lid wrapping a thickness (it sweeps over at 150°) or pucker; that is Stage 3. `defaultFoldAngles` is label-driven (hem/mouth 180°, lid 150°, else 90°) — generators should label fold paths.
- Commit: <pending>

## 2026-09-11 — 3D preview Stage 2: cavity measurement, sweep across generators, hinge-tree fix
- Symptom: the first fold preview only showed geometry; the front wings of the folded-T hung off the bottom-band corner squares (plain BFS picked the first neighbour), the card back rooted at its lid (piece label sits in the lid region), unlabelled fold-in-half folds defaulted to 90°, and a rigid lid at 150° sliced through the magazine so a depth measurement would lie.
- Fix: hinge tree expands the largest visited region first; root defaults to the object's base point when an object is given; `measureCavity` ray-casts ±x/±y/±z against folded panels with `regionsUnderFolds`/`withoutRegions` to drop lid-hung panels for across/depth; `defaultFoldAngles` adds label keywords and an unlabelled 50/50 → 180° / sliver → 180° heuristic; `placements` prop assembles the card face over its back; preview wired into Zip Pouch, Roll-Top, Book Cover and Tri-Zip pages; sweep test over every generator's default output.
- Surfaces: src/lib/fold-engine/{model,index}.ts and __tests__/{fold-engine,sweep}.test.ts, src/components/shared/{FoldPreview3D,FoldViewer}.tsx, src/components/{mag-pouch,zip-pouch,roll-top-sack,book-cover,tri-zip-backpack}/*Page.tsx.
- Watch: the folded-T front wings' 3/8" SA overshoots the back plane in the preview (it lies inside the seam once sewn) — expected, asserted in tests. Zip pouch shows two flat panels until seam assembly exists.
- Commit: <pending>

## 2026-09-11 — 3D preview Stage 3: cloth simulation, and three pattern faults it exposed
- Symptom: rigid folding cannot show pucker, wrap or seams. Building a cloth solver against the generators then found: the folded-T lid derivation omitted the descent from the magazine top back to the mouth (lid 2 × exposed short); the folded-T body was a rectangle whose band corner squares cannot fold two ways; the fold engine's polygon split used Sutherland–Hodgman, which bridges concave outlines; a lid over a proud magazine needs two creases that no generator emitted.
- Fix: `src/lib/cloth-engine/` (grid mesher exact for rectilinear outlines, PBD solver with stretch/bend/seam constraints, analytic crease rests on fold segments, torn-corner fallback to flat, seam rest ramp + per-iteration cap, continuous box collision, cavity-safe object lift); `foldedInitial`/`foldedCreaseRest` bridge from Stage 1; viewer "simulate seams" mode with stats and a `__stitchsmithFoldViewer.finish()` debug hook; generators declare seams (Mag Pouch: wing seams, card divisions through both face layers, lid closures). Pouch engine: folded-T is a notched cross with per-row wing folds; lid creases emitted with explicit angles in labels (`(0°)`, `(90°)`), which `defaultFoldAngles` honours; `resolve.ts` lid = 2·exposed + depth + overlap. Fold engine: simple-polygon line split (`splitPolygonMulti`), segment-aware splitting to a fixed point, unused folds pruned, hinge needs ≥ 50 % shared edge, collinear-safe ear clipping, `onAnyFold`, `regionTransforms`.
- Surfaces: src/lib/cloth-engine/**, src/lib/fold-engine/{model,polygon}.ts, src/lib/pouch-engine/{geometry/calc.ts,construction/pleatedCard.ts,construction/ConstructionStrategy.ts}, src/generators/mag-pouch/{resolve,toPouchSpec}.ts, src/components/shared/{FoldPreview3D,FoldViewer}.tsx, src/components/mag-pouch/MagPouchPage.tsx.
- Watch: saved folded-T projects now draw an 8.25" lid and a notched body — both corrections. The cloth pins the host panel's interior only; gathered seams are deliberately left out (documented in the viewer). Headless Chromium renders the sim at a few frames per second; use the finish hook for screenshots.
- Commit: <pending>

## 2026-09-11 — Cloth check swept the other generators: Zip Pouch and Roll-Top cut panels were the finished size; Book Cover ease never reached the geometry
- Symptom: running each pattern through the cloth simulation with a block of its finished size inside, the Zip Pouch (boxed) and Roll-Top panels could not close round the block. Both cut the panel at finished length × (height + depth/2) and then boxed the corners, which takes the full depth back off the width — the finished pouch came out one depth narrower than asked. The Book Cover resolved `width_ease` (default max(¼", spine/2)) and `spine_bulge` (¼" for hardcovers) but never used them, so the fit step's "adjust the ease" advice changed nothing.
- Fix: `zip-pouch/dimensions.ts` `boxedDims` and `roll-top-sack/buildPattern.ts` add the depth to the cut width (and the roll-top adds depth/2 to the height, which it had also dropped); BOM notes and tests follow. `book-cover/buildPattern.ts` gains `coverPanelDims` — the single source of cover width (book_width + ease/2 per cover, spine + bulge) used by the panel, lining, strap, notch annotations and steps; the frozen regression snapshot was regenerated. The roll-top collar line is labelled `(0°)` so the preview stops creasing it. `FoldObject.pin: 'footprint'` pins only the host panel under the contents; the Zip Pouch, Roll-Top and Book Cover pages now supply object, placements and seams so their previews run the same check the tests do (`src/lib/cloth-engine/__tests__/patterns.test.ts`).
- Surfaces: src/generators/zip-pouch/{dimensions.ts,__tests__/*}, src/generators/roll-top-sack/{buildPattern.ts,bom.ts,__tests__/*}, src/generators/book-cover/{buildPattern.ts,__tests__/*,__tests__/snapshots/regression-minimal.json}, src/lib/cloth-engine/{sim.ts,__tests__/patterns.test.ts}, src/components/{zip-pouch/ZipPouchPage,roll-top-sack/RollTopSackPage,book-cover/BookCoverPage,shared/FoldPreview3D,shared/FoldViewer}.tsx.
- Watch: saved Zip Pouch and Roll-Top projects now cut wider (+depth) and taller (roll-top +depth/2) panels and longer zippers — corrections, but a user with fabric already cut will see different numbers. Book Cover panels grow by the ease (12.5 mm on the default 25 mm spine); the default book preset is a hardcover, so its spine section is ¼" wider than the spine. Tri-Zip and Tool Roll are not covered: Tool Roll is not on the pattern engine, and Tri-Zip declares only one `seam:` path (front centre ↔ tri-zip subsystem).
- Commit: <pending>

## 2026-09-11 — Book Cover flaps and Tri-Zip body in the cloth check; Tri-Zip front was 2 × zip-gusset wider than its back
- Symptom: the Book Cover preview showed its inner flaps flat beside the cover, and the Tri-Zip had no 3D assembly at all. Assembling it found that in the gusseted zipper method the wings were still cut at (width − centre) / 2, so the front (wing + strip + centre + strip + wing) came out 350 mm on a 300 mm back and a 1200 mm perimeter gusset — a 50 mm mismatch every builder would have met at the last seam.
- Fix: `frontWingWidth` subtracts the zip gusset width in the gusseted method; wing and strip share `seam:wing-tzi` (checked by `verifySharedSeams`); the perimeter gusset emits its corner turns as `(90°)` fold lines (the step already said "notch at corners"). Placements gained `rx` (rotate about x) and `attach` (ride on a host's folded region), moved into `src/lib/fold-engine/placement.ts` with `makePlacer` so the viewer and `patterns.test.ts` assemble identically; `mirrorPieceX` makes the second instance of a mirrored piece. `tri-zip-backpack/assembly3d.ts` builds the body (mirrored wing and strip instances, gusset rooted on its bottom and turned up, seams round front and back); the Book Cover page attaches both flaps to their covers and seams them at the outer edge between the hems and along both hem lines. `maxStretch` now measures over at least half a cell so boundary slivers from clipped arcs do not read as 260 % stretch.
- Surfaces: src/lib/fold-engine/{placement,instances,model,index}.ts, src/lib/cloth-engine/{initial,sim}.ts, src/lib/cloth-engine/__tests__/patterns.test.ts, src/generators/tri-zip-backpack/{assembly3d.ts,modules/frontWing.ts,modules/triZipSubsystem.ts,modules/perimeterGusset.ts,__tests__/buildPattern.test.ts}, src/components/{shared/FoldPreview3D,shared/FoldViewer,book-cover/BookCoverPage,tri-zip-backpack/TriZipPage}.tsx.
- Watch: saved gusseted Tri-Zip projects now cut narrower wings (72.5 mm instead of 97.5 mm on the default) — a correction. The Tri-Zip check leaves the top open: the gusset covers bottom and sides and no piece closes the top, which is a pattern gap to design (a top panel or a gusset that continues over the top), not something the check can guess. Tri-Zip cloth settles at ≈ 30 % local stretch where the gusset's back edge meets the pinned back panel's bottom row; seams close to 0.06 mm mean. The rounded back panel's corner arcs are seamed as if straight for the top 20 mm of each side.
- Commit: <pending>

## 2026-09-11 — Tri-Zip gains a top panel
- Symptom: the pattern's perimeter gusset ran bottom and sides only and no piece joined the front and back top edges; the 3D check had to leave the pack open, and a builder would have reached the last seam with nothing to close.
- Fix: `modules/topPanel.ts` emits a finished width × depth top panel; each gusset end carries `seam:gusset-end-top` (depth long, matched to the panel's short side and checked by `verifySharedSeams`, one end per half when the gusset is split). Steps: cut and attach the top panel (handle first, then back top edge and both gusset ends), the top handle now attaches to the top panel instead of the back, and the final seam joins the front to gusset and top panel. `assembly3d.ts` lays the panel flat over the block with eight more seams (back top, five front tops, two gusset ends); the block is 4 mm under full height because the pack is now closed at both ends.
- Surfaces: src/generators/tri-zip-backpack/{modules/topPanel.ts,modules/perimeterGusset.ts,steps.ts,buildPattern.ts,assembly3d.ts,__tests__/buildPattern.test.ts}, src/lib/cloth-engine/__tests__/patterns.test.ts.
- Watch: rounded and tactical back panels shape their top corners, so the top panel's back edge and the gusset's top 20 mm are seamed as if the back were square — a few millimetres of ease at each top corner that the pattern does not yet draw. Every Tri-Zip cut list now has one more piece.
- Commit: <pending>

## 2026-09-11 — Padded Strap / H-harness generator (roadmap pattern #1)
- Symptom: the strap engine existed only inside the Tri-Zip; the vault's most-cited suspension (the SOE Slim Padded H) had no page, and the medpack lesson — tail length must take gusset depth — had no standalone home.
- Fix: `src/generators/padded-strap/` on the strap engine with two modes. `pack_pair`: mirrored pads, tail = torso − pad + gusset + 200 (overridable, with an info line showing the arithmetic). `h_harness`: `webbing_through_quilted` pads with 1.5" webbing running the full length and out both ends to four side-release corners (4 buckles + 4 tri-glides, male on the harness), a cross strap = 2 × pad width + spread + 8" slotted adjustment with 1" slots (cut-to-fit down, never add), hydration channels as crossing bars sewn at the ends only (marked UNSEWN as notch paths on the pad and carried as pieces), and 1" PALS rows on the chest end of the routing shoulder with elastic loops. Steps cover cross strap at an outboard-kicking angle, channels, slots, PALS, corners (fold 1.25", never cut the tails, One-Wrap hook out) and a fit check. Page: schemaVersion 7 / generatorId `padded-strap`, settings, SVG preview, 3D preview, exports, cut list, warnings.
- Surfaces: src/generators/padded-strap/**, src/state/usePaddedStrapProject.ts, src/components/padded-strap/**, src/app/{App,patternRegistry}.tsx|ts, src/app/App.test.tsx, CLAUDE.md.
- Watch: every H number the vault marks Open (pad length/width, foam, crossing height, spread, drop legs) defaults with a `[mock-derived]` warning until the user enters it. Defaults are 400 × 63.5 mm pads, 150 mm crossing, 150 mm spread, 300 mm legs, 10 mm foam. The H set is a chest-rig suspension only; the page says so. No object or seams in the 3D preview yet (a torso block is the obvious next step for the pair).
- Commit: <pending>

## 2026-09-11 — 3D testing round two: body forms, self-collision, finished-size measurement
- Symptom: every check used a box, so straps and harnesses could not be fitted to anything; the book cover flaps, the mag pouch face layers and a lid over a face passed through each other; the viewer reported clearance but no finished size, so the vault's measured dimensions had nothing to be compared with.
- Fix: cloth engine gains capsule and rounded-box solids with signed-distance push-out, `torsoForm` (chest block + shoulder capsule + neck, `TORSO_MEDIUM` 360 × 230 × 480, 440 shoulders) and `shoulderPath`; `PiecePlacement.drape` lays a piece along a 3D polyline (flat y → arc length, `along: 'x'` for strips) and `FoldPreview3D.pins` holds vertices; `FoldObject.shape: 'torso'` / `at` place a body. Vertex–triangle self-collision (spatial hash, every second step) is on in the viewer and pattern tests. `clothBounds` measures an envelope, with an `inside` filter; `maxStretch` now counts elongation only and takes the same filter; `maxCompression` is separate. Mesher merges grid lines closer than a quarter cell. The padded strap page drapes its pads over a medium torso, seams the H cross strap across the back and reports whether the torso's pad gap falls inside the slot range. Tests: solids, torso, draped pad, H fit, two-sheet separation, lid-on-face, pleated-card pucker against the vault's mag-thickness wrap, finished envelopes for zip, roll-top and Tri-Zip.
- Surfaces: src/lib/cloth-engine/{sim,body,initial,mesh,index}.ts, src/lib/fold-engine/{placement,index}.ts, src/components/shared/{FoldPreview3D,FoldViewer}.tsx, src/generators/padded-strap/{assembly3d.ts}, src/components/padded-strap/PaddedStrapPage.tsx, src/components/{zip-pouch,roll-top-sack}/*Page.tsx, src/lib/cloth-engine/__tests__/*.
- Watch: unfilled cloth pillows — a boxed pouch's envelope lands between its finished length and its seam-to-seam width and its depth runs a third over; a stitched box-corner tack was tried and dropped (it neither squared the base nor survived the rectilinear grid). A "vacuum" pull toward the contents was tried and dropped for making the metrics noisy. Self-collision costs about 2× on the cloth suite (24 s). The stretch figure in the viewer still includes allowance flaps; the tests measure inside the stitch lines.
- Commit: <pending>

## 2026-09-11 — 3D testing round three: gathered seams, material stiffness, gravity, full coverage
- Symptom: the pleated face bottom was still "not modelled"; foam and webbing relaxed like cloth; nothing hung; the Zip Pouch's three other styles, Tri-Zip split/direct variants and the Circle Skirt had no 3D check.
- Fix: seams sample by the shorter side, so a long edge gathers onto a short one (mag pouch page and test now seam the face bottom per cell, both layers; the magazine rides 1" up on the gathers, which the vault's cradle-vs-pleat ride-height demo predicts). `materialBendStiffness` / `materialPlateStiffness` by material id, with an isometric (Bergou) plate constraint for foam and webbing — a Müller dihedral constraint was tried first and dropped: it has no restoring force near flat. Gravity on in the viewer. Placements gained `rz` and `cone`; `placementMap` unifies drape/cone; pages can pass `solids` and `gravity`. Zip Pouch gets `assembly3d.ts` for boxed, gusset-strip (band gets corner fold lines), multi-panel (bottom flat, ends stood on edge by drape) and cross-bottom (panels turned upside down with a disc of the back face pinned; no fold lines are drawn since they would run along the cutout edges, where crease rests fight the seams — the cloth folds band and arms through the seams, with self-collision off because the arms' allowance flaps must cross). Tri-Zip assembly rewritten on front segments: split gusset halves and direct zips. Circle Skirt: panels cone-wrapped from the waist, radial seams, waist pinned, hung by gravity over a hip capsule; the page gains a 3D preview. Tests cover every case.
- Surfaces: src/lib/cloth-engine/{sim,index}.ts, src/lib/fold-engine/{placement,index}.ts, src/components/shared/{FoldPreview3D,FoldViewer}.tsx, src/generators/zip-pouch/{assembly3d.ts,buildPattern.ts}, src/generators/tri-zip-backpack/assembly3d.ts, src/generators/circle-skirt/assembly3d.ts, src/components/{zip-pouch/ZipPouchPage,circle-skirt/CircleSkirtPage,mag-pouch/MagPouchPage}.tsx, src/lib/cloth-engine/__tests__/*.
- Watch: the gathered row reads ~20–40 % elongation on an 8 mm mesh (the transition zone is one cell); tests measure away from it and the global figure in the viewer includes it. The cross-bottom's corner cutouts close to a few mm, not zero. A stiff plate under gravity behaves as a hinge at its clamp (PBD iteration limit), so the material test asserts straightness, not tip drop. The circle skirt uses stronger gravity (0.08) to hang within the step budget. Gusset-strip with a front zipper is still not assembled.
- Commit: <pending>

## 2026-09-11 — "3D assembly" tab on every pattern page
- Symptom: the 3D viewer sat under the SVG preview at 360 px, started in the rigid fold, and had to be ticked into the cloth simulation each time; the assembled view is what a user wants to see first.
- Fix: `PreviewTabs` (shared) puts a Pattern / 3D assembly tab strip over the preview column; the assembly tab renders `FoldPreview3D` at 560 px with `initialSimulate` so the pattern appears sewn and relaxed (the "simulate" box unticks back to the rigid fold). The chosen tab is remembered in localStorage across pages. Every engine page uses it; the padded strap's torso fit report moves under the 3D view. Tool Roll shows the tab disabled with the reason (not on the pattern engine).
- Surfaces: src/components/shared/{PreviewTabs,FoldPreview3D,FoldViewer}.tsx, src/components/*/…Page.tsx.
- Watch: the tab strip is one component, so a page whose assembly returns null (unsupported style) shows the explanation instead of an empty tab. Simulation starts on tab open, so switching tabs restarts it.
- Commit: <pending>

## 2026-09-11 — Playwright end-to-end suite for the 3D assembly tab
- Symptom: the 3D viewer had only been exercised by hand through a scratch screenshot harness; nothing in CI opened a real browser with WebGL, clicked the tab, ran the cloth to the end and read the numbers back.
- Fix: `@playwright/test` with `playwright.config.ts` (builds, serves the production bundle on 4173, headless Chromium with SwiftShader WebGL) and `e2e/3d-assembly.spec.ts`: for every pattern page and the variants that have their own assembly (both mag pouch constructions, all four zip styles, split-gusset/direct Tri-Zip, strap pair and H-harness, circle skirt) it opens the tab, checks WebGL is up, drives the cloth to 360 steps through the viewer's debug hook, asserts penetration, seam gap and stretch, proves the canvas repaints, unticks simulate for the rigid fold and its fit report, and fails on any page error. Also: the tab choice persists across pages; Tool Roll's tab is disabled with a reason. `npm run test:e2e`; vitest excludes `e2e/`.
- Found on the first run: the boxed zip pouch's back panel had no placement, so the new "hide loose strips in assembled scenes" rule hid the host itself and the canvas was blank. Fixed in both the assembly (back placed at the origin) and the viewer (the object's host is always kept).
- Surfaces: playwright.config.ts, e2e/3d-assembly.spec.ts, package.json, vite.config.ts, .gitignore, src/generators/zip-pouch/assembly3d.ts, src/components/shared/FoldViewer.tsx.
- Watch: the suite takes about three and a half minutes on software WebGL; it is not wired into `npm test`. The pleated card's global stretch figure is bounded at 150 % because it includes the gathered row's shear.
- Commit: <pending>

## 2026-09-11 — Micro Rig platform generator (roadmap pattern #2)
- Symptom: the vault's centre of gravity (74 rig notes) had no generator; the SOE micro rig chassis is the platform every mag card, admin pouch and harness mounts to.
- Fix: `src/generators/micro-rig/` (schemaVersion 8, generatorId `micro-rig`). The panel is a pocket: front and back layers (Convention A, SA on every edge) with the closure hook/loop 2 1/4" down, a 3" × (width − 1") interior loop field, shoulder-buckle anchors on the FRONT layer 4" in (each with a backer), placard loop, pull tabs, #4 grommet, bottom elastic loops at 1 1/2" pitch, side PALS rows at a 2" pitch, and an 11 × 6" dangler hook field on the back. The front carries the pouch engine's pleated card face (its `back` dropped — the panel is the card's back) with cells PALS-snapped from the magazine preset and face = mag_w + 2·mag_t + 5/16", plus the 6 × 6 × 3" utility pocket (front, corner-folded gusset, velcro lid with a dead channel, 3 × 6" loop inside). Width budget (cells + utility + margins) is an error when it exceeds the panel. Split front doubles the panels and adds four join straps at a 3" setback, the anti-flop cell on the FRONT face, and a floating PALS bridge across the 2.25" gap. Suspension: 1.5" webbing straps (X at the back, waist strap) or the H-harness, which points at the Padded Strap page. 3D: the face sewn to the front layer per cell with gathered bottoms and a magazine in cell 1 (lifted 1"), the back layer edge-joined; blank panels have no assembly. Page with tabs, cut list, derived numbers; e2e target added.
- Surfaces: src/generators/micro-rig/**, src/state/useMicroRigProject.ts, src/components/micro-rig/**, src/app/{App,patternRegistry,App.test}.tsx|ts, e2e/3d-assembly.spec.ts, CLAUDE.md.
- Watch: panel height 7" is nominal (PALS variants 6.5") and the side-PALS top drop of 1 1/2" is garbled in the video — both carry mock-derived notes. The strap adjustment lengths (54" shoulder, 48" waist) are working defaults, not vault numbers. Not modelled: the Stacked Micro's individual slots and tear-off med pouch, the shotshell / en-bloc / lever-gun card hosts, and the front-buckle interference with the internal pocket beyond a warning.
- Commit: <pending>

## 2026-09-11 — Padded two-point sling generator (roadmap pattern #3)
- Symptom: the vault documents SOE's padded sling build in detail (turned tube, foam setback, webbing tuck, one-way adapter, tri-glide ends) but gives no lengths; nothing in the app carried the method.
- Fix: `src/generators/sling/` (schemaVersion 9, generatorId `sling`, Convention B). Tube cut = girth + turning ease + 2 × SA wide, pad length + 2 × SA long, with the long seam and both end closures drawn and the tuck/setback marks; foam = pad − 2 × 1/2" setback; webbing engagement = tuck − setback (must be > 0, bartack under 1"); turn method flips to a 550-cord pull under 1.5" flat width; adjustment travel reported as approximate; the video's ambiguous third webbing piece is an input (anchor strap or separate tail); end interface bare tri-glide / QD buckle / sewn; every hardware slot equals the webbing width and the adapter must be a one-way lock. Every length left at its placeholder carries a mock-derived warning and the first step is the cord mock-up. 3D: the finished pad draped over a medium torso's shoulder. Page, registry, smoke and e2e targets.
- Surfaces: src/generators/sling/**, src/state/useSlingProject.ts, src/components/sling/**, src/app/{App,patternRegistry,App.test}.tsx|ts, e2e/3d-assembly.spec.ts, CLAUDE.md.
- Watch: the placeholders (16" pad, 4" girth, 1.5" × 6 mm foam, 30"/24"/4" webbing, 1.25" webbing) are not vault numbers. The pad's 3D check has no webbing or adapter and no rifle.
- Commit: <pending>

## 2026-09-11 — Stacked (two-deep) cells on the micro rig: the .308 Stacked Micro (roadmap pattern #4)
- Symptom: the vault's stacked-cell geometry (`rigs/stacked-mag-cell-geometry.md`) with its .308 worked test case had no home; the Stacked / .308 Micro is the flagship rig and the one that makes eight .308 mags possible on a chest.
- Fix: a `stacked_cells` pocket set on the micro rig. The magazine stands flat side out, so the rear cell = mag depth + ease (min 1/4", no PALS snap — a 3.5" .308 cell is off the grid and the pattern says so), the front cell mark = rear cell + wrap allowance (bounded 1/4"–mag thickness, mock-derived: decided by feel on camera), stack depth = deep × thickness + 1/8" divider, pouch height = coverage × mag length (0.65), exposed = length − pouch − cradle drop. Pieces: self-lined rear pouch folded at the mouth (clean edge up, taped bottom), one front pouch per column cut 1" long for a bottom hem, folded divider, webbing bridge for the back bungee, 2" cradles (hemmed at the face, buried under the back Velcro, grommets set in them), one cord and one pull tab per magazine (split pulls only for AK), 2" cell loop Velcro on both walls, 1" hook dots on the mags, and a 3" med zone with face PALS in place of the utility pocket. Warnings: loaded weight over 15 lb (the eight-to-four precedent), grab height, .308 pouch height drop. Test: `pmag_308_20` (2.9 × 1.1 × 5.75) reproduces the adaptation table. 3D: rear pouch round a flat-side-out magazine, front pouch one stack layer out.
- Surfaces: src/generators/micro-rig/{types,defaults,inputs,buildPattern,assembly3d}.ts, src/components/micro-rig/{MicroRigSettingsPanel,MicroRigPage}.tsx, src/generators/micro-rig/__tests__/buildPattern.test.ts, src/lib/cloth-engine/__tests__/patterns.test.ts, e2e/3d-assembly.spec.ts.
- Watch: the viewer holds one object, so only the rear magazine of column 1 is shown; the front pouch collapses onto the rear one with its wrap allowance slack. The cloth check needed two things the flat model lacks: the panel must be free to bow behind the magazines (only its top strip and margins are pinned — a 3.4" cell round a 2.9 × 1.1" magazine closes only because the panel bows ~10 mm at the divisions, the vault's "fatter than the arithmetic"), and the cell bottoms are seamed a magazine thickness apart because the cradle webbing spans them. The viewer's stretch figure runs high (~110 %) at the sliver where the pinned margin meets the bowing bottom row. The tear-off med pouch itself is not drawn (its zone and PALS are). The three conflicting total-width statements in the .308 video are not reconciled here — the width budget uses the arithmetic that closes (cells + med zone + margins).
- Commit: <pending>

## 2026-09-12 — Tactical organizer generator (roadmap #5)

**Context.** The SOE pen/notebook organizer is the vault's exemplar note for
hem-mark-at-double, interior-first sequencing and partial-coverage Velcro
(`bags/soe-tactical-organizer.md`, `construction-hem-mark-at-double.md`,
`construction-bellows-side-fold-math.md`, `velcro-partial-coverage.md`,
`construction-side-folds-before-top-bottom.md`).

**Decisions.**
- `src/generators/organizer/` (schemaVersion 10, generatorId `organizer`,
  storage `stitchsmith.organizer.project`). Convention B: cut = finished + hems,
  explicit 0 seam allowance on every edge. Body cut = pouch width ×
  2 × (pocket height + body hem) (12 × 5 as filmed); front panel cut = pouch
  width + extra width by pocket height + panel hem (6¼ × 5¼).
- Bellows math as the vault states it: flat centre = panel − 2 × side fold;
  span loss per side = (body − flat centre) / 2; bellows depth = (side fold −
  span loss) / 2 (5/16" on the defaults). The algebra reduces to half the
  excess per side whatever the fold position, so the validator rejects a fold
  smaller than half the excess (flat centre wider than the body — the panel
  bags) rather than a "zero depth" that the fold alone cannot produce; depth
  over 1/2" warns to use a real gusset. Side seam allowance is reported as
  trading one for one against depth.
- Velcro is two horizontal hook strips (the 4¾" as-filmed strips do not fit
  the 4" clear height vertically); block height must fit `pocket_height −
  body_hem`, length defaults to the clear width and the as-filmed 4¾" warns.
  PALS rows replace it as a variation; opposing loop over the hook is a piece.
- Steps follow the 13-step vault order; the front-panel bottom seam is a
  separate step before the sides ("the forgotten step"), dividers are single
  stitched hardest-to-see first, sides close last tight to the edge.
- Variations: production mode (hems ≥ 1/2", panel grows to 5½"), bifold
  (body twice as long, two panels, no 3D), name-tape loop, grommets, PALS back.
- 3D: body hinged 180° at the bottom fold round a 3 × 5 notebook; the panel
  sits over the folded front half without an `attach` (attaching to the front
  half would apply its 180° transform and hang the panel below the fold);
  the root annotations sit at a quarter of the body length, not on the fold
  line, or the hinge tree roots on the wrong half. Seams: panel bottom, both
  sides through all layers, pocket sides, dividers. Bellows show as the wider
  panel standing off between the dividers.

**Commit:** c094822

## 2026-09-12 — Fanny pack generator (roadmap #6)

**Context.** SOE's Tactical Fanny Pack 2.0 set (`bags/fanny-pack-lid-drop-tuning.md`,
`fanny-pack-drawbridge-limiter.md`, `fanny-pack-drainage-grommets.md`,
`construction-edge-tape-vs-fold.md`, `construction-edge-tape-color-matching.md`,
`zipper-slider-locking-vs-not.md`, `process-iterate-on-camera.md`) gives rules
and an iteration history, not a cut list; `edc-fanny-pack.md` adds the
dual-mode (waist / sling) belt requirement.

**Decisions.**
- `src/generators/fanny-pack/` (schemaVersion 11, generatorId `fanny-pack`,
  storage `stitchsmith.fanny-pack.project`). Convention B: cut sizes include the
  seam allowance, explicit 0 on every cut edge, stitch lines drawn inset.
- Body = back panel, front panel (the lid), a zipper panel in two halves that
  runs across the top and down each side by the lid-drop extension, and a
  rising gusset (bottom + lower sides). Equal zipper split (depth/2 per half).
- Lid-drop rule as the vault states it: `lid_drop_target ∈ {closed, partial,
  fully_open}`; extension heuristic = 0 / depth × angle/180 / depth, user
  override `lid_extension`; the rising side loses exactly what the zipper
  panel gains (`rising_side = height − extension`). An extension that eats the
  whole side is rejected; a fully-open override shorter than the depth warns
  that the side seams will pull the lid short (SOE v1.5 at 3"/side), and the
  heuristic itself carries a mock-derived warning because lid stiffness moves it.
- Zipper edge: `fold` adds the measured 1" lip to the zipper halves' cut
  height (drawn as a `(0°)` fold so the preview does not crease it); `tape`
  keeps the cut at finished + allowance and puts 2 × panel length of edge tape
  on the BOM, black by default, with a colour-mismatch note for long visible runs.
- Drawbridge limiter: bartacked 1" webbing loops on the lid and body
  interiors, 1" below the top seam, left and right; cord per side = 2 × chord
  at the target angle with the anchor radius = height − 1".
- Grommets 0/2/4 evenly spaced along the bottom run, centred on the depth,
  ≥ 1/2" clear of the seams (validated against depth), 1.5" 1000D patch under
  each, pre-burn then press, batched while the gusset is flat and before the
  hoop closes; dual use (drain + lash point) noted.
- Belt: 1" or 1.5" webbing through tabs basted into the side seams at
  mid-height; belt cut = longest setting + 6" tail; both settings are inputs
  with mock-derived warnings. Zipper hardware: non-locking slider is fine
  (horizontal, not load-bearing) — stated in the BOM.
- Steps: cut → mark corners (label every mark) → flat work (grommets, cord
  anchors, belt tabs) → zipper into the halves (fold or tape) → close the hoop
  → back panel (opposite sew directions on the two sides) → front panel in
  bites → turn, tie the loops, thread the belt.
- 3D (`assembly3d.ts`): the zipper panel and rising gusset are assembled as one
  hoop band (`fanny-hoop-3d`) with four 90° corner folds, rooted on its bottom
  run (`rx −90`, zip-pouch gusset-strip pattern), the back panel as footprint-
  pinned host and the front panel seamed to the other edge; the zipper is drawn
  on the band where it runs and the top-centre join closes the band. Default
  build: seam residual mean 0.03 mm / max 0.13 mm, stretch 3.6 % (harness),
  2.0 % in the viewer, penetration 0, envelope ≈ finished block. The lid-open
  state is not simulated (the band is continuous); the page says so.

**Commit:** c094822

## 2026-09-12 — Roadmap follow-ups: exporter layout, mag pouch lid/hourglass/MALICE, Tri-Zip BOM, PALS primitive

**Context.** Roadmap "Mag pouch and strap follow-ups" #3, #5, #6, #8, #9 and
the engine list's PALS field primitive, exporter row-wrap and annotations.

**Decisions.**
- `patternToSvg` wraps pieces into rows at `maxRowWidth` (default 1400 mm, a
  cutting-table width; `Infinity` restores the single row) and draws piece
  annotations: grain arrows (double-headed along `angle`), notch ticks and
  wrapped note text under the piece label (`showAnnotations`, default on).
  PDF is one piece per page and needs neither.
- `src/lib/pattern-engine/primitives/palsField.ts`: one PALS field primitive
  (rows × columns, 1" rows at 2" pitch, 1.5" columns, 1/4" margin, sewn /
  fabricated / laser slots, rows cut 1" long) with the off-grid and non-spec
  row-width warnings, for the clamshell, plate carrier and LBV generators.
- Mag pouch one-piece lid (`rigs/subgun-lid-pull-channel.md`): the lid tip
  folds back on itself to form a finger pull channel; `pull_channel_depth`
  defaults to 1.5" on a Velcro lid (the 1" sample was too small gloved) and
  adds to the derived lid length (AR-15 default lid 8.25" → 9.75"); a warning
  when the hook purchase is under 3". Drawn as a `(180°)` fold on the card
  back; the fold-engine and cloth tests carry the new length.
- Hourglass aesthetic (`mag-pouches/mag-pouch-hourglass-aesthetic.md`):
  opt-in, side seams inset 1/4" per side, face cut 1/2" wider, labour warning.
- MALICE clip mount: the same sewn back rows, bought clips instead of mount
  straps, one per column, short to 2 rows / long above; hardware on the BOM.
- Tri-Zip hardware BOM (`src/generators/tri-zip-backpack/bom.ts`): zipper
  tape length from the Y runs, three locking sliders (vertical, loaded —
  `bags/zipper-slider-locking-vs-not.md`), strap-engine hardware, sternum
  (production 18"/24" webbing), hip belt and compression hardware; the cut
  list's hardware table now shows it. Load-path tack rule added to the
  strap-anchor step (`packs/toolpod-shoulder-strap-provision.md`).
- Not done, with reasons: pistol presets and the Kydex wedge sizes are Open
  in the vault (no measured magazines); the folded-T mouth hem to the outside
  needs a hemmed single-layer face the folded-T does not have (its mouth is
  seam-allowanced) — carried as a note on the subgun rig follow-up.

**Commit:** 9100d20

## 2026-09-12 — Clamshell pack generator (roadmap #7)

**Context.** SOE's fat clamshell medpack (11 × 16 × 6, three videos) and the
tool pod pack share one construction: a zipper frame hoop round the top and
both sides, dipping under the bottom corners so the face flays open, a bottom
strip that closes the hoop last, panels sewn on last (`packs/medpack-overview.md`,
`medpack-body-panels.md`, `medpack-zipper-lip-math.md`,
`medpack-technique-alligator-mouth.md`, `toolpod-zipper-frame-construction.md`,
`toolpod-pack-build.md`, `medpack-handle-construction.md`,
`medpack-compression-straps.md`, `medpack-technique-pals-spacing.md`,
`medpack-technique-fabricated-pals.md`, `medpack-pouch-system.md`,
`toolpod-shoulder-strap-provision.md`, `medpack-shoulder-harness.md`,
`toolpod-design-postmortem.md`, `reference/technique-stitch-shrinkage.md`).

**Decisions.**
- `src/generators/clamshell-pack/` (schemaVersion 12, generatorId
  `clamshell-pack`, storage `stitchsmith.clamshell-pack.project`). Convention A:
  panels and strips at finished size with per-edge `seamAllowances`; the
  zipper lip and the bottom's fold-ins are fold regions on the piece (0
  allowance on a folded edge). Pieces: face, back, base gusset, lid strip,
  bottom strip, plus handle webbing and core, compression straps, six 3"
  strap tabs, stow pocket, interior loop strips and the PALS rows.
- **The frame is two strips split by the zipper.** The measured 2 1/2" lip
  piece (1 1/2" visible) is read as the lid-side strip: `lid_depth` 1 1/2"
  (Inferred → mock-derived warning), base gusset = depth − lid depth = 4 1/2".
  That reproduces the note's own budget: base cut = 4 1/2" + 1" lip fold-over
  + 1/2" allowance = **6" ("6-in piece")**, PALS 3 × 1 1/2" = 4 1/2" fills
  the base exactly with zero zipper clearance (SOE sews to the tape; an info
  warning carries the warranty caveat, and a clearance blows the budget with
  the "make it back in the fold" warning). Tool pod: `equal_split` gives
  3"/3". The frame's lip fold is drawn at the zipper edge of each strip so the
  two zipper edges face each other in the assembly.
- Hoop: finished 2 × height + width + 2 × underwrap = **46 1/2"** on the
  medpack; cut = + 1/2" overcut = 47", marked "trim at the bottom join". The
  on-camera 46" came up 1/2–3/4" short twice, which the hoop-shrink warning
  says. `zipper_underwrap` 1 3/4" is inferred from the 8 1/2" bottom on the
  11" bag (mock-derived) and is the opening-angle parameter.
- Bottom (alligator mouth): depth + 2 × fold-in = **7"** wide, nominal
  width − 2 × underwrap + 2 × fold-in = **8 1/2"** long, labelled and BOM'd
  "cut after the hoop from the measured gap + 1"".
- PALS through `buildPalsField`: side runs 7 rows × 3 columns on the 14 1/2"
  work area (height − 1" edge offset − 1/2" seam zone), rows lying across the
  strip (horizontal on the pack) and starting clear of the underwrap; face 5
  rows × 6 columns; bottom 3 rows. Row webbing is one BOM piece cut 1" long.
  Sewn / fabricated / laser styles.
- Handle cut = footprint + 2" bow + 2 × 2" fold-under = 17" over an 11" 1"
  core. Compression straps = depth + 6" (mock-derived; 12" on the 6" bag).
  `depth ≠ 3"` raises the warning that every standard-cut-list wrap length is
  short by the difference. Interior loop: 2" strips with a 1/2" gap, five per
  wall on 16", cut +2". Strap provision: six 3" tabs 4" apart at the top,
  lower anchors 1" up and kicked; `none` gets the tool-pod post-mortem note.
- Steps follow the vault order: zipper frame flat first (outside edge, ride
  the chain, lip lines), Velcro on the inside walls before anything, PALS and
  handle on flat pieces, tabs from a shared datum, close the hoop with the
  alligator mouth (measure the gap, then cut the bottom), back panel then face
  in opposite directions and in bites.
- 3D: the strips are simulated as their finished bands (no lip, fold-ins or
  overcut — a hem that turns four corners tore the mesh at 150 % stretch) with
  explicit `(-90°)` corner and underwrap folds; gusset rooted on its top run
  with `rx −90`, lid strip stacked at `dz = base depth`, bottom under the
  block, face at depth + 2. Test: seam residual mean 0.19 mm / max 2.8 mm,
  stretch 19 %, penetration 0, gusset spans z 0–4 1/2", lid 4 1/2"–6", bottom
  7 1/2" × 6".

**Commit:** c094822

## 2026-09-12 — Plate carrier generator (roadmap #8)

**Context.** The vault's 26 plate-carrier notes are reference material (plate
sizes, cut geometry, panel sandwich, loop field, cummerbund styles, binding,
bartacks, materials), not a reconciled build. Plate sizes and the PALS spec are
firm; everything else is a starting point.

**Decisions.**
- `src/generators/plate-carrier/` (schemaVersion 13, generatorId
  `plate-carrier`, storage `stitchsmith.plate-carrier.project`). Convention A:
  panels drawn finished; bound edges carry explicit 0 (binding adds nothing,
  `construction-binding-edge.md`), turned edges carry the seam allowance.
- Plate presets 8 × 10 / 10 × 12 / 11 × 14 / custom (`plate-sizes-standard.md`,
  10 × 12 default). Pocket = plate + ease per side (0.375", vault 0.25–0.5",
  under 0.25" rejected); shell = pocket + 0.5" oversize per side
  (`panel-front-back-construction.md`). Cut outlines from
  `plate-cut-{sapi,shooter,swimmer}.md`: SAPI clips 2" at 45°, shooter 2.75" at
  50°, swimmer tapers the side from 3" down at 25° from vertical; bottom corners
  square. One `plateOutline()` feeds plate, pocket and shell.
- Front field: loop (6 × 6 default, box-stitched, ≥ 2" engagement warning),
  sewn PALS, laser PALS, or loop over PALS; back field likewise or slick. Every
  PALS field goes through `buildPalsField` (new primitive
  `src/lib/pattern-engine/primitives/palsField.ts`); laser fields on 500D/1000D
  warn that they need laminate.
- Shoulder straps: padded through the strap engine (`foam_sandwich_mesh`,
  strap width 2", pad 8", tri-glide) or slick webbing; span panel top to panel
  top is an input (16" default, mock-derived) with Velcro adjustment (3").
- Cummerbund: elastic band (4") cut at half the free girth (torso circumference
  − both panel widths) + 2" of hook at each end; skeletal = laser-cut laminate
  front section + 6" elastic rear (rear length Open, warned); side plate
  pockets 6 × 6 / 6 × 8 on the inner face, warned when taller than the band;
  QR buckle choice maps to hardware only (mount geometry is buckle-specific).
- Reinforcement map on the shells: box-X where the straps land, bartacks at the
  cummerbund sleeves (`construction-bartack-reinforcement.md`). Steps: fields
  onto flat shells first, pocket hems, sleeves, stack, bind (or turn), cummerbund,
  straps last with box-X in opposite directions, then the fit check
  (`plate-size-fit-mapping.md`: plate top two finger widths below the sternal
  notch; torso length and plate size are independent inputs).
- 3D (`assembly3d.ts`): shells hung on the medium torso at the ride height,
  display straps draped over the shoulders at the box-X positions and seamed to
  both panel tops, display cummerbunds draped round the chest block's rounded
  sides (along the corner arcs — a chord cuts the solid) and seamed into the
  sleeves; ends pinned where the drape puts them so a span outside the strap's
  range or a laminate cummerbund of the wrong length shows as a seam gap; an
  elastic band is shown stretched up to a quarter of its cut length. The report
  states the required over-shoulder span and side span for this torso and
  whether the plate bottom clears the waist line.

**Commit:** c094822

## 2026-09-12 — Modular LBV generator (roadmap #9)

**Context.** SOE's modular load-bearing vest: the 25-year-old LBV panel set
(two mirrored zippered front panels, a bellowed back panel, every panel a
foam pocket) carrying Velcro-faced 1.5" PALS rows instead of sewn pouches,
a padded shoulder set with an angled cross piece and drag handle, 24"
verticals through tension locks, three front straps and snap belt loops
(`rigs/lbvmod-overview.md`, `lbvmod-panel-chassis.md`,
`lbvmod-harness-geometry.md`, `lbvmod-adjustment-sizing.md`,
`lbvmod-belt-loops.md`, `lbvmod-drag-handle.md`,
`lbvmod-modular-interface.md`, `lbvmod-technique-pals-direction.md`,
`lbvmod-308-mags.md`; the woodland `lbv-*.md` set for the buckle
positions and build order).

**Decisions.**
- `src/generators/lbv/` (schemaVersion 14, generatorId `lbv`, storage
  `stitchsmith.lbv.project`). Convention A: panels at finished size, every
  edge-taped edge carries an explicit 0 and only the zipper edge of each
  pocket layer carries `seam_allowance`; strips carry explicit 0.
- No panel dimension is spoken in either video, so panel width/height, the
  back panel, the bellows oversize, the row pitch, pad length/width, the
  cross piece angle and spread, the front strap positions, the vertical
  webbing width, the base chest and the drag handle cut are all inputs with
  `mock-derived` warnings. The vault's absolute numbers are pinned by tests:
  first PALS mark 2" (½" under tape + 1.5" row), 6.5" strips for 4 columns at
  ¼" margins, 24" verticals − 2 × 1" tabs = 22" usable, 3 × 12" = 36" of
  circumference (base 36" → 72", +3" with the locks outboard), pad tab 1.5"
  marked → ¾" tuck, back panel 4 columns (5 "doesn't line up"), two loops per
  panel never three, loop tape 1" off the bottom, 10" hydration webbing with
  3.5"/3" pieces, 2" drag handle with the four-point dispersion stitch.
- The PALS field comes from `buildPalsField` with `rowWidth 1.5"`; the
  primitive's non-spec-row-width warning is kept as the vault's divergence
  flag. Row pitch is 2.5" by default (1.5" row + the spec's 1" gap) because
  the transcripts only say "middle row centred" — mock-derived. The front
  column count stays flagged unresolved (6.5" strips read as 4; the 24-mag
  claim needs more).
- Shoulder pads come from the strap engine (`webbing_tacked_ends`, bound,
  3/8" foam) with the tension lock marked on centre; verticals land on the
  back panel's outer column lines so the 4-column field dictates their
  spread (6"), matching the woodland LBV's 6" back strap spread.
- Steps follow the vault order: rows onto flat faces (loop on the rows,
  start at the lowest edge, bartack in one direction, ends raw for the tape)
  → verticals with the 1" channel mouth and double 1/4" lines → top slot
  strip and tabs → zippers pull-down → foam → close and edge tape (bellows
  not tacked) → belt loops (750°F holes, post/stud/socket) → pads → locks on
  centre → cross pieces at an angle → drag handle → lace the verticals →
  straps with One-Wrap keepers.
- 3D: front panels on the chest either side of a 2" closure gap, back panel
  behind, all three held rigid (foam pockets); pads draped over the medium
  torso pinned at both ends; four verticals draped from the panel landings
  (1.5" sewn) kicking out to the pad lines and over the shoulders, pinned at
  the crest, seamed to the panels. The back verticals must kick out: at the
  6" spread a 1.5" strap runs into the neck form. The fit report says how much
  of the 22" usable is left after reaching the tension lock at the highest
  panel position (316 mm of 559 — funds the 12" drop) and whether the torso's
  chest lies in the strap range.

**Commit:** c094822

## 2026-09-12 — Polishing passes: landing page and navigation, settings-panel primitives

**Context.** Fifteen generators had outgrown a flat list of cards in
registration order with paragraph descriptions, five copies of the same page
header, and eleven near-identical local `NumericField` / `Choice` / `Toggle`
helpers in the settings panels.

**Decisions.**
- Category model in `src/app/patternRegistry.ts`: `PatternCategory`
  (`pouches | packs | rigs | straps | apparel`), `CATEGORIES` (order and
  blurbs), and `PATTERN_META` (category, one-line summary, search tags per
  id). `PatternEntry` gained optional `category`, `summary`, `tags` so a new
  generator sets them on its entry; `patternCategory/Summary/Tags`,
  `patternsByCategory` and `matchesPatternQuery` read either source. The
  registry entries themselves are untouched (append-only stays true).
- Landing page (`src/components/landing/`): category sections with an inline
  SVG glyph per category (`CategoryGlyph`, no assets), one-line summaries with
  the long description as the card tooltip, a search box matching title /
  summary / description / tags, a "Recently opened" strip (`recent.ts`,
  localStorage `stitchsmith.recent-patterns`, five entries, reads never
  throw), and cards that are buttons named `Open <Title>` (the e2e and smoke
  tests keep clicking them). `App.openPattern` records the recent entry.
- Header: the five copied per-page headers collapsed into one that reads
  `HEADER_SUBTITLES` (now covering every page), plus a `GeneratorSwitcher`
  select grouped by category and an "All generators" link. Tool Roll keeps
  its own `AppHeader`.
- Field primitives in `src/components/shared/fields/`: `NumericField`
  (label bound by id, units suffix once, help/error under the box with
  `aria-describedby`, `mockDerived` adds the "measure and confirm" hint,
  `allowEmpty` chooses undefined-on-clear (default) or NaN-on-clear),
  `SelectField` (native select), `ChoiceField` (button group with
  `aria-pressed`), `Toggle` (labelled checkbox with help), `UnitToggle`,
  `SectionHeader`, `HelpText`.
- Migrated: sling, organizer, fanny pack, LBV, clamshell pack, plate carrier,
  micro rig, padded strap (local helpers deleted, unit block → `UnitToggle`);
  circle skirt, roll-top, zip pouch, book cover (local `NumericField` deleted;
  a one-line panel alias keeps their NaN-on-clear validation behaviour and
  the `(v: number) => void` callbacks; unit blocks → `UnitToggle`). Mock-
  derived fields on the sling, LBV and H-harness carry the hint.
- Left as-is: Tool Roll (its `NumInput`/`Row` pair drives a Radix Select +
  Switch table with its own a11y test), the mag pouch and Tri-Zip section
  files (raw labelled inputs and Radix selects with per-field copy; every
  control already has a bound label). They are candidates for a later
  mechanical pass, not a blocker.
- Test: `src/components/shared/__tests__/settingsPanels.a11y.test.tsx`
  mounts all fifteen panels with their default inputs, opens collapsed
  sections, and asserts every textbox / spinbutton / combobox / checkbox /
  switch has an accessible name and React logged no warning.
  `App.test.tsx` gained landing tests: category headings, search filtering,
  the recent strip and the header switcher.

**Commit:** 916e505

## 2026-09-12 — Polishing passes: shared export panel, warnings and derived numbers

**Context.** Fourteen generator pages carried sed-derived copies of
`ExportPanel.tsx`, `CutListTable.tsx` and `PatternPreview.tsx` (about 3,000
lines of near-identical code with drifting button labels: "Download PDF" on
the Book Cover, "PDF" everywhere else, JSON cut lists on three pages, no
tiled/PDF/DXF on the Zip Pouch and Roll-Top). Warnings and derived numbers
were rendered five different ways.

**Decisions.**
- `src/components/shared/export/`: one `PatternExportPanel` driven by an
  `ExportAdapter` — `{ generatorId, projectName, hasErrors, buildPattern(),
  defaultSeamAllowance, steps?(), hardware?(), bom?() | renderBom?() }`. It
  offers SVG (with "Piece labels" and "Notes and grain arrows" toggles that
  map to the exporter's `showLabels` / `showAnnotations`), **Cut sheets by
  material**, Tiled printable HTML, PDF, DXF, Cut List (+ CSV) and
  Instructions (hidden when the adapter has no steps). Button labels are
  now the same on every page: `SVG`, `PDF`, `DXF`, `Tiled printable HTML`,
  `Cut List` / `Hide Cut List`, `CSV`, `Instructions`.
- Per-material cut sheets download as ONE printable HTML page with an `<h2>`
  and inline SVG per material (`patternToSvgByMaterial`), each section on
  its own printed page: browsers block or prompt on multi-file downloads,
  and a single page goes straight to the bench with foam, mesh and webbing
  separated. The SVG for any one material can still be copied out of it.
- The cut list panel shows the engine cut list (`EngineCutListTable`:
  fabric by material, strip stock by material × width with SOE drawer
  lengths, hardware) followed by the generator's BOM — `SimpleBomTable`
  for the flat `{ description, quantity, unit }` rows, `StructuredBomTable`
  for the Roll-Top / Book Cover `{ materials, hardware, notes }`, or a
  custom renderer (the Mag Pouch keeps its cut-tag table). The Tri-Zip
  passes its build's hardware into the engine list.
- Shared `PatternPreview` takes a `Pattern | null`, a build error, the
  allowance and an optional SA label; it owns label/annotation toggles in
  the viewport toolbar unless the page passes `showLabels` (Tri-Zip shares
  the toggle with its export panel). Header reads piece types, total to cut
  and SA.
- Every generator's `ExportPanel.tsx` and `PatternPreview.tsx` is now a
  10–30 line adapter over the shared components (page props unchanged);
  every `CutListTable.tsx` copy is deleted except the Mag Pouch's (its cut
  tags are the BOM discipline the M14 test pins). The JSON cut-list download
  on the Zip Pouch, Roll-Top and Book Cover is replaced by the CSV cut list;
  those three pages gain tiled/PDF/DXF/instructions/per-material sheets.
- `WarningsPanel` accepts plain strings or `{ id, severity, message,
  field?, tag? }`, normalises a `[mock-derived]` prefix into the tag, shows
  the tag as a "mock first" badge, groups by severity with counts, collapses
  behind a one-line summary above six entries, and makes `[field]` a button
  that scrolls to and focuses the matching control (`onFocusField` or a
  default `[data-field] / #field / [name]` lookup).
- `DerivedNumbers` (`src/components/shared/warnings/DerivedNumbers.tsx`)
  renders label/value rows under `data-testid="derived-numbers"` (the Mag
  Pouch keeps `derived-summary`); `inch()` / `fmtLength()` helpers ship
  with it. Seven pages' ad-hoc grids now use it.
- Sidebar order on every pattern-engine page: warnings → legend → export →
  derived numbers → steps. The Zip Pouch, Roll-Top, Book Cover and Circle
  Skirt gained a warnings panel (their generators already returned
  warnings that were never shown); the Book Cover's legend and steps moved
  from the preview column into the sidebar. Deviation: the Mag Pouch also
  keeps its BOM open below the steps (cut tags are part of the build) and
  the Tool Roll is not on the pattern engine and keeps its own panels.

**Commit:** 916e505

## 2026-09-12 — Hardening pass: input validation and persistence

**Context.** Two of the five hardening passes. A generic fuzz harness
(`src/generators/__tests__/validation-fuzz.test.ts`) feeds every documented
input key of all 15 generators a matrix of garbage (NaN, −1, 0, 1e9, ±Infinity,
'', null, undefined, 'garbage', [], {}, [NaN]) and asserts: `validateInputs`
never throws; NaN / Infinity / 1e9 / strings on numeric keys, unknown strings
on selects and non-arrays on list keys are rejected with a field-keyed
message; and whenever validation accepts, `buildPattern` neither throws nor
returns a non-finite coordinate. A persistence suite
(`src/state/__tests__/persistence.test.ts`) drives every project hook through
corrupted storage, export → parse → import round trips, `updateInputs`,
`resetProject` and key uniqueness.

**Bugs the fuzz found (all fixed in `inputs.ts` / owned files).**
- Every generator except tool-roll accepted `NaN` or `1e9` (or both) on at
  least one length: book-cover (`flap_depth`, `seam_allowance`, `spine_width`,
  `top_bottom_hem`), circle-skirt (`waist_circumference`, `skirt_length`,
  `band_height`, `elastic_width`, …), clamshell-pack (`width`, `zipper_lip`,
  …), lbv (`panel_width`, `pad_length`, …), mag-pouch (`hook_length`,
  `loop_length`), organizer (`pouch_width`, …), padded-strap (`pad_length`,
  `foam_thickness`, …), plate-carrier (`strap_width`, `seam_allowance`, …),
  roll-top-sack (all four lengths), sling (`seam_allowance`), tri-zip
  (`height`, `width`), zip-pouch (`seam_allowance`, `grosgrain_width`).
  Symptom: NaN geometry in the SVG, or (fanny-pack, micro-rig) an allocation
  that killed the test worker.
- Unknown select strings were accepted on `units` everywhere it exists and on
  circle-skirt `closure` / `waistband_type` / `preset`, clamshell
  `pocket_grid` / `pals_style` / `strap_provision`, lbv `male_side`,
  mag-pouch `attachment` / `drainage` / `grommet_size`, padded-strap `mode`,
  plate-carrier `shoulder_style` / `shell_material` / `pocket_opening`, sling
  `third_piece` / `end_interface`, tri-zip `stylePreset` (a `null` preset
  crashed the build with "reading 'strap_width'"). NaN on padded-strap /
  tri-zip strap selects (`hardware`, `edge_finish`, `architecture`) passed
  validation and threw inside the strap engine; plate-carrier `qr_buckle` NaN
  threw `toUpperCase is not a function`.
- `null` threw in book-cover (`outer_pocket`, `inner_pocket`, `pen_holder`,
  `lining`, `tactical`: "Cannot read properties of null") and mag-pouch
  (`magazine`); organizer `slot_widths = NaN` threw "filter is not a
  function"; plate-carrier `side_plate = NaN` threw "is not iterable".
- mag-pouch `seamAllowance = undefined` passed validation and produced a
  NaN body outline (resolve.ts does not default it); tri-zip `hem_allowance =
  ''` and `zipper_gusset_width = NaN` produced non-finite panels.

**Decisions.**
- One shared guard (`src/utils/inputGuards.ts`): `sweepInputs` runs a per-
  generator `GUARD_SPEC` before the generator's own rules. Kinds: length
  (finite, ≥ 0, ≤ 5 m / 200 in in the display unit, or an explicit mm
  ceiling), count (integer with a ceiling), ratio, percent, angle, enum, bool,
  numArray, object. `null` is stripped at the top of both `validateInputs`
  and `resolveInputs` so a cleared field falls back to its default; `NaN`
  and `Infinity` are rejected, not defaulted, because they mean a broken
  file rather than a cleared field. Mag pouch accumulates guard issues with
  its own so the panel highlights every bad field at once; mag pouch
  `seamAllowance` is required (the resolver has no default for it) and
  tri-zip `stylePreset` is required (the page cannot build without it).
- `parseProjectJson` now rejects a future `schemaVersion` with a message
  naming both versions, a non-integer version, and an empty `projectName`;
  the version table (`KNOWN_SCHEMA_VERSIONS`) lives in the export module so
  it stays a leaf, and `src/state/index.ts` (new `PROJECT_HOOKS` registry
  with storage keys, versions, defaults, hooks and resets) is asserted equal
  to it. Every hook exports its `STORAGE_KEY`.
- `importProject` stays permissive: it stores a well-formed envelope whose
  inputs may still fail validation, and the page shows the validation banner
  (every page validates before building; H1 makes that validation total).
  Rejecting at import would lose a user's file over one out-of-range field.
- The fuzz harness skips the Tool Roll layout for values its validator does
  not flag (see gaps) so the suite stays bounded.

**Gaps outside this pass's files (repro for the owner of
`src/generators/tool-roll/validation.ts` / `calculateToolRollLayout.ts`).**
- `validateSettings` only checks `seamAllowance`, `minimumPocketWidth`,
  `pocketHeightIncrement`, `pocketHeightPercentage`, `tileOverlap` for
  finiteness and has no magnitude ceiling. `sideGap = Infinity` or `1e9`
  passes and `calculateToolRollLayout(sampleTools, settings, 'mm')` allocates
  until the heap dies; `flapHeight = NaN` passes; select settings are not
  checked (`printPaperSize = -1` throws "reading 'width'" in the layout).
- `validateTool` flags NaN/negative but not absurd magnitude (`width = 1e9`).
- mag-pouch `resolve.ts` should default `seamAllowance` (worked around by
  requiring it in validation).

**Commit:** 916e505

## Tests added
- `src/generators/__tests__/validation-fuzz.test.ts` — 330 tests (one per
  generator × input key, plus defaults and the Tool Roll settings/tool probes).
- `src/state/__tests__/persistence.test.ts` — 14 hooks × 11 cases + registry
  and Tool Roll storage checks (161 tests).
- `src/export/projectEnvelopeIO.test.ts` — 4 more cases (future version, old
  and missing versions, bad version type / empty name, table coverage).

## 2026-09-12 — Hardening passes: viewer failure modes, export sweep, assembly sweep; viewer UX polish

**Context.** Roadmap generators 1–9 are all in; before the UI polish passes the
3D viewer, the exporters and every assembly were swept for failure modes.

**Bugs found and fixed.**
- Exporters drew a seam-allowance line round closed **stitch** paths (a Velcro
  outline, a grommet patch, the fanny pack's belt tab marks) whenever a default
  allowance was passed, because `computeSeamAllowancePolygon` falls back to
  the default for edges without an entry. SVG and PDF now offset only cut
  outlines (`isCutOutline` in `exports/svg.ts`); a closed mark never grows a
  green line. Found by the export sweep on the fanny pack.
- The viewer threw out of its geometry effect (and took the page's React tree
  with it) when an assembly referenced a piece that was not in the scene, when
  a seam had zero length, or when the fold engine rejected a piece. It now
  validates seams (`viewer/validate.ts`: missing piece, non-finite, zero
  length → skipped and listed in the stats panel), wraps the whole scene build
  in a try/catch that shows "3D check failed: <reason>" in the panel, and
  `FoldPreview3D` sits inside a `ViewerErrorBoundary` with a retry.
- A diverged cloth solve (NaN positions) used to upload NaN geometry and keep
  running. The tick now checks `hasNonFinite` after every batch, stops, keeps
  the last stable frame and shows "simulation diverged"; the debug `finish()`
  hook does the same.
- Huge patterns: `clothSpacingFor` estimates the vertex count from the piece
  bounding boxes and coarsens the mesh above 40 000 vertices, saying so in the
  stats line.
- Unmount during a simulation: an `aliveRef` guards every upload and state
  update from a straggling animation frame; the scene teardown now cancels the
  cloth frame, disposes every geometry and material in the group
  (`disposeChildren`), disposes controls and renderer, forces the WebGL context
  loss and disconnects the `ResizeObserver`. The no-WebGL path is covered by
  a 20× mount/unmount test; the WebGL path cannot mount in jsdom and was
  checked by reading the teardown.
- LBV front panels were pinned over their whole area and floated flat in
  front of the chest; they are now held by their top strip only and settle on
  the body (sweep still 4.9 % stretch, 0.07 mm seam). The plate carrier front
  is a plate pocket and stays flat by design.

**Sweeps.** `src/lib/pattern-engine/__tests__/exports-sweep.test.ts` runs 25
default-and-variant patterns from 14 generators (Tool Roll is not on the
pattern engine) through SVG (plain, annotated, wrapped at 300 mm, per
material), DXF, cut list + CSV and the real PDF exporter, asserting every
piece group is present and that Convention B pieces draw no allowance line.
`src/generators/__tests__/assembly-sweep.test.ts` assembles 18 cases (11
generators with `assembly3d.ts` plus the e2e variants) with the shared
harness, checks fold models for orphans and tiling, and relaxes 400 steps:

| assembly | stretch | seam mean |
|---|---|---|
| tri-zip | 29.8 % | 0.05 mm |
| tri-zip split/direct | 24.0 % | 0.04 mm |
| zip pouch boxed / cross / gusset / multi | 9.6 / 7.6 / 1.2 / 2.6 % | ≤ 0.09 mm |
| circle skirt | 10.7 % | 0.06 mm |
| padded strap pair / H-harness | 1.1 / 10.7 % | 0.00 / 0.12 mm |
| micro rig / .308 stacked | 94 / 116 % (gathered-seam shear, known) | 1.2 / 1.5 mm |
| padded sling | 0.2 % | 0.00 mm |
| tactical organizer | 49.5 % (flap outside the seam) | 0.5 mm |
| fanny pack / closed-lid variant | 3.6 / 19.9 % | 0.03 / 0.10 mm |
| clamshell pack | 17.5 % | 0.13 mm |
| plate carrier | 5.0 % | 0.15 mm |
| modular LBV | 4.9 % | 0.07 mm |

Ceilings in the test are the measured values rounded up so a regression fails.
Mag pouch, roll-top and book cover build their assemblies in their pages;
`cloth-engine/__tests__/patterns.test.ts` reproduces them and stays their sweep.

**Viewer UX (P5).** Colour legend (swatch → piece name, collapsed past eight
pieces), a "reset view" button that re-frames the camera, a caption line
(`FoldPreview3D.caption`, default derived from block / torso / none),
tooltips on every stat plus a "what these numbers mean" block, a
"simulating… N %" progress badge with a `<progress>` bar, ids/aria-labels on
every control, and the canvas capped at the column width with a
`ResizeObserver` so it never overflows on a narrow viewport. Existing
`data-testid`s and the `window.__stitchsmithFoldViewer` hook are unchanged.

**Commit:** 916e505

## 2026-09-12 — Session close-out: tool-roll validation, e2e label fix, verification

- Tool Roll `validateSettings` now covers every numeric setting with a 5 m
  ceiling and every select field; `validateTool` caps tool dimensions at
  2 m; `getPaperSize` falls back to Letter. The fuzz harness no longer skips
  the tool roll. Mag pouch `resolve` defaults `seamAllowance`.
- The viewer's simulate checkbox gained an `aria-label` ("Simulate cloth");
  the e2e lookup is now case-insensitive.
- Verified after all passes: tsc clean, vitest 137 files / 2577 tests, vite
  build, Playwright 24/24.

**Commit:** 916e505
