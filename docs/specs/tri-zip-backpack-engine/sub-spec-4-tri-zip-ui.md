---
type: phase-spec
sub_spec_id: SS-04
phase: run
wave: 3
depends_on: ['SS-02', 'SS-03']
dispatch: factory
master_spec: "docs/specs/2026-05-25-tri-zip-backpack-engine.md"
title: "Tri-Zip UI, landing-page wiring, ExportPanel"
---

# SS-04 — Tri-Zip UI

## Context

Build the Tri-Zip page, accordion settings, preview, and export panel. Replace the landing page's hardcoded `PATTERNS` array with a pattern registry. The `useTriZipProject` hook follows the same shape as the existing `useToolRollProject`. The factory worktree spawns from HEAD where `LandingPage.tsx` does not exist — list it as `(new)`.

## Scope

- 14 new files under `src/components/tri-zip-backpack/`.
- `useTriZipProject.ts` state hook in `src/state/`.
- `patternRegistry.ts` in `src/app/`.
- Modify `App.tsx` to switch via the registry.
- Create `LandingPage.tsx` (new from HEAD's perspective).
- ExportPanel consumes `lazy.ts` (SS-02) for PDF/DXF/tiledHtml; direct imports for SVG/cut-list/instructions.

## Files

- **Files (new):** see master SS-04 (18 files, including LandingPage.tsx).
- **Files (modify):** `src/app/App.tsx`.

## Interface Contracts

### PATTERNS (pattern registry)
- Direction: SS-04 → consumed by `LandingPage`, `App.tsx`
- Owner: SS-04
- Shape: `interface PatternRegistryEntry { id: string; title: string; description: string; available: boolean }` and `export const PATTERNS: PatternRegistryEntry[]`.
- File: `src/app/patternRegistry.ts`

### useTriZipProject (state hook)
- Direction: SS-04 → consumed by `TriZipPage`, `TriZipSettingsPanel`
- Owner: SS-04
- Shape: mirrors `useToolRollProject` — returns `{ project, updateInputs, setPreset, resetProject, importProject, storageWarning }`.
- File: `src/state/useTriZipProject.ts`

### Pattern (consumed)
- Direction: SS-03 → SS-04 (rendered by PatternPreview), SS-02 → SS-04 (exported by ExportPanel)
- Owner: SS-01 (defined), SS-03 (produced via `buildPattern`)
- Consumer: SS-04

## Implementation Steps (TDD)

### Step 1. Test: pattern registry shape

`src/app/__tests__/patternRegistry.test.ts`:
- `PATTERNS` is an array.
- Contains entries with `id === 'tool-roll'` and `id === 'tri-zip-backpack'`, both with `available: true`.

### Step 2. Implement patternRegistry.ts

Create the registry. Two entries.

### Step 3. Create LandingPage.tsx

The existing in-tree LandingPage was created during the brainstorm session but is not committed in HEAD. From the factory worktree's perspective this file is new. Implementation:

- Imports `PATTERNS` from `src/app/patternRegistry.ts`.
- Renders the cards (mirror the in-tree code: Card + ArrowRight icon, "Coming soon" tag for unavailable).
- `onSelect(id)` prop called when a card is activated.

### Step 4. Modify App.tsx to switch via registry

Replace the hardcoded `PATTERNS` constant with an import from `patternRegistry.ts`. View switching unchanged — accepts 'landing' | 'tool-roll' | 'tri-zip'. When the user clicks a tri-zip card, set view to 'tri-zip-backpack'. Render `<TriZipPage />` in that case.

### Step 5. Test: useTriZipProject loads + saves

`src/state/__tests__/useTriZipProject.test.ts`:
- Initial state has a default `TriZipInputs` and default style preset (`urban_assault`).
- `updateInputs({ height: 540 })` updates state and writes localStorage at key `stitchsmith.tri-zip-backpack.project`.
- `setPreset('hiking')` updates `stylePresetName`.
- `resetProject()` restores defaults.
- A new mounted hook restores from localStorage.

### Step 6. Implement useTriZipProject

Follow the pattern in `src/state/useToolRollProject.ts`. localStorage key: `stitchsmith.tri-zip-backpack.project`.

### Step 7. Test: TriZipPage renders with live volume readout

`src/components/tri-zip-backpack/__tests__/TriZipPage.test.tsx`:
- Renders the settings accordion with 9 collapsible sections.
- Style + Dimensions block always visible.
- Volume readout displays `H × W × D / 1000` (mm) — initial default e.g. "20.4 L" for 510×300×200 (mm) → 30.6 L. Adjust based on chosen defaults.
- Changing the height input updates the volume readout.

### Step 8. Build TriZipSettingsPanel.tsx

Use `@/components/ui/accordion`. Always-visible top block: style preset select + height/width/depth inputs + units select + computed-volume readout. Below: 9 collapsible sections, each a component in `sections/`.

### Step 9. Implement each section component

`sections/StyleAndDimensionsSection.tsx`, `TriZipGeometrySection.tsx`, `ZipperSystemSection.tsx`, `BackPanelSection.tsx`, `ShoulderStrapsSection.tsx`, `SternumHipSection.tsx`, `TopHandleSection.tsx`, `CompressionSection.tsx`, `FrameSheetSection.tsx`, `LaptopSleeveSection.tsx`. Each is a thin form panel bound to the relevant inputs slice. Use shadcn `Input`, `Label`, `Select`, `Switch` primitives.

### Step 10. Implement PatternPreview

`PatternPreview.tsx`. Calls `buildPattern(inputs, preset)` (memoized). Renders SVG via `exportSvg`. Pan/zoom UI follows the Tool Roll `PatternPreview` pattern.

### Step 11. Test: invalid inputs disable export + show warnings

`__tests__/TriZipPage.test.tsx` (additional case):
- Setting `height: -1` produces a per-field error in the WarningsPanel area.
- All export buttons are disabled.

### Step 12. Implement input validation surfacing

Bind `validateInputs` from SS-03. Render errors in a Warning area (component or simple list). Disable export buttons via prop based on validity.

### Step 13. Implement ExportPanel

`ExportPanel.tsx`. Six buttons:
- **SVG** — direct import of `exportSvg` → download via blob URL.
- **Print HTML** — `loadTiledHtmlExporter()` → `exportTiledHtml` → open new window with the HTML.
- **PDF** — `loadPdfExporter()` → `exportPdf(pattern, { paperSize: 'letter' })` → download PDF blob.
- **DXF** — `loadDxfExporter()` → `exportDxf(pattern)` → download as `.dxf`.
- **Cut List** — `computeCutList(pattern)` → render `<CutListTable />` modal or section + offer CSV download.
- **Instructions** — `compile(pattern.steps)` (from SS-01 engine) → open new window or download `.md`.
- **Save Project** — `exportProjectJson({ schemaVersion: 2, generatorId: 'tri-zip-backpack', inputs, stylePresetName })` → download `.json`.
- **Import** (file picker) — `importProjectJson` → on ok, update state; on err, surface friendly error including the cross-generator switch case.

### Step 14. Test: ExportPanel uses lazy façade for PDF/DXF/tiledHtml

`__tests__/ExportPanel.test.tsx`:
- ExportPanel.tsx contains `loadPdfExporter`, `loadDxfExporter`, `loadTiledHtmlExporter` imports from `@/lib/pattern-engine/exports/lazy`.
- Does NOT statically import `pdf.ts`, `dxf.ts`, `tiledHtml.ts`.

### Step 15. Test: import friendly-error for wrong generator

`__tests__/ExportPanel.test.tsx` (additional case):
- Importing a JSON with `generatorId: 'tool-roll'` surfaces a "This project is a Tool Roll — switch to that generator to load it" message and does not corrupt state.

### Step 16. Build CutListTable component

`CutListTable.tsx`. Renders the `{ byMaterial, byHardware }` result from `computeCutList`. CSV download button uses `toCsv` helper.

### Step 17. Build + bundle-size check

`npm run build`. Check bundle output. Main bundle ≤ 350 KB gzipped. PDF, DXF, tiledHtml in separate lazy chunks. If over budget, escalate per the spec's MN4 / ET4.

### Step 18. App.test.tsx still passes

The existing top-level `src/app/App.test.tsx` checks the landing flow and Tool Roll behavior. It must continue to pass with the registry refactor.

### Step 19. Commit

```bash
git add src/components/tri-zip-backpack src/state/useTriZipProject.ts src/app/patternRegistry.ts src/app/App.tsx src/components/landing/LandingPage.tsx
git commit -m "feat(tri-zip): UI with accordion settings, ExportPanel, landing-page registry [SS-04]"
```

## Verification Commands

- `npm test -- --run`
- `npm run build` + inspect bundle sizes
- `npm run dev` and manually exercise the page (HUMAN REVIEW)

## Checks

| Criterion | Type | Command |
|---|---|---|
| patternRegistry exports PATTERNS | STRUCTURAL | `grep -q "export const PATTERNS" src/app/patternRegistry.ts \|\| (echo "FAIL: PATTERNS missing" && exit 1)` |
| LandingPage consumes registry | STRUCTURAL | `grep -q "patternRegistry" src/components/landing/LandingPage.tsx \|\| (echo "FAIL: LandingPage not consuming registry" && exit 1)` |
| TriZipSettingsPanel uses Accordion | STRUCTURAL | `grep -q "Accordion" src/components/tri-zip-backpack/TriZipSettingsPanel.tsx \|\| (echo "FAIL: Accordion missing in settings panel" && exit 1)` |
| ExportPanel lazy-loads PDF | STRUCTURAL | `grep -q "loadPdfExporter" src/components/tri-zip-backpack/ExportPanel.tsx \|\| (echo "FAIL: ExportPanel not using lazy PDF" && exit 1)` |
| ExportPanel does not statically import pdf-lib | MECHANICAL | `! grep -q "from ['\"]pdf-lib['\"]" src/components/tri-zip-backpack/ExportPanel.tsx \|\| (echo "FAIL: ExportPanel statically imports pdf-lib" && exit 1)` |
| useTriZipProject hook exists | STRUCTURAL | `test -f src/state/useTriZipProject.ts \|\| (echo "FAIL: useTriZipProject missing" && exit 1)` |
| Full tests pass | MECHANICAL | `npm test -- --run 2>&1 \| tail -1; [ ${PIPESTATUS[0]} -eq 0 ] \|\| (echo "FAIL: tests" && exit 1)` |
| Build succeeds | MECHANICAL | `npm run build \|\| (echo "FAIL: build" && exit 1)` |

## Acceptance Criteria (from master SS-04)

All criteria from master SS-04 apply. Notable items added by red-team:
- Invalid inputs surface per-field WarningsPanel messages and disable exports.
- ExportPanel uses `lazy.ts` façade for PDF/DXF/tiledHtml.

## Escalation Triggers

- Main bundle > 350 KB gzipped after this sub-spec lands.
- A section's required parameter isn't expressible without a new engine primitive.
