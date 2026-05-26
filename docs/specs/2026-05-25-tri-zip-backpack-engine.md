---
date: 2026-05-25
title: "Tri-Zip Backpack Generator + Reusable Pattern Engine"
client: StitchSmith
project: StitchSmith
author: Caleb Bennett
status: draft
source_plan: docs/plans/2026-05-25-tri-zip-backpack-engine-design.md
quality_scores:
  outcome_clarity: 5
  scope_boundaries: 5
  decision_guidance: 5
  edge_coverage: 4
  acceptance_criteria: 4
  decomposition: 4
  purpose_alignment: 5
  total: 32
---

# Tri-Zip Backpack Generator + Reusable Pattern Engine

## Meta
- Client: StitchSmith
- Project: StitchSmith
- Repo: `C:/Users/CalebBennett/Documents/GitHub/StitchSmith`
- Date: 2026-05-25
- Author: Caleb Bennett
- Status: draft
- Source design: `docs/plans/2026-05-25-tri-zip-backpack-engine-design.md`
- Quality score: 32/35

## Outcome

A user opens StitchSmith, picks "Tri-Zip Backpack" from the landing page, configures any of six style presets + dimensions + per-section parameters in an accordion settings panel, sees a live SVG preview update, and exports the resulting pattern in six formats: SVG, tiled HTML print, tiled PDF, DXF, cut list + BOM, assembly instructions. The Tool Roll generator continues to work end-to-end and is migrated onto the new shared engine in the final phase with output geometrically identical (epsilon = 0.01 mm) to pre-migration. Adding a new pattern type after this spec ships costs a fraction of the original Tool Roll work — geometry, exports, instructions, cut list, BOM, mirroring, notches, and seam-allowance offset are all provided by the engine.

## Intent

**Trade-off hierarchy (when valid approaches conflict):**
1. **Engine API correctness over short-term velocity.** The engine is consumed by Tool Roll, Tri-Zip, and every future generator — get the abstractions right even if it slows phase 1.
2. **Preserve Tool Roll behavior.** Migration in SS-05 is feature-preserving; no user-visible regressions.
3. **Lazy-load expensive exporters** over reducing engine scope.
4. **Match existing project conventions** (ESM, vitest-next-to-source, shadcn copy-in, Tailwind v3) over inventing new patterns.

**Decision boundaries (escalate, don't decide):**
- New engine public primitive (new edge type, new annotation kind).
- New external dependency beyond pdf-lib (already accepted).
- Loosening the geometric-equivalence epsilon to make the migration test pass.
- Bundle-size budget breach (≤ 350 KB gzipped main bundle).
- Any change to Tool Roll's user-facing behavior beyond the documented migration.

## Context

StitchSmith is a browser-based parametric sewing-pattern generator (React 18 + TypeScript, Vite, Tailwind 3, shadcn/ui, Vitest). Today it ships one generator (Tool Roll) built directly without a shared engine, with SVG + tiled-HTML print + JSON exports. The codebase layout is documented in `docs/notes/project-overview.md` and `README.md`. Recent work (commits `bdd426b`, `4dcaecd`, `6c75736`, `ec891de`) refined hem-fold geometry; that arc-correction work is the kind of thing the new engine should provide once, not per generator.

This spec extracts a reusable, generator-agnostic **edge-graph pattern engine** (FreeSewing-inspired) into `src/lib/pattern-engine/`, adds a configurable Tri-Zip Backpack generator that consumes it, and migrates the existing Tool Roll generator onto the engine. The full design rationale, approach comparison, war-game analysis, and per-preset parameter tables live in the source design at `docs/plans/2026-05-25-tri-zip-backpack-engine-design.md` — that document is canonical for "why" decisions; this spec is canonical for "what" sub-specs must produce.

The Tri-Zip backpack opens in a Y-shape: front center panel + two front wings, with a Y-zip terminating at a configurable height percentage. Construction supports both `direct` (panel-to-zipper) and `gusseted` (panel-to-gusset-to-zipper, recommended) methods, with per-style defaults. Inspiration only — no commercial pattern is cloned.

## Infrastructure
- **Hosting:** Static hosting (Cloudflare Pages or GitHub Pages) — fully client-side SPA.
- **Storage:** Browser LocalStorage for working project state; JSON import/export for backups and sharing.
- **Network:** Standard — no backend, no required network after page load except asset fetching.

## Requirements

1. A new top-level library at `src/lib/pattern-engine/` exists with submodules `graph/`, `geometry/`, `materials/`, `exports/`, `instructions/`, and an `index.ts` barrel.
2. The engine represents patterns as a graph of `Point` / `Edge` / `Path` / `Piece` / `Pattern`, where `Edge` has a `role` of `cut | fold | stitch | seam | notch` and pieces support `mirror: true`, per-edge seam allowance, and shared-edge identity for seams between pieces.
3. The engine supports six exporters consuming a `Pattern`: `svg`, `tiledHtml`, `pdf` (lazy-loaded, uses pdf-lib), `dxf`, `cutList` (table + CSV), `instructions` (markdown + HTML).
4. The engine forbids imports from `src/generators/` and `src/components/`, enforced by an eslint `no-restricted-imports` rule scoped to `src/lib/pattern-engine/**` AND a vitest contract test that walks the engine source tree.
5. A new generator at `src/generators/tri-zip-backpack/` produces a `Pattern` from a `TriZipInputs` object and a `StylePreset` selection.
6. Six style presets (`urban_assault`, `tactical`, `hiking`, `camera`, `medical`, `minimalist`) ship as parameter bundles in `stylePresets.ts`, using the first-pass values defined in the source design.
7. The Tri-Zip page UI uses an accordion (`src/components/ui/accordion.tsx`) organized by build order: Style + Dimensions (always visible, with live "Computed volume: X L" readout) → Tri-Zip Geometry → Zipper System → Back Panel → Shoulder Straps → Sternum/Hip → Top Handle → Compression → Frame Sheet → Laptop Sleeve.
8. The landing page (`src/components/landing/LandingPage.tsx`) is updated so adding a new pattern is a single registry entry; both "Tool Roll" and "Tri-Zip Backpack" appear and are clickable.
9. Project JSON exports carry a top-level `schemaVersion` integer (Tool Roll = 1, Tri-Zip = 2). Import runs a per-version migrator chain; unknown future versions surface a friendly error.
10. The Tool Roll generator at `src/generators/tool-roll/` is refactored to consume the engine, with a geometric-equivalence regression test using `epsilon = 0.01 mm` against a committed snapshot of the current sample project (4-wrench layout).
11. The existing Tool Roll vitest suite passes unchanged after migration.
12. Main bundle size after engine landing is ≤ 350 KB gzipped (verified at build time). PDF, DXF, and tiled-print exporters are lazy-loaded via dynamic `import()`.

## Sub-Specs

---
sub_spec_id: SS-01
phase: run
depends_on: []
dispatch: factory
---

### 1. Engine foundation — graph + geometry + materials + instructions + baseline exporters + boundary enforcement

- **Scope:** Stand up `src/lib/pattern-engine/` with the graph model (`Point`, `Edge`, `Path`, `Piece`, `Pattern`), geometry helpers (seam-allowance offset, arc fit + arc-corrected parallels, transform, units, bbox), materials/hardware models (`Material`, `Hardware`, `CutList` aggregator), the instructions compiler (`Step` interface, topological sort, markdown + HTML render), and two baseline exporters (`svg`, `tiledHtml`) that match Tool Roll's current behavior in structure. Add engine-boundary enforcement via a **vitest contract test** that walks the engine source tree and rejects any import string pointing to `src/generators/` or `src/components/` (the project has no eslint configured, so the contract test is the sole enforcement mechanism — keep it strict). Port (do not re-derive) the arc-correction work from the current `src/generators/tool-roll/geometry.ts` into `src/lib/pattern-engine/geometry/arc.ts`; Tool Roll continues to use its own copy until SS-05.
- **Files (new):**
  - `src/lib/pattern-engine/index.ts`
  - `src/lib/pattern-engine/graph/Point.ts`
  - `src/lib/pattern-engine/graph/Edge.ts`
  - `src/lib/pattern-engine/graph/Path.ts`
  - `src/lib/pattern-engine/graph/Piece.ts`
  - `src/lib/pattern-engine/graph/Pattern.ts`
  - `src/lib/pattern-engine/graph/index.ts`
  - `src/lib/pattern-engine/geometry/offset.ts`
  - `src/lib/pattern-engine/geometry/arc.ts`
  - `src/lib/pattern-engine/geometry/transform.ts`
  - `src/lib/pattern-engine/geometry/units.ts`
  - `src/lib/pattern-engine/geometry/bbox.ts`
  - `src/lib/pattern-engine/geometry/index.ts`
  - `src/lib/pattern-engine/materials/Material.ts`
  - `src/lib/pattern-engine/materials/Hardware.ts`
  - `src/lib/pattern-engine/materials/cutList.ts`
  - `src/lib/pattern-engine/materials/index.ts`
  - `src/lib/pattern-engine/instructions/Step.ts`
  - `src/lib/pattern-engine/instructions/compile.ts`
  - `src/lib/pattern-engine/instructions/index.ts`
  - `src/lib/pattern-engine/exports/svg.ts`
  - `src/lib/pattern-engine/exports/tiledHtml.ts`
  - `src/lib/pattern-engine/exports/index.ts`
  - `src/lib/pattern-engine/__tests__/boundaries.test.ts`
  - `src/lib/pattern-engine/__tests__/graph.test.ts`
  - `src/lib/pattern-engine/__tests__/geometry-offset.test.ts`
  - `src/lib/pattern-engine/__tests__/instructions.test.ts`
  - `src/lib/pattern-engine/__tests__/exports-svg.test.ts`
  - `src/lib/pattern-engine/README.md`
- **Files (modify):**
  - `package.json`
- **Acceptance criteria:**
  - `[STRUCTURAL]` All files under `src/lib/pattern-engine/` listed above exist and export the types named.
  - `[STRUCTURAL]` `Edge.ts` exports an `Edge` discriminated union with variants `Straight | Arc | Bezier` and a `role: 'cut' | 'fold' | 'stitch' | 'seam' | 'notch'` field.
  - `[STRUCTURAL]` `Piece.ts` exports a `Piece` interface with at least `id: string`, `name: string`, `mirror: boolean`, `quantity: number`, `paths: Path[]`, `materialId?: string`, `annotations?: PieceAnnotation[]`.
  - `[STRUCTURAL]` `Step.ts` matches the shape in the source design (id, title, body, dependsOn, refsPieces, optional group).
  - `[MECHANICAL]` `grep -r "from.*src/generators" src/lib/pattern-engine/` returns no matches.
  - `[MECHANICAL]` `grep -r "from.*src/components" src/lib/pattern-engine/` returns no matches.
  - `[MECHANICAL]` `npm test -- --run src/lib/pattern-engine/__tests__/boundaries.test.ts` exits 0; the test asserts no offending import strings in the engine source tree.
  - `[MECHANICAL]` `npm run build` exits 0 and `npm test -- --run` exits 0 with all existing tests still passing.
  - `[BEHAVIORAL]` `exports/svg.ts` takes a `Pattern` with one square `Piece` (cut role) and returns an SVG string containing `<path>` with absolute `M`/`L` commands and dimensions matching the piece's bbox in mm.
  - `[BEHAVIORAL]` `geometry/offset.ts` offsets a unit square (CCW, 1 mm seam allowance) outward to a 1.002 m² area (within float epsilon); inward offset by 0.5 mm produces a 0.999 m² area. Self-intersection on tight inner curves emits a `Result` error variant rather than throwing.
  - `[BEHAVIORAL]` `instructions/compile.ts` accepts an array of Steps with `dependsOn` edges, topologically sorts them, and renders markdown with step numbers; cycles return an error result.

---
sub_spec_id: SS-02
phase: run
depends_on: ['SS-01']
dispatch: factory
---

### 2. Engine exporters — PDF (lazy-loaded), DXF, cut list + BOM render, schemaVersion migrator

- **Scope:** Add the four remaining engine exporters. PDF uses `pdf-lib` and is the only one with an npm dependency; it is loaded via dynamic `import()` so it does not impact main bundle size. DXF is pure JS (text format). Cut list + BOM renders a table component + emits CSV. Add a `projectJson` exporter + importer with `schemaVersion` migrator chain in `src/lib/pattern-engine/exports/projectJson.ts` (Tool Roll = 1, Tri-Zip = 2). Lazy-load PDF, DXF, and tiledHtml from a thin lazy-export façade.
- **Files (new):**
  - `src/lib/pattern-engine/exports/pdf.ts`
  - `src/lib/pattern-engine/exports/dxf.ts`
  - `src/lib/pattern-engine/exports/cutList.ts`
  - `src/lib/pattern-engine/exports/projectJson.ts`
  - `src/lib/pattern-engine/exports/lazy.ts`
  - `src/lib/pattern-engine/exports/migrators/index.ts`
  - `src/lib/pattern-engine/__tests__/exports-pdf.test.ts`
  - `src/lib/pattern-engine/__tests__/exports-dxf.test.ts`
  - `src/lib/pattern-engine/__tests__/exports-cutList.test.ts`
  - `src/lib/pattern-engine/__tests__/exports-projectJson.test.ts`
- **Files (modify):**
  - `src/lib/pattern-engine/exports/index.ts`
  - `package.json`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `package.json` includes `pdf-lib` in `dependencies`.
  - `[STRUCTURAL]` `src/lib/pattern-engine/exports/lazy.ts` exports async functions (`loadPdfExporter`, `loadDxfExporter`, `loadTiledHtmlExporter`) that use dynamic `import()` and return the exporter module.
  - `[MECHANICAL]` `grep -E "^import.*from.*'pdf-lib'" src/lib/pattern-engine/exports/pdf.ts` matches; no other file in the engine statically imports `pdf-lib`.
  - `[BEHAVIORAL]` `pdf.ts` takes a `Pattern` and produces a `Blob` of MIME type `application/pdf`; the PDF includes a 50 mm scale-check square and crop marks on every tile.
  - `[BEHAVIORAL]` `dxf.ts` takes a `Pattern` and emits a string starting with `0\nSECTION\n2\nHEADER` and ending with `0\nEOF`; it produces one layer per piece using piece id as the layer name.
  - `[STRUCTURAL]` DXF entity emission per `Edge` variant: `Straight` → `LINE` (group code `0=LINE`); `Arc` → `ARC` (group code `0=ARC`) with native center/radius/angle, not polyline-sampled; `Bezier` → `LWPOLYLINE` sampled with configurable segment count (default 32).
  - `[BEHAVIORAL]` `cutList.ts` returns an object with `byMaterial: Array<{ materialId, totalAreaMm2, pieces: string[] }>` and `byHardware: Array<{ hardwareId, count }>` for a `Pattern` with at least two materials and two hardware items.
  - `[BEHAVIORAL]` `projectJson.ts` round-trips a project envelope (`{ schemaVersion: 2, generatorId: 'tri-zip-backpack', inputs, stylePresetName }`) bit-for-bit: export → parse → re-export produces the identical string.
  - `[BEHAVIORAL]` `projectJson.ts` import structurally validates the parsed object against the generator's input schema; missing required fields, wrong-typed fields, or invalid enum values return a typed error result (not partial state).
  - `[BEHAVIORAL]` The migrator chain mechanism is exercised by a synthetic within-generator example: a `tri-zip-v2 → tri-zip-v3` migrator is registered and tested in isolation (no real v3 schema yet; the test uses a fixture). Loading an unknown future `schemaVersion` returns a typed error with a user-friendly message ("This project was saved by a newer version of StitchSmith"). Loading a project with a different `generatorId` than the current page surfaces the wrong-generator error from SS-05.
  - `[MECHANICAL]` `npm run build` exits 0 and the build output shows `pdf-lib` chunked into a separate file (lazy chunk) via Vite's automatic code splitting.
  - `[MECHANICAL]` `npm test -- --run` exits 0.

---
sub_spec_id: SS-03
phase: run
depends_on: ['SS-01']
dispatch: factory
---

### 3. Tri-Zip generator core — modules, style presets, buildPattern

- **Scope:** Build the Tri-Zip backpack generator at `src/generators/tri-zip-backpack/`. Each pattern piece is a module that emits a `Piece` and contributes `Step`s. `buildPattern.ts` orchestrates modules into a `Pattern` based on `TriZipInputs` and a chosen `StylePreset`. Style presets are parameter bundles using the values in the source design's "Style preset parameter table". No UI in this sub-spec — pure data layer. Can run in parallel with SS-02.
- **Files (new):**
  - `src/generators/tri-zip-backpack/types.ts`
  - `src/generators/tri-zip-backpack/inputs.ts`
  - `src/generators/tri-zip-backpack/stylePresets.ts`
  - `src/generators/tri-zip-backpack/buildPattern.ts`
  - `src/generators/tri-zip-backpack/steps.ts`
  - `src/generators/tri-zip-backpack/modules/backPanel.ts`
  - `src/generators/tri-zip-backpack/modules/frontCenterPanel.ts`
  - `src/generators/tri-zip-backpack/modules/frontWing.ts`
  - `src/generators/tri-zip-backpack/modules/perimeterGusset.ts`
  - `src/generators/tri-zip-backpack/modules/triZipSubsystem.ts`
  - `src/generators/tri-zip-backpack/modules/shoulderStraps.ts`
  - `src/generators/tri-zip-backpack/modules/sternumStrap.ts`
  - `src/generators/tri-zip-backpack/modules/hipBelt.ts`
  - `src/generators/tri-zip-backpack/modules/topHandle.ts`
  - `src/generators/tri-zip-backpack/modules/compressionStraps.ts`
  - `src/generators/tri-zip-backpack/modules/frameSheet.ts`
  - `src/generators/tri-zip-backpack/modules/laptopSleeve.ts`
  - `src/generators/tri-zip-backpack/index.ts`
  - `src/generators/tri-zip-backpack/__tests__/buildPattern.test.ts`
  - `src/generators/tri-zip-backpack/__tests__/stylePresets.test.ts`
  - `src/generators/tri-zip-backpack/__tests__/modules-backPanel.test.ts`
  - `src/generators/tri-zip-backpack/__tests__/modules-triZipSubsystem.test.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `stylePresets.ts` exports six named presets: `urban_assault`, `tactical`, `hiking`, `camera`, `medical`, `minimalist`, each matching the parameter table in the source design.
  - `[STRUCTURAL]` `types.ts` exports a `TriZipInputs` interface including height, width, depth, units, stylePreset name, and per-section parameter overrides matching the brain-dump fields.
  - `[BEHAVIORAL]` `buildPattern(inputs, preset)` returns a `Pattern` with at least these pieces present when defaults apply: back panel, front center panel, two front wings (one via `mirror: true`), perimeter gusset (or split-gusset pieces), shoulder straps (qty 2), top handle.
  - `[BEHAVIORAL]` For `zipper_method: 'gusseted'`, the Tri-Zip subsystem emits a zipper-gusset strip piece; for `direct`, it does not.
  - `[BEHAVIORAL]` The Y-split intersection occurs at `y_split_height_percent` of the front face height; verified by sampling the front-wing piece's interior edge at the expected y-coordinate.
  - `[BEHAVIORAL]` Front wing is emitted as one `Piece` with `mirror: true, quantity: 2` — not as two hand-coded pieces.
  - `[BEHAVIORAL]` Shared seam between front center panel and the Tri-Zip subsystem references the same `Edge` id from both pieces; lengths match.
  - `[BEHAVIORAL]` `buildPattern` returns a typed error result when shared-seam length mismatch is detected; the test asserts the error path.
  - `[BEHAVIORAL]` All six style presets produce a non-empty `Pattern` without throwing.
  - `[BEHAVIORAL]` Given identical dimensions (e.g., `height=510, width=300, depth=200, units='mm'`), the six presets produce `Pattern` objects that differ in at least one observable dimension: piece count, bounding box area, shoulder-strap `strap_width`, or back-panel shape. The test asserts no two presets produce byte-identical SVG output via `exports/svg.ts`.
  - `[BEHAVIORAL]` Setting `compression_straps: 'none'` omits compression-strap pieces; `'side'` adds two; `'side_and_bottom'` adds four.
  - `[BEHAVIORAL]` `frame_sheet: 'hdpe' | 'foam'` emits a frame-sheet piece sized to fit inside the back panel minus a configurable margin; `'none'` omits it.
  - `[MECHANICAL]` `npm test -- --run src/generators/tri-zip-backpack/` exits 0.

---
sub_spec_id: SS-04
phase: run
depends_on: ['SS-02', 'SS-03']
dispatch: factory
---

### 4. Tri-Zip UI, landing-page wiring, ExportPanel (all 6 exporters)

- **Scope:** Build the Tri-Zip backpack page UI. Accordion settings panel (using `src/components/ui/accordion.tsx`) organized in build order with always-visible Style + Dimensions block containing the live "Computed volume: X L" readout. Sections: TriZipGeometrySection, ZipperSystemSection, BackPanelSection, ShoulderStrapsSection, SternumHipSection, TopHandleSection, CompressionSection, FrameSheetSection, LaptopSleeveSection. PatternPreview consumes the engine's SVG exporter. ExportPanel wires all six exporters (SVG, tiled HTML, PDF lazy, DXF, cut list + BOM table + CSV, assembly instructions). Add a `useTriZipProject` hook in `src/state/` modeled on the existing `useToolRollProject`. Register Tri-Zip in the pattern registry consumed by `LandingPage`.
- **Files (new):**
  - `src/components/tri-zip-backpack/TriZipPage.tsx`
  - `src/components/tri-zip-backpack/TriZipSettingsPanel.tsx`
  - `src/components/tri-zip-backpack/PatternPreview.tsx`
  - `src/components/tri-zip-backpack/ExportPanel.tsx`
  - `src/components/tri-zip-backpack/sections/StyleAndDimensionsSection.tsx`
  - `src/components/tri-zip-backpack/sections/TriZipGeometrySection.tsx`
  - `src/components/tri-zip-backpack/sections/ZipperSystemSection.tsx`
  - `src/components/tri-zip-backpack/sections/BackPanelSection.tsx`
  - `src/components/tri-zip-backpack/sections/ShoulderStrapsSection.tsx`
  - `src/components/tri-zip-backpack/sections/SternumHipSection.tsx`
  - `src/components/tri-zip-backpack/sections/TopHandleSection.tsx`
  - `src/components/tri-zip-backpack/sections/CompressionSection.tsx`
  - `src/components/tri-zip-backpack/sections/FrameSheetSection.tsx`
  - `src/components/tri-zip-backpack/sections/LaptopSleeveSection.tsx`
  - `src/components/tri-zip-backpack/CutListTable.tsx`
  - `src/state/useTriZipProject.ts`
  - `src/app/patternRegistry.ts`
  - `src/components/tri-zip-backpack/__tests__/TriZipPage.test.tsx`
  - `src/components/tri-zip-backpack/__tests__/ExportPanel.test.tsx`
  - `src/components/landing/LandingPage.tsx`
- **Files (modify):**
  - `src/app/App.tsx`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `patternRegistry.ts` exports a `PATTERNS` array whose entries include `id`, `title`, `description`, `available`, and a `route` or component-loader reference. `LandingPage.tsx` consumes the registry rather than a local literal.
  - `[STRUCTURAL]` `App.tsx` switches between landing, tool-roll, and tri-zip views via the registry.
  - `[STRUCTURAL]` `TriZipSettingsPanel.tsx` uses `Accordion` from `@/components/ui/accordion` and contains the nine documented sections.
  - `[BEHAVIORAL]` Rendering `TriZipPage` shows a live volume readout that updates when height/width/depth inputs change (`H × W × D / 1000` for mm inputs; converted appropriately for inches).
  - `[BEHAVIORAL]` Clicking "SVG" in ExportPanel triggers a download with a `.svg` extension via the engine's `svg` exporter.
  - `[BEHAVIORAL]` Clicking "PDF" lazily loads the PDF exporter and triggers a download with a `.pdf` extension and `application/pdf` MIME type.
  - `[BEHAVIORAL]` Clicking "DXF" triggers a download with a `.dxf` extension.
  - `[BEHAVIORAL]` Clicking "Cut List" reveals or downloads a table with one row per material/hardware item; CSV export available.
  - `[BEHAVIORAL]` Clicking "Instructions" renders or downloads an HTML/markdown document with topologically-ordered steps.
  - `[BEHAVIORAL]` Clicking "Save Project" downloads a JSON with top-level `schemaVersion: 2`.
  - `[BEHAVIORAL]` Importing a previously-exported v2 project JSON restores all inputs to the same state.
  - `[BEHAVIORAL]` Invalid Tri-Zip inputs (negative dimension, NaN, zero on any of height/width/depth, out-of-range percent fields) surface per-field error messages in the WarningsPanel area; all export buttons become disabled until the errors clear.
  - `[STRUCTURAL]` `ExportPanel.tsx` sources its exporters via the lazy façade for PDF/DXF/tiledHtml (uses `loadPdfExporter`, `loadDxfExporter`, `loadTiledHtmlExporter` from `src/lib/pattern-engine/exports/lazy.ts`) and imports SVG + cut list + instructions exporters directly (small, no need to defer). The same pattern is applied to Tool Roll's ExportPanel in SS-05.
  - `[INTEGRATION]` From the landing page: click "Tri-Zip Backpack" → settings panel appears → adjust dimensions → preview updates → click each of the six exporters → each produces the documented output. End-to-end flow passes without console errors.
  - `[INTEGRATION]` Landing page lists Tool Roll AND Tri-Zip Backpack; both are clickable; clicking either navigates to that generator's page.
  - `[MECHANICAL]` `npm run build` exits 0 and the main bundle ≤ 350 KB gzipped (Vite's `build` output shows the chunk sizes).
  - `[MECHANICAL]` `npm test -- --run` exits 0 with all existing tests still passing.

---
sub_spec_id: SS-05
phase: run
depends_on: ['SS-01', 'SS-04']
dispatch: factory
---

### 5. Tool Roll migration onto the engine + geometric-equivalence regression test

- **Scope:** Refactor `src/generators/tool-roll/` to consume `src/lib/pattern-engine/`. The Tool Roll page, settings, and export buttons must keep their current behavior. Tool Roll's exports now flow through the engine's exporter pipeline. Add a snapshot of the current sample project's SVG output (committed before migration starts) and a new vitest case that loads the snapshot, runs the migrated engine path, samples N points per closed path (default N=64) and N=32 per open path, and asserts geometric equivalence with `epsilon = 0.01 mm`. Project JSON for Tool Roll now carries `schemaVersion: 1`; the import path runs the v1→v2 migrator chain from SS-02 when loading Tri-Zip projects, and accepts v1 Tool Roll projects unchanged.
- **Files (new):**
  - `src/generators/tool-roll/__tests__/migration-snapshot.svg` (committed before the refactor; binary/text data)
  - `src/generators/tool-roll/__tests__/geometric-equivalence.test.ts`
- **Files (modify):**
  - `src/generators/tool-roll/calculateToolRollLayout.ts`
  - `src/generators/tool-roll/geometry.ts`
  - `src/generators/tool-roll/grouping.ts`
  - `src/generators/tool-roll/types.ts`
  - `src/generators/tool-roll/constructionNotes.ts`
  - `src/generators/tool-roll/defaults.ts`
  - `src/generators/tool-roll/renderHelpers.ts`
  - `src/export/exportSvg.ts`
  - `src/export/exportPrintableHtml.ts`
  - `src/export/exportProjectJson.ts`
  - `src/export/importProjectJson.ts`
  - `src/components/tool-roll/PatternPreview.tsx`
  - `src/components/tool-roll/ExportPanel.tsx`
  - `src/components/tool-roll/ConstructionNotes.tsx`
  - `src/state/useToolRollProject.ts`
  - `src/storage/localStorage.ts`
- **Acceptance criteria:**
  - `[STRUCTURAL]` `src/generators/tool-roll/__tests__/migration-snapshot.svg` exists and was committed prior to the refactor (verify via `git log` — the commit adding the snapshot is older than the commit migrating geometry.ts).
  - `[MECHANICAL]` The existing tool-roll test suite passes unchanged: `npm test -- --run src/generators/tool-roll/` exits 0 with no test edits beyond the new regression test file.
  - `[MECHANICAL]` The App-level integration tests in `src/app/App.test.tsx` continue to pass with no modification.
  - `[BEHAVIORAL]` `geometric-equivalence.test.ts` loads the snapshot, runs the new engine-backed Tool Roll path on the sample-project 4-wrench layout, samples 64 points per closed path and 32 per open path, and asserts every sample is within 0.01 mm of the snapshot's corresponding sample.
  - `[BEHAVIORAL]` Saving a Tool Roll project produces JSON with `schemaVersion: 1`; loading a v1 Tool Roll project restores it correctly.
  - `[BEHAVIORAL]` Loading a v2 Tri-Zip project file inside the Tool Roll page surfaces a friendly error ("This project is a Tri-Zip Backpack — switch to that generator to load it") instead of corrupting state.
  - `[STRUCTURAL]` `src/generators/tool-roll/geometry.ts` either re-exports from `src/lib/pattern-engine/geometry/` or is deleted; either way, no math is duplicated between the two locations.
  - `[INTEGRATION]` Launch the dev server (`npm run dev`), open Tool Roll, add a tool, change ease, change units, export SVG, export tiled HTML, save project, reset project, re-import project — all operations succeed with no console errors. (HUMAN REVIEW)
  - `[HUMAN REVIEW]` Visual diff of the SVG export against the snapshot is acceptable (no visible regressions in pocket placement, flap geometry, hem folds, tie marks, labels).
  - `[MECHANICAL]` `npm run build` exits 0 and main bundle ≤ 350 KB gzipped.

## Edge Cases

- **Self-intersecting seam-allowance offset on tight inner curves.** Engine `offset.ts` returns a typed error rather than producing invalid geometry; UI surfaces the offending piece + suggests reducing per-edge SA on that edge. Disambiguation: this is the "strict" interpretation — reject and tell the user, do not silently coerce.
- **Shared-edge length mismatch.** `buildPattern` returns a typed error citing both piece ids and the lengths involved. WarningsPanel surfaces it; export buttons disable until resolved.
- **PDF tile exceeds selected paper size.** PDF exporter returns an error variant; UI offers to re-tile at a larger paper size or split the piece (split-gusset path).
- **Loading a project JSON with unknown future `schemaVersion`.** Importer returns a friendly error: "This project was saved by a newer version of StitchSmith. Update to the latest version to load it."
- **Cross-generator project loads.** v1 (Tool Roll) and v2 (Tri-Zip) are sibling schemas distinguished by `generatorId`, NOT an upgrade chain. There is no Tool Roll → Tri-Zip migration. Importing a project whose `generatorId` doesn't match the current generator surfaces a friendly switch-generator message (covered by SS-05 acceptance criteria). Within-generator forward migration (e.g., Tri-Zip v2 → v3 in a future release) is what the migrator chain is built for.
- **A style preset that needs a new pattern module.** Surface to the human before adding a public engine primitive (escalation trigger). Do not branch the engine on style.
- **Empty Tri-Zip inputs (all zero dimensions).** Input validation rejects with explicit per-field messages; `buildPattern` is not called.
- **DXF emitted with arcs vs polyline-sampled.** Default: arcs (preserves geometry for laser cutters). Configurable later if a target machine demands polylines.
- **Construction-notes step cycle.** `compile.ts` returns an error; never silently breaks the cycle.
- **LocalStorage quota exceeded.** Existing `localStorage.ts` already handles quota errors for Tool Roll; Tri-Zip's state hook follows the same pattern.

## Out of Scope

- Cloning or replicating any commercial pattern (Mystery Ranch Urban Assault, 2 Day Assault, CamelBak Tri-Zip, etc.). Inspiration only.
- Reverse capacity solver (liters → dimensions with locked dim). v2 — only the live "Computed volume: X L" readout ships now.
- User-defined / user-saved style presets. The six listed are it for this spec.
- 3D preview. SVG flat preview only.
- Automated pattern-piece nesting on fabric. Cut list is per-piece area + totals; layout optimization is a v2 nicety.
- Backend, telemetry, accounts, server-side rendering.
- New Tool Roll features bundled with the migration. SS-05 is feature-preserving only.
- Other future generators (knife rolls, bit organizers, gardening rolls). The engine enables them; they are out of scope here.
- Polyline-sampled DXF output (default = arcs).

## Constraints

### Musts

- M1. `src/lib/pattern-engine/` has zero imports from `src/generators/` or `src/components/`. Enforced by eslint + a vitest contract test.
- M2. Tool Roll behavior is preserved end-to-end through SS-05; the existing Tool Roll vitest suite passes unchanged.
- M3. Pattern geometry is stored as an edge graph (`Point`/`Edge`/`Path`/`Piece`/`Pattern`), not raw SVG shapes.
- M4. All measurements internal to the engine are in mm. Unit conversion happens only at I/O boundaries (inputs, labels, exports).
- M5. Project JSON files carry `schemaVersion`. Import runs a per-version migrator chain.
- M6. PDF, DXF, and tiled-print exporters are lazy-loaded via dynamic `import()`.
- M7. The main bundle (initial load) is ≤ 350 KB gzipped after engine landing, verified at `npm run build`.
- M8. All six style presets produce valid `Pattern` objects without throwing for every documented combination of zipper method × back panel shape × compression × frame sheet × hip belt.

### Must-Nots

- MN1. No hardcoded dimensions outside `stylePresets.ts` and per-generator input defaults.
- MN2. No cloning of any commercial pattern. Inspiration only.
- MN3. No backend, no telemetry, no accounts, no server-side state.
- MN4. Do NOT loosen the migration epsilon (0.01 mm) to make SS-05's regression test pass — escalate instead.
- MN5. Do NOT add a new external dependency beyond pdf-lib without escalation.
- MN6. Do NOT branch the engine on style preset. Style is a parameter bundle; if a preset needs a new module, add the module (escalate the addition).
- MN7. Do NOT duplicate geometry math between `src/lib/pattern-engine/geometry/` and `src/generators/tool-roll/geometry.ts` after SS-05.

### Preferences

- P1. ESM throughout — relative imports use `.js` extensions because the project is true ESM (`"type": "module"`).
- P2. Tests live next to source as `*.test.ts` (or in `__tests__/` subdirectories at the discretion of the implementer, consistent within a directory).
- P3. shadcn/ui components are copy-in via `npx shadcn@latest add ...` — never added to `package.json` as npm packages.
- P4. Tailwind v3 conventions and shadcn class patterns.
- P5. SVG path commands prefer absolute (`M`, `L`, `A`, `C`) over relative — keeps diffs and DXF translation predictable.
- P6. Reuse the existing `Card`, `Button`, `Accordion`, `Input`, `Label`, `Select`, `Switch`, `Tabs` primitives from `src/components/ui/` instead of styling from scratch.
- P7. LocalStorage key naming: `stitchsmith.<generator-id>.project`.
- P8. New React component files are PascalCase, one component per file. Module files are lower-kebab-case.

### Escalation Triggers

- ET1. The engine needs a new public primitive (new `Edge` variant, new annotation kind, new `Piece` field) to support a style preset. Surface the preset + the proposed primitive before implementing.
- ET2. A new external dependency is required (especially pdf-lib alternatives, or any DXF helper).
- ET3. SS-05's geometric-equivalence regression test fails after best-effort migration. Escalate with the diff data; do NOT loosen epsilon.
- ET4. The main bundle ≤ 350 KB gzipped budget is breached. Do NOT delete lazy-loaded imports; propose a remediation.
- ET5. A style preset's intent cannot be expressed in the documented parameter space without a bespoke module per preset.
- ET6. Any acceptance criterion in this spec conflicts with the source design — the source design wins; surface the conflict.

## Phase Specs

Refined by `/forge-prep` on 2026-05-25.

| Sub-Spec | Phase Spec |
|----------|------------|
| 1. Engine foundation | `docs/specs/tri-zip-backpack-engine/sub-spec-1-engine-foundation.md` |
| 2. Engine exporters | `docs/specs/tri-zip-backpack-engine/sub-spec-2-engine-exporters.md` |
| 3. Tri-Zip generator core | `docs/specs/tri-zip-backpack-engine/sub-spec-3-tri-zip-generator-core.md` |
| 4. Tri-Zip UI | `docs/specs/tri-zip-backpack-engine/sub-spec-4-tri-zip-ui.md` |
| 5. Tool Roll migration | `docs/specs/tri-zip-backpack-engine/sub-spec-5-tool-roll-migration.md` |
| 6. Integration verification (auto) | `docs/specs/tri-zip-backpack-engine/sub-spec-6-integration-cross-sub-spec-wiring.md` |

Index: `docs/specs/tri-zip-backpack-engine/index.md`

## Verification

End-to-end verification after SS-05 completes:

1. `npm install` succeeds.
2. `npm run build` exits 0; the build output reports the main bundle is ≤ 350 KB gzipped and shows lazy chunks for pdf-lib, DXF, and tiled-print.
3. `npm test -- --run` exits 0. Specifically, all of these pass:
   - `src/lib/pattern-engine/__tests__/*` (engine units + boundary contract)
   - `src/generators/tri-zip-backpack/__tests__/*` (Tri-Zip generator units)
   - `src/generators/tool-roll/__tests__/*` (existing Tool Roll suite, unchanged)
   - `src/generators/tool-roll/__tests__/geometric-equivalence.test.ts` (new regression)
   - `src/components/tri-zip-backpack/__tests__/*` (Tri-Zip UI integration)
   - `src/app/App.test.tsx` (top-level integration, unchanged)
4. `npm run dev` launches the dev server. In a browser:
   - Landing page lists Tool Roll and Tri-Zip Backpack, both clickable.
   - Click Tool Roll → existing behavior unchanged, all exports work, project save/load round-trips, reset works.
   - Click Tri-Zip Backpack → settings panel renders with accordion sections, live volume readout updates as dimensions change, preview updates, all six exporters produce output, project save/load round-trips for v2 JSON, loading a v1 (Tool Roll) JSON inside Tri-Zip surfaces a friendly error.
   - Switch style presets — each of the six produces a visually-distinct, valid pattern.
   - Toggle zipper method between `direct` and `gusseted` — gusseted adds the zipper-gusset piece.
   - Toggle split-gusset — produces multiple gusset pieces sized for narrower fabric.
5. Source-design assumptions resolved:
   - Migration tolerance = geometric, epsilon = 0.01 mm (SS-05).
   - Style-preset parameter table from the source design implemented in `stylePresets.ts` (SS-03).
   - Engine boundary enforcement by both eslint and vitest (SS-01).
   - `schemaVersion` migrator chain in place (SS-02).
   - Bundle-size budget verified at build time (SS-04, SS-05).
