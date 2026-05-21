# StitchSmith — Tool Roll Pattern Generator (v1)

## Meta
- **Project:** StitchSmith
- **Repo:** C:/Users/CalebBennett/Documents/GitHub/StitchSmith
- **Date:** 2026-05-20
- **Author:** Caleb Bennett
- **Source design:** `docs/plans/2026-05-20-stitchsmith-tool-roll-generator-design.md`
- **Status:** ready-for-prep
- **Quality scores (out of 5):** Outcome 5 · Scope 5 · Decision guidance 4 · Edge coverage 4 · Acceptance criteria 4 · Decomposition 4 · Purpose alignment 5 — **Total 31/35**

## Outcome

A deployed static site (Cloudflare Pages or GitHub Pages) where a maker enters per-tool measurements, sees a live SVG preview of a complete tool-roll pattern, and downloads (a) a real-dimension full-size SVG, (b) a tiled printable HTML for Letter or A4 paper, and (c) a JSON project backup. Printed output taped together at 100% print scale matches on-screen dimensions to within ±0.5 mm per page edge. State persists across reloads via LocalStorage. All Phase 1–6 acceptance criteria from the source design pass.

## Intent

**Trade-off hierarchy (when valid approaches conflict):**
1. **Correctness of generated geometry** over UI polish — a mis-sized pattern wastes fabric.
2. **Simplicity / static-hostable** over feature richness — no backends, no PDF libs.
3. **Extensibility for future generators** over v1 ergonomics — the `PatternGenerator` interface is a contract; respect it.
4. **Type-safety and pure functions** over rapid prototyping — geometry MUST live in `src/generators/`, never in components.
5. **Internal millimeters** over UI-friendly units — convert only at the display boundary.

**Decision boundaries (escalate before deciding):**
- Adding any npm dependency outside the spec's recommended list (esp. > 20 KB gzipped).
- Changing any default in `defaultToolRollSettings` (sewing-domain values).
- Bumping `schemaVersion` for serialized projects.
- Changing any of the geometry formulas in design §11 (X positions, Y positions, pocket depth, pocket width, flap height, tile layout).
- Replacing the printable-HTML approach with a PDF library or canvas renderer.

## Context

StitchSmith is greenfield. No source code exists yet. The design at `docs/plans/2026-05-20-stitchsmith-tool-roll-generator-design.md` (status: `evaluated`, 0 critical/important gaps, 10 assumptions classified) is the authoritative source for architecture, data models, formulas, and acceptance criteria. The design has been through forge-brainstorm and forge-evaluate.

Stack: React 18 + TypeScript + Vite + Tailwind CSS v3 + shadcn/ui + lucide-react. Test runner: Vitest + @testing-library/react + jsdom. No backend, no database, no auth. LocalStorage key: `stitchsmith.tool-roll.v1`.

The work is layered: pure-function generator → SVG renderer → React UI shell → storage/export. Sub-specs follow this dependency order so each can be implemented and tested in isolation, with an integration sub-spec at the end that wires everything together.

## Infrastructure
- **Hosting:** Static hosting (Cloudflare Pages or GitHub Pages) — fully client-side SPA.
- **Database:** None.
- **Secrets:** None.
- **Network:** Standard — no required network after page load.
- **Storage:** Browser LocalStorage (working state) + JSON import/export (backup/sharing).

## Requirements

1. Scaffold a Vite + React + TypeScript project named `stitchsmith` at the repo root.
2. Configure Tailwind CSS v3 and initialize shadcn/ui; vendor in the components listed in design §21.3.
3. Define all TypeScript types from design §7 and §10 in `src/generators/tool-roll/types.ts`.
4. Implement `defaultToolRollSettings` and `sampleTools` from design §7.4 and §38.
5. Implement the pure geometry calculator (`calculateToolRollLayout`, helpers in `geometry.ts`) per design §8–§14 and §35.
6. Implement validation (`validateTool`, `validateSettings`, `validateLayout`) per design §27 and §36.
7. Implement construction notes generation per design §32.
8. Implement LocalStorage persistence (debounced 300–500 ms, key `stitchsmith.tool-roll.v1`).
9. Implement the React UI shell: header, tool table, settings accordion, pattern preview, summary, warnings, construction notes, export panel per design §21–§27 and §30–§32.
10. Implement the SVG renderer with correct layer ordering per design §28–§30.
11. Implement Full SVG export and Project JSON export/import per design §15, §18–§19, and §37.
12. Implement the printable HTML tiled export per design §15–§17 with page label, scale check square, registration marks, and prominent "Print at 100%" warning.
13. Define the `PatternGenerator<TSettings, TInput, TLayout>` interface in `src/generators/index.ts` and register `toolRollGenerator`.
14. App must be responsive (desktop side-by-side; mobile stacked) per design §21.
15. All Phase 1–6 acceptance criteria from design §39 must pass.
16. App must build cleanly (`npm run build` exits 0), tests must pass (`npm test -- --run` exits 0), and the production build must be deployable to a static host.

## Sub-Specs

---
sub_spec_id: SS-01
phase: run
depends_on: []
dispatch: factory
---

### 1. Project scaffold (Vite + React + TS + Tailwind + shadcn)

- **Scope:** Initialize the project. Configure Vite, TypeScript, Tailwind v3, PostCSS, shadcn/ui. Install dev tooling (Vitest, @testing-library/react, jsdom). Add npm scripts (`dev`, `build`, `preview`, `test`). No app code yet — only scaffolding.
- **Files (new):**
  - `package.json`
  - `tsconfig.json`
  - `tsconfig.node.json`
  - `vite.config.ts`
  - `tailwind.config.js`
  - `postcss.config.js`
  - `components.json`
  - `index.html`
  - `src/main.tsx`
  - `src/index.css`
  - `src/vite-env.d.ts`
  - `.gitignore`
  - `README.md`
- **Files (modify):** none
- **Acceptance criteria:**
  - `[MECHANICAL]` `npm install` exits 0.
  - `[MECHANICAL]` `npm run build` exits 0 and produces `dist/index.html`.
  - `[MECHANICAL]` `npm test -- --run` exits 0 (no tests yet, but harness works).
  - `[STRUCTURAL]` `package.json` includes `react@^18`, `react-dom@^18`, `typescript`, `vite`, `tailwindcss@^3`, `vitest`, `@testing-library/react`, `jsdom`, `lucide-react`, `class-variance-authority`, `clsx`, `tailwind-merge`.
  - `[STRUCTURAL]` `components.json` exists at the repo root (created by `npx shadcn@latest init`).
  - `[STRUCTURAL]` `tailwind.config.js` includes `content: ['./index.html', './src/**/*.{ts,tsx}']`.
  - `[STRUCTURAL]` `src/main.tsx` mounts a placeholder `<App />` (App component may be a stub here).

---
sub_spec_id: SS-02
phase: run
depends_on: ['SS-01']
dispatch: factory
---

### 2. Type definitions, defaults, and sample data

- **Scope:** Define all TypeScript types from design §6, §7, §10, and §16. Implement `defaultToolRollSettings` (§7.4), `sampleTools` (§38), and the `PAPER_SIZES_MM` constant (§16.1). Implement `inchesToMm` / `mmToInches` helpers and id generation.
- **Files (new):**
  - `src/generators/tool-roll/types.ts`
  - `src/generators/tool-roll/defaults.ts`
  - `src/utils/units.ts`
  - `src/utils/ids.ts`
  - `src/utils/formatting.ts`
  - `src/utils/download.ts`
  - `src/utils/units.test.ts`
  - `src/utils/ids.test.ts`
- **Files (modify):** none
- **Acceptance criteria:**
  - `[STRUCTURAL]` `src/generators/tool-roll/types.ts` exports: `UnitSystem`, `ToolItem`, `ToolRollProject`, `ToolRollSettings`, `ToolRollLayout`, `PanelShape`, `PocketPanelShape`, `Point`, `PocketLayout`, `StitchLine`, `FoldLine`, `HemLine`, `SeamAllowanceLine`, `Notch`, `TieMark`, `PatternLabel`, `DimensionLine`, `PatternWarning`, `PrintLayout`, `PrintTile`, `BoundingBox`, `SvgPathData`, enums `SortMode`, `PocketTopStyle`, `PocketHeightMode`, `FlapHeightMode`, `TiePlacementMode`, `PrintPaperSize`, `PrintOrientation`, `LabelMode`.
  - `[STRUCTURAL]` `src/generators/tool-roll/defaults.ts` exports `defaultToolRollSettings: ToolRollSettings` matching design §7.4 values exactly.
  - `[STRUCTURAL]` `src/generators/tool-roll/defaults.ts` exports `sampleTools: ToolItem[]` with the 4 wrenches from design §38.
  - `[STRUCTURAL]` `src/utils/units.ts` exports `PAPER_SIZES_MM`, `getPaperSize(size, orientation)`, `inchesToMm(value)`, `mmToInches(value)`.
  - `[BEHAVIORAL]` `npm test -- --run` passes: `inchesToMm(1) === 25.4`, `mmToInches(25.4) === 1`.
  - `[BEHAVIORAL]` `npm test -- --run` passes: `ids.ts` generates non-empty unique strings.
  - `[MECHANICAL]` `npm run build` exits 0.

---
sub_spec_id: SS-03
phase: run
depends_on: ['SS-02']
dispatch: factory
---

### 3. Geometry calculator and validation

- **Scope:** Implement the pure geometry layer. `calculatePocketWidth`, `calculatePocketDepth`, `sortTools`, `calculatePrintLayout`, `buildPocketPanelPath`, `buildBackPanelPath`, `calculateToolRollLayout`. Implement `validateTool`, `validateSettings`, `validateLayout`. Implement `generateConstructionNotes`. No React. Unit-tested with Vitest.
- **Files (new):**
  - `src/generators/tool-roll/geometry.ts`
  - `src/generators/tool-roll/geometry.test.ts`
  - `src/generators/tool-roll/calculateToolRollLayout.ts`
  - `src/generators/tool-roll/calculateToolRollLayout.test.ts`
  - `src/generators/tool-roll/validation.ts`
  - `src/generators/tool-roll/validation.test.ts`
  - `src/generators/tool-roll/constructionNotes.ts`
  - `src/generators/tool-roll/renderHelpers.ts`
- **Files (modify):** none
- **Acceptance criteria:**
  - `[STRUCTURAL]` `geometry.ts` exports `calculatePocketWidth`, `calculatePocketDepth`, `sortTools`, `calculatePrintLayout`, `buildPocketPanelPath`, `buildBackPanelPath` with signatures from design §35.
  - `[STRUCTURAL]` `calculateToolRollLayout.ts` exports `calculateToolRollLayout(tools, settings, units): ToolRollLayout`.
  - `[STRUCTURAL]` `validation.ts` exports `validateTool`, `validateSettings`, `validateLayout` returning `PatternWarning[]`.
  - `[BEHAVIORAL]` Vitest: `calculatePocketDepth({height: 100, visibleAmount: 30})` returns `70`.
  - `[BEHAVIORAL]` Vitest: `calculatePocketWidth` honors `minimumPocketWidth` floor.
  - `[BEHAVIORAL]` Vitest: `sortTools` produces correct order for each `SortMode` (test all 7 modes).
  - `[BEHAVIORAL]` Vitest: `calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm')` returns a `ToolRollLayout` with `patternWidth > 0`, `patternHeight > 0`, exactly 4 pockets, a `backPanel`, a `pocketPanel`, and a `flap`.
  - `[BEHAVIORAL]` Vitest: `validateTool({width: 10, height: 100, thickness: 0, visibleAmount: 100, ...})` returns a warning with severity `'error'` ("visibleAmount must be less than height").
  - `[BEHAVIORAL]` Vitest: `calculatePrintLayout` with a 600×350 mm pattern on Letter portrait + 12.7 mm margin + 12.7 mm overlap returns `columns ≥ 3`, `rows ≥ 2`.
  - `[MECHANICAL]` `npm test -- --run` exits 0.

---
sub_spec_id: SS-04
phase: run
depends_on: ['SS-02']
dispatch: factory
---

### 4. LocalStorage persistence and project state hook

- **Scope:** Implement debounced LocalStorage auto-save and load. Provide a top-level state hook (`useToolRollProject`) that exposes the current `ToolRollProject` and mutation methods (add/edit/duplicate/delete tool, move up/down, update settings, reset). Handle corrupted/missing storage gracefully (fallback to starter project from `sampleTools` + `defaultToolRollSettings`).
- **Files (new):**
  - `src/storage/localStorage.ts`
  - `src/storage/localStorage.test.ts`
  - `src/state/useToolRollProject.ts`
  - `src/state/useToolRollProject.test.ts`
- **Files (modify):** none
- **Acceptance criteria:**
  - `[STRUCTURAL]` `src/storage/localStorage.ts` exports `loadProject(): ToolRollProject | null`, `saveProject(p: ToolRollProject): void`, `clearProject(): void`, with the storage key `stitchsmith.tool-roll.v1`.
  - `[STRUCTURAL]` `src/state/useToolRollProject.ts` exports `useToolRollProject()` returning `{ project, setProject, addTool, updateTool, duplicateTool, deleteTool, moveToolUp, moveToolDown, updateSettings, resetProject, importProject }`.
  - `[BEHAVIORAL]` Vitest: corrupted LocalStorage (invalid JSON) does not throw; state falls back to starter project.
  - `[BEHAVIORAL]` Vitest: schema-mismatched data (missing `schemaVersion`) falls back to starter project.
  - `[BEHAVIORAL]` Vitest: `saveProject` is debounced (multiple rapid `setProject` calls collapse into a single storage write within 500 ms).
  - `[BEHAVIORAL]` Vitest: `saveProject` does NOT serialize any computed `ToolRollLayout` or SVG strings.
  - `[BEHAVIORAL]` Vitest: when `localStorage.setItem` throws (storage unavailable, e.g., Safari private mode), `saveProject` swallows the error, emits a one-time `console.warn`, and the app continues functioning in-memory only. The next read returns the in-memory project, not stale data.
  - `[STRUCTURAL]` On startup, if LocalStorage is unavailable or throws on access, `validateLayout` (or an equivalent UI-side warning) surfaces a `PatternWarning` with severity `'warning'` and a clear message ("Session won't persist — browser storage disabled").
  - `[MECHANICAL]` `npm test -- --run` exits 0.

---
sub_spec_id: SS-05
phase: run
depends_on: ['SS-01', 'SS-02']
dispatch: factory
---

### 5. shadcn vendor pass + base UI primitives

- **Scope:** Run `npx shadcn@latest add` for every primitive referenced in design §21.3: `button`, `input`, `label`, `select`, `switch`, `tabs`, `accordion`, `dialog`, `tooltip`, `card`, `table`, `textarea`. Vendor them into `src/components/ui/`. Also add `src/styles/pattern-svg.css` with the SVG class styles from design §29. Add the AppHeader and PageShell.
- **Files (new):**
  - `src/components/ui/button.tsx`
  - `src/components/ui/input.tsx`
  - `src/components/ui/label.tsx`
  - `src/components/ui/select.tsx`
  - `src/components/ui/switch.tsx`
  - `src/components/ui/tabs.tsx`
  - `src/components/ui/accordion.tsx`
  - `src/components/ui/dialog.tsx`
  - `src/components/ui/tooltip.tsx`
  - `src/components/ui/card.tsx`
  - `src/components/ui/table.tsx`
  - `src/components/ui/textarea.tsx`
  - `src/components/layout/AppHeader.tsx`
  - `src/components/layout/PageShell.tsx`
  - `src/styles/pattern-svg.css`
  - `src/lib/utils.ts`
- **Files (modify):**
  - `src/main.tsx` (wire up `<AppHeader />` + `<PageShell />` placeholder layout)
  - `src/index.css` (import `pattern-svg.css`)
- **Acceptance criteria:**
  - `[STRUCTURAL]` All 12 shadcn components exist under `src/components/ui/` and re-export their named primitives.
  - `[MECHANICAL]` After the shadcn vendor pass, verify all 12 files exist: `ls src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/label.tsx src/components/ui/select.tsx src/components/ui/switch.tsx src/components/ui/tabs.tsx src/components/ui/accordion.tsx src/components/ui/dialog.tsx src/components/ui/tooltip.tsx src/components/ui/card.tsx src/components/ui/table.tsx src/components/ui/textarea.tsx` exits 0.
  - `[STRUCTURAL]` `src/lib/utils.ts` exports `cn(...inputs)` using `clsx` + `tailwind-merge`.
  - `[STRUCTURAL]` `pattern-svg.css` defines `.pattern-cut-line`, `.pattern-stitch-line`, `.pattern-fold-line`, `.pattern-hem-line`, `.pattern-seam-line`, `.pattern-label` with strokes and dasharrays matching design §29.
  - `[STRUCTURAL]` `AppHeader.tsx` renders "StitchSmith — Tool Roll Generator" with import/export/reset buttons (handlers stubbed; wired in SS-08).
  - `[BEHAVIORAL]` `npm run dev` starts without console errors; visiting `http://localhost:5173` shows the header.
  - `[MECHANICAL]` `npm run build` exits 0.

---
sub_spec_id: SS-06
phase: run
depends_on: ['SS-03', 'SS-04', 'SS-05']
dispatch: factory
---

### 6. Tool table + settings panel + summary + warnings + construction notes

- **Scope:** Build the controls column: `ToolTable` with add/duplicate/delete/move-up/move-down per design §24, `ToolEditorRow` with inline validation, `ToolRollSettingsPanel` accordion with all sections from design §23, `PatternSummary` (§26), `WarningsPanel` (§27), `ConstructionNotes` (§32). Wire to `useToolRollProject`. No SVG preview yet.
- **Files (new):**
  - `src/components/tool-roll/ToolRollPage.tsx`
  - `src/components/tool-roll/ToolTable.tsx`
  - `src/components/tool-roll/ToolEditorRow.tsx`
  - `src/components/tool-roll/ToolRollSettingsPanel.tsx`
  - `src/components/tool-roll/PatternSummary.tsx`
  - `src/components/tool-roll/WarningsPanel.tsx`
  - `src/components/tool-roll/ConstructionNotes.tsx`
- **Files (modify):**
  - `src/main.tsx` (mount `<ToolRollPage />` inside `<PageShell />`)
- **Acceptance criteria:**
  - `[STRUCTURAL]` `ToolTable` renders columns: Order, Name, Width, Thickness, Height, Visible amount, Calculated pocket width, Calculated pocket depth, Actions.
  - `[STRUCTURAL]` `ToolEditorRow` validates each numeric field (non-negative, height > 0, visibleAmount < height) and shows inline error.
  - `[STRUCTURAL]` `ToolRollSettingsPanel` has accordion sections matching §23.1–§23.7 with every field listed.
  - `[STRUCTURAL]` `PatternSummary` displays pattern W×H, fabric cut size, tool counts, max pocket depth/widest/tallest, print page count.
  - `[STRUCTURAL]` `WarningsPanel` groups warnings by severity (info/warning/error).
  - `[STRUCTURAL]` `ConstructionNotes` renders an ordered list from `layout.constructionNotes`.
  - `[BEHAVIORAL]` Adding a tool updates summary live (Vitest with `@testing-library/react`).
  - `[BEHAVIORAL]` Toggling unit system between `mm` and `in` reformats displayed numbers without changing internal state.
  - `[MECHANICAL]` `npm test -- --run` exits 0.
  - `[MECHANICAL]` `npm run build` exits 0.

---
sub_spec_id: SS-07
phase: run
depends_on: ['SS-03', 'SS-05']
dispatch: factory
---

### 7. SVG renderer (FullPatternSvg + layer components)

- **Scope:** Implement the SVG render layer with correct layer ordering per design §28. Use mm dimensions and a matching viewBox. Toggle visibility based on `ToolRollSettings.show*` flags. Render labels (§30), dimension lines (§31), grid, tile grid overlay, finished/seam/hem/cut/stitch/fold lines, tie marks, notches.
- **Files (new):**
  - `src/components/svg/FullPatternSvg.tsx`
  - `src/components/svg/SvgGrid.tsx`
  - `src/components/svg/SvgTileGrid.tsx`
  - `src/components/svg/SvgLabels.tsx`
  - `src/components/svg/SvgDimensionLines.tsx`
  - `src/components/svg/FullPatternSvg.test.tsx`
- **Files (modify):** none
- **Acceptance criteria:**
  - `[STRUCTURAL]` `FullPatternSvg` accepts `{ layout, settings }` props and renders `<svg width="{patternWidth}mm" height="{patternHeight}mm" viewBox="0 0 {patternWidth} {patternHeight}">`.
  - `[STRUCTURAL]` Render order matches §28: background grid → tile grid → finished → seam/hem → cut → stitch → fold → tie → notches → labels → dimensions.
  - `[STRUCTURAL]` Toggling `showStitchLines` to `false` removes stitch line elements from the rendered output.
  - `[BEHAVIORAL]` Vitest snapshot or DOM query: rendering `FullPatternSvg` with `sampleTools` + `defaultToolRollSettings` produces an `<svg>` element with `width` ending in `mm` and at least one `<path>` for the back panel and one for the pocket panel.
  - `[BEHAVIORAL]` Vitest: when `flapEnabled: false`, no flap fold line is rendered.
  - `[MECHANICAL]` `npm test -- --run` exits 0.

---
sub_spec_id: SS-08
phase: run
depends_on: ['SS-04', 'SS-06', 'SS-07']
dispatch: factory
---

### 8. Pattern preview + Full SVG export + Project JSON I/O

- **Scope:** Build `PatternPreview` (pan/zoom, fit-to-screen, tile grid overlay toggle). Implement `exportFullSvg`, `exportProjectJson`, `parseProjectJson` per design §18–§19 and §37. Wire up the header's Import/Export/Reset buttons.
- **Files (new):**
  - `src/components/tool-roll/PatternPreview.tsx`
  - `src/components/tool-roll/ExportPanel.tsx`
  - `src/export/exportSvg.ts`
  - `src/export/exportSvg.test.ts`
  - `src/export/exportProjectJson.ts`
  - `src/export/importProjectJson.ts`
  - `src/export/importProjectJson.test.ts`
- **Files (modify):**
  - `src/components/layout/AppHeader.tsx` (wire Import/Export/Reset handlers to project state and exports)
  - `src/components/tool-roll/ToolRollPage.tsx` (add `<PatternPreview />` and `<ExportPanel />`)
- **Acceptance criteria:**
  - `[STRUCTURAL]` `exportFullSvg(layout, project)` serializes `<FullPatternSvg>` via `react-dom/server`'s `renderToStaticMarkup` and triggers download of `tool-roll-pattern-full.svg`.
  - `[STRUCTURAL]` The exported SVG starts with `<svg` and contains `xmlns="http://www.w3.org/2000/svg"`, `width="{N}mm"`, `height="{N}mm"`, embedded `<style>` block with the §29 CSS.
  - `[STRUCTURAL]` `exportProjectJson(project)` triggers download of `tool-roll-project.json` containing valid JSON with `schemaVersion: 1` and `generatorId: 'tool-roll'`.
  - `[STRUCTURAL]` `parseProjectJson(json)` throws an `Error` with a descriptive message on: invalid JSON, missing `schemaVersion`, wrong `generatorId`, missing `settings`, missing `tools` array, or `tools.length > 500` (sanity bound to prevent DoS via malicious file).
  - `[BEHAVIORAL]` Vitest: `parseProjectJson(JSON.stringify(validProject))` returns the project unchanged.
  - `[BEHAVIORAL]` Vitest: `parseProjectJson('{"foo":1}')` throws.
  - `[BEHAVIORAL]` Vitest: `parseProjectJson(JSON.stringify({ ...validProject, tools: new Array(501).fill(validProject.tools[0]) }))` throws with a message indicating the tool-count bound.
  - `[BEHAVIORAL]` Vitest: the rendered SVG contains the four sample pockets (e.g., DOM query finds 4 elements with text matching tool names when `labelMode === 'toolNames'`).
  - `[MECHANICAL]` `npm test -- --run` exits 0.

---
sub_spec_id: SS-09
phase: run
depends_on: ['SS-07', 'SS-08']
dispatch: factory
---

### 9. Tiled printable HTML export

- **Scope:** Implement `exportPrintableHtml(layout, project)` per design §15–§17. One HTML file with embedded CSS (`@page size: letter|a4 portrait|landscape; margin: 0`), one `.page` div per tile, each containing a page-sized SVG with translate transforms to crop the full pattern. Each page includes: page label, neighbor hints (tape-to-page-N hints where applicable), scale-check square (50 mm or 1 in), registration marks (crosshairs near corners), prominent "Print at 100%, do not scale to fit" banner.
- **Files (new):**
  - `src/components/svg/TileSvg.tsx`
  - `src/components/svg/TileOverlay.tsx`
  - `src/export/exportPrintableHtml.ts`
  - `src/export/exportPrintableHtml.test.ts`
- **Files (modify):**
  - `src/components/tool-roll/ExportPanel.tsx` (add "Export tiled printable HTML" button)
- **Acceptance criteria:**
  - `[STRUCTURAL]` `TileSvg` renders `<svg width="{paperW}mm" height="{paperH}mm" viewBox="0 0 {paperW} {paperH}">` containing the cropped pattern at the tile offset and a `TileOverlay`.
  - `[STRUCTURAL]` `TileOverlay` renders a 50 mm (or 25.4 mm if units = `'in'`) scale-check square, registration crosshairs near all four printable-area corners, page label "Tool Roll — Page N of M — Row R Col C", overlap text ("Overlap: 12.7 mm / 0.5 in"), and neighbor hints where adjacent tiles exist.
  - `[STRUCTURAL]` Output HTML contains exactly one `<style>` block with `@page { size: letter portrait; margin: 0; }` (or matching letter/a4 × portrait/landscape) and `.page { width: {paperW}mm; height: {paperH}mm; page-break-after: always; }`.
  - `[STRUCTURAL]` Output HTML body opens with a banner: `<div class="print-warning">Print at 100% — do not scale to fit. Verify the scale-check square measures exactly 50 mm (or 1 in) on the printed page before cutting fabric.</div>`. The banner is **visible by default in browser/screen view** (no `display: none` outside `@media print`); CSS hides it **only inside `@media print`** so it does not consume page space when printed.
  - `[BEHAVIORAL]` Vitest: the exported HTML CSS contains the rule `@media print { .print-warning { display: none } }` (or equivalent) AND does NOT contain any rule that hides `.print-warning` outside the print media query.
  - `[STRUCTURAL]` Output HTML appends an ordered construction-notes list after the last page.
  - `[BEHAVIORAL]` Vitest: rendering a layout with `patternWidth = 600 mm` and `patternHeight = 350 mm` on Letter portrait (printable 190.5 × 254.0 mm, overlap 12.7 mm) produces `layout.printLayout.columns >= 4` and `rows >= 2`.
  - `[BEHAVIORAL]` Vitest: the exported HTML string contains `N` `.page` divs equal to `layout.printLayout.pages.length`.
  - `[BEHAVIORAL]` Vitest: the SVG content inside each `.page` does NOT scale the pattern to fit (no `preserveAspectRatio="xMidYMid meet"` shrink and no scaling transform other than translate).
  - `[MECHANICAL]` `npm test -- --run` exits 0.

---
sub_spec_id: SS-10
phase: run
depends_on: ['SS-08', 'SS-09']
dispatch: factory
---

### 10. Generator registry + responsive polish + integration

- **Scope:** Define the `PatternGenerator` interface in `src/generators/index.ts` and register `toolRollGenerator`. Wire `App.tsx` end-to-end. Apply responsive Tailwind layout (desktop: two-column controls + preview; mobile: stacked per design §21.2). Add starter project loading on first run. Verify all Phase 1–6 acceptance criteria from design §39 pass against the running app. Write an integration test that mounts `<App />`, adds a tool, and verifies summary + preview update.
- **Files (new):**
  - `src/app/App.tsx`
  - `src/app/App.test.tsx`
  - `src/generators/index.ts`
  - `src/app/providers.tsx`
  - `INTEGRATION-evidence.md` (run-time evidence: screenshots/output describing manual Phase 1–6 verification)
- **Files (modify):**
  - `src/main.tsx` (mount `<App />`)
  - `src/components/tool-roll/ToolRollPage.tsx` (responsive grid classes)
  - `README.md` (deployment notes for Cloudflare Pages and GitHub Pages; supported browsers; "print at 100%" reminder)
- **Acceptance criteria:**
  - `[STRUCTURAL]` `src/generators/index.ts` exports `PatternGenerator<TSettings, TInput, TLayout>` interface and `toolRollGenerator` constant with `id: 'tool-roll'`.
  - `[STRUCTURAL]` `src/app/App.tsx` renders `<AppHeader />` + `<ToolRollPage />` and is the only component imported by `main.tsx`.
  - `[STRUCTURAL]` `ToolRollPage` uses Tailwind responsive utilities so layout is two-column on `md:` breakpoint and stacked below.
  - `[BEHAVIORAL]` `@testing-library/react` integration: mounting `<App />`, clicking "Add tool", entering values, and asserting the summary's tool count increments to 5 (4 starter + 1).
  - `[BEHAVIORAL]` `@testing-library/react` integration: clicking "Reset" restores starter project (`sampleTools`).
  - `[INTEGRATION] All Phase 1–6 acceptance criteria from design §39 pass.` Evidence captured in `INTEGRATION-evidence.md` with one bullet per phase listing the criterion and the result (Pass/Notes).
  - `[INTEGRATION]` Exported JSON round-trips: export → reset → import → state matches pre-export.
  - `[INTEGRATION]` Exported full SVG opens in a browser tab at correct dimensions (`width` and `height` attributes end in `mm`).
  - `[INTEGRATION]` Exported tiled HTML opens in a browser and the browser's Print Preview shows N pages matching `layout.printLayout.pages.length`.
  - `[MECHANICAL]` `npm run build` exits 0 and produces a `dist/` directory deployable as a static site.
  - `[MECHANICAL]` `npm test -- --run` exits 0.

## Edge Cases

- **Empty tool list:** UI shows starter project on first run; Reset restores it. Manually deleting all tools surfaces a `warning` ("no tools entered"); exports remain functional but produce an empty pattern.
- **Tool with `visibleAmount >= height`:** validation emits an `error`; tool row shows inline error; exports gated until resolved.
- **Pattern wider/taller than chosen paper:** print layout produces multiple tiles; preview shows tile grid overlay; summary shows page count.
- **Tile overlap >= printable area:** validation emits `error`; export gated.
- **`printMargin >= paperWidth/2`:** validation emits `error`; export gated.
- **LocalStorage corruption (invalid JSON):** caught at load; falls back to starter project; logs to console.
- **LocalStorage schema mismatch (missing `schemaVersion` or wrong `generatorId`):** treated as corruption.
- **Invalid JSON import:** surfaces a toast/dialog with the parse error; current project untouched.
- **Browser without `crypto.randomUUID`:** id generator falls back to `'tool-' + Math.random().toString(36).slice(2, 10)`.
- **User prints with "Fit to page":** mitigated by the persistent in-document banner, the per-page scale-check square, and the printed-construction-notes reminder. Cannot be eliminated entirely.
- **Unit-system mismatch on import:** project carries `units`; on import, displayed values match the project's units, internal storage stays mm.

## Out of Scope (v1)

- User accounts, authentication, cloud sync, backend, database.
- Offline / PWA service worker behavior.
- DXF, PDF, PNG exports (HTML + SVG only).
- Curve smoothing in pocket-top profile (sloped style ships as straight-line only, if at all; deferred to v1.1).
- Drag-and-drop reordering (move up/down only).
- Camera-based measurement; AI correction.
- Multi-pattern project files.
- Seamly / Valentina file format export.
- Roll diameter simulation for tie placement (enum value `basedOnRollDiameter` is defined but disabled in UI).
- Notch geometry beyond simple alignment ticks at panel seams.
- Binding construction logic (reference line only when `bindingAllowance > 0`).
- Additional generators (packing cube, zip pouch, etc.) — interface is defined; only `toolRollGenerator` ships in v1.

## Constraints

### Musts

- All internal geometry math lives in `src/generators/tool-roll/*.ts` — pure functions only, no React imports.
- All internal calculations and storage use millimeters; unit conversion happens only at the display boundary in `src/utils/units.ts` (and at user input parsing).
- Exported SVGs have physical `width`/`height` in `mm` and a matching `viewBox`.
- LocalStorage key is `stitchsmith.tool-roll.v1`; key changes require schema migration.
- `schemaVersion: 1` and `generatorId: 'tool-roll'` are written into every exported `ToolRollProject` and required on import.
- The printable HTML contains a prominent "Print at 100%, do not scale to fit" banner AND a scale-check square on every tile.
- shadcn/ui components are installed via the shadcn CLI; vendored copies live under `src/components/ui/`.

### Must-nots

- No npm dependency outside the design's recommended list without human approval.
- No PDF library, no canvas renderer.
- No backend, no database, no auth, no analytics/telemetry.
- No scaling of tiled-print SVGs to fit the page — only translate transforms for cropping.
- No serialization of computed `ToolRollLayout` or SVG strings into LocalStorage.
- No geometry math inside `src/components/` — that's an architectural violation.

### Preferences

- Prefer **shadcn vendored components** over custom UI primitives.
- Prefer **native handlers** (touch + wheel + pointer) for pan/zoom over an added dep.
- Prefer **`React.renderToStaticMarkup`** over a string-based SVG builder.
- Prefer **CSS classes via `src/styles/pattern-svg.css`** over inline SVG styles (use inline only when a value is dynamic).
- Prefer **minimal change sets** over architectural refactors when fixing a defect.
- Prefer **`Vitest` co-located unit tests** (`foo.test.ts` beside `foo.ts`) over a separate `__tests__/` directory unless a UI test pattern emerges in SS-06 or later.

### Escalation triggers

- A new npm dependency outside the recommended list is required.
- A change to `defaultToolRollSettings` defaults (sewing-domain values) is necessary.
- A change to any of design §11's geometry formulas is necessary.
- shadcn install fails or imposes a Tailwind v4 upgrade not in scope.
- Browser print testing exposes a scaling issue not solvable in CSS.
- The schema needs a breaking change (`schemaVersion: 2`).

## Verification

End-to-end verification = **Phase 1–6 acceptance criteria from design §39 all pass**, recorded in `INTEGRATION-evidence.md` (SS-10). Mechanical gates: `npm run build` exits 0; `npm test -- --run` exits 0 with all sub-spec test files passing; `npm run dev` starts without console errors and the app is interactive in Chrome and Firefox. The exported full SVG opens at correct dimensions in Inkscape (manual check, recorded). The exported tiled HTML, printed at 100% in Chrome on Letter, produces pages whose scale-check squares measure 50 mm with a ruler (manual check, recorded).

## Phase Specs

Refined by `/forge-prep` on 2026-05-20.

| Sub-Spec | Phase Spec |
|----------|------------|
| 1. Project scaffold (Vite + React + TS + Tailwind + shadcn) | `docs/specs/stitchsmith-tool-roll-generator/sub-spec-1-project-scaffold.md` |
| 2. Type definitions, defaults, and sample data | `docs/specs/stitchsmith-tool-roll-generator/sub-spec-2-types-defaults.md` |
| 3. Geometry calculator and validation | `docs/specs/stitchsmith-tool-roll-generator/sub-spec-3-geometry-calculator.md` |
| 4. LocalStorage persistence and project state hook | `docs/specs/stitchsmith-tool-roll-generator/sub-spec-4-localstorage-state.md` |
| 5. shadcn vendor pass + base UI primitives | `docs/specs/stitchsmith-tool-roll-generator/sub-spec-5-shadcn-vendor.md` |
| 6. Tool table + settings panel + summary + warnings + construction notes | `docs/specs/stitchsmith-tool-roll-generator/sub-spec-6-controls-ui.md` |
| 7. SVG renderer (FullPatternSvg + layer components) | `docs/specs/stitchsmith-tool-roll-generator/sub-spec-7-svg-renderer.md` |
| 8. Pattern preview + Full SVG export + Project JSON I/O | `docs/specs/stitchsmith-tool-roll-generator/sub-spec-8-preview-export.md` |
| 9. Tiled printable HTML export | `docs/specs/stitchsmith-tool-roll-generator/sub-spec-9-tiled-print.md` |
| 10. Generator registry + responsive polish + integration | `docs/specs/stitchsmith-tool-roll-generator/sub-spec-10-integration.md` |

Index: `docs/specs/stitchsmith-tool-roll-generator/index.md`
Contracts: `docs/specs/stitchsmith-tool-roll-generator/contracts.json`
Red-team report: `docs/specs/redteam-report.md`
