---
date: 2026-05-20
topic: "StitchSmith — Tool Roll Pattern Generator (v1)"
author: Caleb Bennett
status: evaluated
evaluated_date: 2026-05-20
tags:
  - design
  - stitchsmith
  - tool-roll-generator
  - sewing-patterns
---

# StitchSmith — Tool Roll Pattern Generator (v1) — Design

## Summary

StitchSmith is a single-page, fully client-side React/TypeScript/Vite application that generates custom sewing patterns from measured input. The first module, the **Tool Roll Generator**, takes per-tool measurements (width, thickness, height, visible amount) and outputs a printable, tiled, full-size sewing pattern — including back panel, pocket panel, flap, stitch lines, hems, seam allowances, labels, and construction notes. The app is static-hostable (Cloudflare Pages, GitHub Pages), persists state via LocalStorage, and supports JSON import/export for backup and sharing. The architecture treats sewing patterns as generated geometry — pure TypeScript calculator functions produce a layout model, which an SVG renderer consumes for preview and export.

## Approach Selected

**Generated-geometry, pure-function calculator with SVG rendering.** Tool measurements + settings flow into pure TS functions that produce a `ToolRollLayout` model; React components only render that model. This keeps geometry math out of UI code, makes the calculator independently testable, and creates a clean seam for future generator modules (packing cubes, zip pouches, stuff sacks, etc.) via a shared `PatternGenerator<TSettings, TInput, TLayout>` interface.

Rationale: the alternative — embedding geometry in components or using canvas — would be harder to test, harder to export at real-world dimensions, and harder to extend to additional pattern types. Pure functions + SVG with millimeter units gives exact-size export to Inkscape/Illustrator and tiled printing without scaling errors.

## Architecture

```
┌──────────────────────────────────────────────────────────────┐
│  React UI Shell (StitchSmith)                                │
│  ┌──────────────────────┐  ┌──────────────────────────────┐  │
│  │ Controls / Tool Table│  │ Pattern Preview (SVG)        │  │
│  │ Settings Accordion   │  │ Summary / Warnings / Export  │  │
│  └──────────┬───────────┘  └──────────────▲───────────────┘  │
│             │                              │                  │
│             ▼                              │                  │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Pure TS Generator Layer (no React)                  │    │
│  │  tools + settings ─► calculateToolRollLayout(...)    │    │
│  │                       │                              │    │
│  │                       ▼                              │    │
│  │              ToolRollLayout (render-ready model)     │    │
│  └──────────────────────┬───────────────────────────────┘    │
│                         │                                     │
│                         ▼                                     │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  SVG Renderer Layer                                  │    │
│  │  FullPatternSvg │ TileSvg │ Labels │ Dimensions      │    │
│  └────┬─────────────────────────────────────────────────┘    │
│       │                                                       │
│       ▼                                                       │
│  ┌──────────────────────────────────────────────────────┐    │
│  │  Storage & Export                                    │    │
│  │  LocalStorage │ JSON I/O │ Full SVG │ Tiled HTML     │    │
│  └──────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────┘
```

**Layers:**
- **UI Shell** (React + shadcn/ui + Tailwind) — controls, tool table, settings, preview, exports
- **Generator Layer** (pure TS, framework-agnostic) — sorting, geometry, layout, validation, construction notes
- **SVG Renderer** — consumes layout model, produces SVG fragments for preview and exports
- **Storage & Export** — LocalStorage persistence (debounced), JSON import/export, full SVG download, tiled printable HTML

**Tech stack:** React + TypeScript + Vite + Tailwind CSS + shadcn/ui (Radix primitives) + lucide-react icons. Optional: jszip, file-saver. No PDF library in v1 unless trivial.

## Components

### UI Components (`src/components/`)

- **`AppHeader`** — app name (StitchSmith), module name (Tool Roll Generator), subtitle, Import/Export JSON, Reset buttons.
- **`ToolRollPage`** — top-level page composition (header + controls column + preview column on desktop; stacked on mobile).
- **`ToolTable` / `ToolEditorRow`** — tool list with columns (Order, Name, Width, Thickness, Height, Visible, computed Pocket W/D, Actions). Owns add/duplicate/delete/move up/down. Inline validation per row.
- **`ToolRollSettingsPanel`** — accordion: Units/Sorting, Pocket, Seam/Hems, Flap, Tie, Print, Display Options.
- **`PatternPreview`** — pan/zoom SVG container; fit-to-screen; tile grid overlay toggle.
- **`PatternSummary`** — computed totals (pattern W×H, fabric cut size, tool counts, max pocket depth, page count).
- **`WarningsPanel`** — info/warning/error from validation; errors block exports.
- **`ConstructionNotes`** — dynamically generated step list reflecting current settings.
- **`ExportPanel`** — buttons for Full SVG, Tiled HTML, Project JSON.

### SVG Components (`src/components/svg/`)

- **`FullPatternSvg`** — composes the full layout in correct layer order (grid → tile grid → finished → seam/hem → cut → stitch → fold → tie → notches → labels → dimensions).
- **`TileSvg`** — page-sized SVG with translate transforms to crop full pattern; adds overlay (page label, scale check, registration marks, neighbor hints).
- **`SvgGrid`, `SvgLabels`, `SvgDimensionLines`** — atomic render helpers.

### Pure Generator (`src/generators/tool-roll/`)

- **`types.ts`** — `ToolItem`, `ToolRollSettings`, `ToolRollProject`, `ToolRollLayout`, `PanelShape`, `PocketPanelShape`, `PocketLayout`, `StitchLine`/`FoldLine`/`HemLine`/`SeamAllowanceLine`, `Notch`, `TieMark`, `PatternLabel`, `DimensionLine`, `PatternWarning`, `PrintLayout`, `PrintTile`, enums (`SortMode`, `PocketTopStyle`, `PocketHeightMode`, `FlapHeightMode`, `TiePlacementMode`, `PrintPaperSize`, `PrintOrientation`, `LabelMode`, `UnitSystem`).
- **`defaults.ts`** — `defaultToolRollSettings`, `sampleTools`.
- **`calculateToolRollLayout.ts`** — entry point. Owns: sort → per-pocket width/depth → X positions → Y positions → pocket profile (stepped/sloped) → panel paths → flap height → tie placement → print layout → warnings → construction notes.
- **`geometry.ts`** — `calculatePocketWidth`, `calculatePocketDepth`, `sortTools`, `calculatePrintLayout`, `buildPocketPanelPath`, `buildBackPanelPath`, paper-size helpers.
- **`validation.ts`** — `validateTool`, `validateSettings`, `validateLayout`.
- **`constructionNotes.ts`** — `generateConstructionNotes`.
- **`renderHelpers.ts`** — small helpers used by both renderer and generator (e.g., label formatting).

### Generator Registry (`src/generators/index.ts`)

- `PatternGenerator<TSettings, TInput, TLayout>` interface.
- Exports `toolRollGenerator` instance.
- Future modules register here without UI restructure.

### Export & Storage (`src/export/`, `src/storage/`)

- **`exportSvg.ts`** — `exportFullSvg(layout, project)` writes `tool-roll-pattern-full.svg` with embedded CSS, mm dimensions, viewBox.
- **`exportPrintableHtml.ts`** — `exportPrintableHtml(layout, project)` writes `tool-roll-pattern-printable.html` with print CSS, `@page` rules, one `.page` div per tile, registration marks, scale check, neighbor hints.
- **`exportProjectJson.ts` / `importProjectJson.ts`** — JSON round-trip with schema validation (`schemaVersion: 1`, `generatorId: 'tool-roll'`, settings + tools).
- **`storage/localStorage.ts`** — debounced (300–500 ms) auto-save under key `stitchsmith.tool-roll.v1`; load on startup; reset clears.

### Utils (`src/utils/`)

- `units.ts` — `inchesToMm`, `mmToInches`, display formatters.
- `ids.ts` — id generation for tools and layout entities.
- `formatting.ts` — number/dimension formatting per unit system.
- `download.ts` — `downloadTextFile(name, content, mime)`.

## Data Flow

1. **Input** — user adds/edits tools in `ToolTable`; adjusts `ToolRollSettingsPanel`. All numeric input normalized to millimeters internally (UI may display inches).
2. **State** — `ToolRollProject` state held in a top-level provider/hook. Mutations flow through reducer-style updates.
3. **Persistence** — every state change debounced into LocalStorage as the serialized `ToolRollProject` (excluding generated SVG strings).
4. **Computation** — on each state change, `calculateToolRollLayout(tools, settings, units)` runs synchronously (pure, fast). Output: `ToolRollLayout`.
5. **Validation** — `validateTool`, `validateSettings`, `validateLayout` produce `PatternWarning[]` merged into the layout for the `WarningsPanel` and to gate exports.
6. **Render** — `PatternPreview` consumes layout via `FullPatternSvg`; `PatternSummary` reads computed dimensions/counts; `ConstructionNotes` reads `layout.constructionNotes`.
7. **Export paths:**
   - **Full SVG:** serialize `FullPatternSvg` to string with embedded CSS, mm dimensions → `downloadTextFile`.
   - **Tiled HTML:** iterate `layout.printLayout.pages`, emit one `.page` div per tile containing `TileSvg`; wrap in HTML doc with `@page` rules + print instructions + construction notes → `downloadTextFile`.
   - **JSON:** serialize `ToolRollProject` → `downloadTextFile`.
8. **Import** — user picks JSON file → parse → schema-validate → replace current project → re-derive layout.

**Coordinate system:** SVG (X right, Y down, origin top-left). Pattern stack from top: flap region → back panel body → pocket panel.

**Key formulas** (locked from spec):
- `pocketDepth = tool.height - tool.visibleAmount`
- `pocketWidth = max(tool.width + 2*sideGap + thickness*thicknessEaseFactor, minimumPocketWidth)`
- `pocketBottomY = flapHeight + topMargin + maxPocketDepth + pocketBottomAllowance`
- `bodyHeight = topMargin + maxToolHeight + bottomMargin`
- `backPanelHeight = flapEnabled ? flapHeight + bodyHeight : bodyHeight`
- Tile layout: `stepX = printableWidth - tileOverlap; columns = ceil((patternWidth - tileOverlap) / stepX)` (rows analogous).

## Error Handling

**Validation severities:** `info` (FYI), `warning` (visible, non-blocking), `error` (blocks export of affected artifact).

**Tool-level checks:**
- width ≤ 0 → error
- height ≤ 0 → error
- thickness < 0 → error
- visibleAmount < 0 → error
- visibleAmount ≥ height → error ("tool would not be retained")
- missing name → warning

**Settings-level checks:**
- seamAllowance = 0 → info
- minimumPocketWidth ≤ 0 → warning
- thicknessEaseFactor < 0 → warning
- printMargin ≥ paperWidth/2 or paperHeight/2 → error ("no usable printable area")
- tileOverlap ≥ printableWidth or printableHeight → error

**Layout-level checks:**
- No tools entered → warning ("add at least one tool")
- Pattern width or height exceeds some threshold (e.g., > 1500 mm) → warning ("pattern very large; many print pages")
- Any pocket width forced up to minimum → info per pocket
- Flap disabled with tall tools (visibleAmount > 40 mm on any tool) → warning ("tall tools may fall out without flap")
- Pocket panel cut height ≤ 0 → error

**Import errors:**
- Invalid JSON → user-facing error toast, current project preserved
- Wrong `schemaVersion` or missing `generatorId` → error toast with reason
- Settings/tools shape mismatch → error toast, no partial apply

**Export gating:** Any layout `error` blocks Full SVG, Tiled HTML, and JSON-with-current-state exports. JSON export of a stored project (without re-validation) remains available so users can rescue broken state.

**SVG rendering safety:** all geometry runs in pure TS before render; renderer treats layout as data and never throws on unexpected values (it renders empty groups instead).

**LocalStorage corruption:** on parse failure at startup, log to console, drop bad data, restore starter project (`sampleTools` + `defaultToolRollSettings`).

## Success Criteria

Carried forward from spec Phases 1–6 acceptance criteria:

**Phase 1 — Core calculator & UI:** add/edit/duplicate/delete tools; unit toggle; gap/seam/hem/visible inputs; sorting per `SortMode`; live computed pocket W/D; live summary; LocalStorage persistence.

**Phase 2 — SVG preview:** back panel, pocket panel, divider stitch lines, fold/hem/stitch lines, labels, warnings; live updates.

**Phase 3 — Seam/hem detail:** pocket top hem included in pocket cut shape; back panel seam line; flap hem/seam lines; toggles for cut/stitch/hem/seam visibility; construction notes reflect settings.

**Phase 4 — Full SVG + JSON:** export real-dimension SVG (mm); JSON export and import (with validation); SVG opens correctly in browser/Inkscape.

**Phase 5 — Tiled printable export:** Letter/A4, portrait/landscape; row/col/page count math; tile grid overlay in preview; printable HTML with page label, overlap, scale check square, registration marks; prints actual size at 100%.

**Phase 6 — Polish:** responsive desktop/mobile layout; sample starter project; reset works; warnings useful; construction notes readable; deployable as static site.

## Exclusions

Locked from spec §40 (v1 non-goals):

- User accounts / cloud sync / backend / database
- Offline/PWA behavior
- DXF export
- True PDF generation (unless trivial later)
- Complex curve smoothing
- Fabric nesting optimization
- Drag-and-drop tool reordering (move up/down only in v1)
- Camera-based measurement
- AI-assisted correction
- Multi-pattern project files
- Seamly / Valentina file export
- Roll diameter simulation for tie placement (v1 supports `centered` and `manual`; `basedOnRollDiameter` is stubbed/disabled)

Also explicitly deferred:
- Sloped pocket top style — may land in v1.1; v1 ships `stepped` as default and only attempts `sloped` if straight-line implementation is trivial. No curves.
- Binding construction logic — show reference line if `bindingAllowance > 0`, no further behavior.
- Notches as a first-class construction aid — model exists in layout but v1 only emits basic side/bottom alignment notches; full notch logic deferred.

## Open Questions

1. **Sloped pocket top in v1 vs v1.1?** Spec leaves it optional. Recommend shipping v1 with stepped only and adding sloped (straight-line connection between pocket tops) as an early v1.1 toggle. Confirm before specing.
2. **Print HTML iframe vs new tab vs blob download?** Spec says `downloadTextFile`. Confirm download is the preferred UX vs opening a new tab where the user can immediately invoke browser Print.
3. **Tie placement `basedOnRollDiameter` — disabled or visible?** v1 non-goal, but the enum value exists. Hide from UI or show as disabled with a tooltip explaining "v1.1"?
4. **Mobile preview pan/zoom library?** Native SVG with touch handlers vs a small dependency (e.g., panzoom). Recommend native handlers to avoid runtime weight.
5. **shadcn install workflow.** shadcn components are copy-in, not npm packages. Confirm the install step uses `npx shadcn@latest add ...` after Tailwind init, and that we vendor only the components in §21.3.
6. **Embedded font in exported SVG.** Spec says "no external font dependency"; default to Arial. Confirm acceptable for v1 (vs embedding a small font subset).

## Approaches Considered

- **A. Pure-function calculator + SVG render (SELECTED).** Geometry isolated from React; SVG output at mm dimensions; trivially testable; clean extension point for future generators. Cons: requires up-front layered architecture; tiled HTML print requires care with `@page` and unscaled SVG.
- **B. React-component-driven geometry.** Compute pocket positions inside components. Faster to prototype; couples math to render; harder to test; awkward for full-size SVG export. Rejected — the spec explicitly forbids geometry in components, and reuse for future modules suffers.
- **C. Canvas (2D) renderer with PDF export library.** Canvas is well-supported and PDFs print exact-size. But canvas loses vector fidelity, complicates Inkscape/Illustrator workflows, and adds a heavy dependency. SVG + tiled-HTML print is lighter and matches the spec's design philosophy. Rejected.

Selected A because it matches the spec's explicit "treat patterns as generated geometry" mandate, keeps the bundle small (no PDF lib), and gives a clean seam for adding packing cubes, zip pouches, stuff sacks, tool aprons, and roll-top bags later.

## Commander's Intent

**Desired End State:** A deployed static site (Cloudflare Pages or GitHub Pages) where a maker enters per-tool measurements, sees a live SVG preview of a complete tool-roll pattern (back panel, pocket panel, flap, hems, seam allowances, stitch lines, labels), and downloads (a) a real-dimension full-size SVG, (b) a tiled printable HTML for Letter or A4 paper, and (c) a JSON backup. Printed output, taped together at 100% print scale, matches the on-screen dimensions to within ±0.5 mm per page edge. State persists across page reloads via LocalStorage. All Phase 1–6 acceptance criteria from the original spec pass.

**Purpose:** Hand makers a free, browser-based, no-account tool to forge custom MYOG sewing patterns without paid CAD software or hand-drafting. v1 ships the Tool Roll Generator; the same chassis will host packing-cube, zip-pouch, stuff-sack, and roll-top-bag generators in v1.x without UI restructure.

**Constraints:**
- **MUST** keep all geometry math in pure TypeScript functions under `src/generators/` — React components are render-only. (Spec §4 Design Philosophy.)
- **MUST** store and compute in millimeters internally; UI display toggles inches/mm only at presentation layer.
- **MUST** emit SVG with physical `width`/`height` in `mm` and a `viewBox` matching internal coordinates. Browser print at 100% must produce actual-size output.
- **MUST** be fully static — no backend, no auth, no cloud sync, no database, no required runtime network.
- **MUST NOT** scale tiled-print SVGs to fit page — tile cropping is the only spatial transform.
- **MUST NOT** silently overwrite user state on import — schema-validate first, surface errors via toast/dialog.
- **MUST NOT** introduce dependencies that prevent static hosting (no Node server, no `getServerSideProps`-style runtime fetch).
- **MUST** keep the bundle under ~500 KB gzipped where reasonable — no PDF library in v1 unless trivial; prefer printable HTML.
- **MUST** include a prominent "Print at 100%, do not scale to fit" warning in the printable HTML and a per-page scale-check square.
- **MUST NOT** persist generated SVG strings or layout models in LocalStorage — recompute from project + settings on load.

**Freedoms (the implementing agent MAY):**
- Pick the LocalStorage debounce value within the spec'd 300–500 ms band.
- Choose component composition inside any single feature area (e.g., how `ToolRollSettingsPanel` internally arranges accordion items) as long as the §23 field list is covered.
- Decide pan/zoom implementation for the preview (native handlers vs. a tiny dep) — but justify in a code comment if a dep is added.
- Define internal helper function signatures inside `geometry.ts`, `validation.ts`, `constructionNotes.ts` as long as the exported function signatures in spec §35 are preserved.
- Pick label string wording where the spec gives an example (e.g., "Top flap fold line", "Tie/strap placement") — semantically equivalent strings are fine.
- Choose unit test scaffolding within Vitest's defaults; no need to introduce a separate test harness.
- Inline SVG styles vs. CSS classes per render layer — spec §29 recommends classes but components may inline where dynamic values demand it.

## Execution Guidance

**Observe (signals to monitor during implementation):**
- `npm run build` exits 0 with no TS errors.
- `npm test -- --run` exits 0 (Vitest).
- The dev server (`npm run dev`) renders the app without console errors.
- After any change to a calculator function, the corresponding unit test in `src/generators/tool-roll/*.test.ts` still passes.
- After any geometry change, the SVG preview's dimensions match the layout summary numerically (cross-check `patternWidth`/`patternHeight` against the rendered `<svg>` `width`/`height`).
- Bundle size after `npm run build` — `dist/assets/*.js` should stay well under ~500 KB gzipped.

**Orient (context the executing agent must maintain):**
- Architecture: three layers — React UI, pure-function generator, SVG renderer. Geometry math NEVER leaks into components.
- Units: all internal state and calculations in mm. Only `units.ts` converts to/from inches.
- File layout (spec §34) is the contract — do not move files between `src/generators/`, `src/components/`, `src/export/`, `src/storage/`, `src/utils/`.
- Function signatures in spec §35 and §37 are public contracts of each module — preserve names and types.
- `ToolRollSettings`/`ToolItem`/`ToolRollLayout` types in spec §7 and §10 are the schema — additions allowed only via new optional fields.
- shadcn/ui components are copy-in (`npx shadcn@latest add <name>`), NOT npm packages — they land in `src/components/ui/`.
- Tailwind config: v3 is the default plan; if v4 is installed at scaffold time, factor for CSS-variable `@theme inline` syntax.
- LocalStorage key: `stitchsmith.tool-roll.v1` (note: spec §20 says `pattern-forge.tool-roll.v1`; design renamed to StitchSmith — use `stitchsmith.tool-roll.v1` everywhere).
- Schema version: serialized projects always carry `schemaVersion: 1` and `generatorId: 'tool-roll'`. Imports without these fields are rejected.

**Escalate (stop and ask) when:**
- A new npm dependency outside the spec's recommended list is needed.
- The geometry of any of the §11 formulas would have to change to make a Phase work (e.g., pocket Y placement formula is incorrect for sloped style).
- The schema needs a breaking change (i.e., `schemaVersion: 2`) — bumping the schema affects import logic and starter data.
- The seam-allowance/hem defaults in `defaultToolRollSettings` (spec §7.4) would need to change to make the pattern correct — these are sewing-domain values and require human approval.
- Browser print testing reveals scaling errors that cannot be resolved by tightening CSS — may require fundamentally different print approach.
- shadcn install fails or its Tailwind version assumption mismatches the project's installed Tailwind.

**Shortcuts (apply without deliberation):**
- Use the **shadcn CLI** for every UI primitive (`Button`, `Input`, `Card`, `Tabs`, `Accordion`, `Dialog`, `Tooltip`, `Switch`, `Select`, `Label`, `Table`, `Textarea`). Don't write them from scratch.
- Use **Vitest + @testing-library/react** for tests. Place pure-function tests next to the source (e.g., `geometry.test.ts` beside `geometry.ts`); place component tests in `__tests__/` if a UI test pattern emerges.
- Use **`React.renderToStaticMarkup`** (from `react-dom/server`) to serialize SVG components to strings for full-SVG and printable-HTML export. Do not write a separate string-based SVG builder.
- Use **`URL.createObjectURL(new Blob([...]))`** + a synthetic `<a download>` click for all file downloads — no `file-saver` dependency unless something fails.
- Use **`crypto.randomUUID()`** for `ToolItem.id` and other ids generated client-side — wrap in `utils/ids.ts` so we can swap if browser support pinches.
- Format numbers for display with `Intl.NumberFormat` set to user's locale with 1–2 fraction digits depending on unit (mm → 1, inches → 2).
- Use **CSS classes via Tailwind utilities for shadcn**; use SVG-specific classes (`.pattern-cut-line`, `.pattern-stitch-line`, etc., per spec §29) in a single `src/styles/pattern-svg.css` imported once.
- Stick to **Letter portrait + 12.7 mm overlap + 12.7 mm margin** as the dev-loop default for tiled-print testing — change settings later for QA.
- Place sample data in `src/generators/tool-roll/defaults.ts` and load it on first run when LocalStorage is empty.

## Decision Authority

**Agent decides autonomously:**
- Internal helper function names and signatures inside `geometry.ts`, `validation.ts`, `constructionNotes.ts`, `renderHelpers.ts` (so long as the spec §35/§37 exported signatures are preserved).
- React component composition inside a single feature area (settings panel layout, table column order beyond what spec §24 lists, summary card arrangement).
- Test organization within Vitest defaults.
- Tailwind class choices and spacing scale.
- LocalStorage debounce value in the 300–500 ms band.
- Variable naming, file naming for non-exported utilities.
- Error message wording in toasts/dialogs (consistency of tone aside).
- Choice of whether to inline an SVG style attribute vs. a CSS class for a given render layer.

**Agent recommends, human approves:**
- Adding any npm dependency not in the spec's recommended list (especially anything > 20 KB gzipped).
- Tailwind v3 vs v4 decision if scaffold-time install gives v4.
- Whether to ship `sloped` pocket top in v1 or defer to v1.1.
- Whether to include or hide the `basedOnRollDiameter` tie-placement enum value in the UI.
- Adding a third export format (e.g., PNG, DXF) beyond spec §15.
- Changes to the `PatternGenerator<TSettings, TInput, TLayout>` interface — affects future modules.
- Bumping `schemaVersion` to 2 for any reason.
- Using a JS map projection / curve-smoothing library (rejected by spec §40).

**Human decides:**
- Default `ToolRollSettings` values (seam allowance, hem allowance, side gap, ease factor, etc.) — these are sewing-domain decisions, not engineering decisions.
- UX wording on the print-at-100% warning (this is the single highest-risk UX line in the app).
- Whether to drop the SVG full-pattern export in favor of HTML-only (no — spec §15 mandates SVG).
- Scope additions (new pattern generators, camera measurement, drag-and-drop ordering) — locked by spec §40.
- Hosting target (Cloudflare Pages vs. GitHub Pages vs. other static host) — does not affect code but affects deploy config.
- Whether to add analytics or telemetry (default: no, given the static/no-account ethos).

## Assumption Audit

| ID | Assumption | Severity | Evidence | Action |
|----|------------|----------|----------|--------|
| ASM-1 | Browser print at 100% renders mm-sized SVG at actual physical size | Critical | Partially supported — works reliably in Chrome/Firefox on Windows/macOS at default DPI; mobile Safari and some Linux configurations rasterize at screen DPI. | Mitigate: per-page scale-check square + prominent "Print at 100%, do not scale to fit" warning. Document tested browsers in README. |
| ASM-2 | shadcn/ui v4 CLI is compatible with Tailwind v3 scaffold from Vite template | Important | Weakly supported — shadcn is moving toward Tailwind v4 patterns; current install command works on v3 but v4 is being pushed by default. | Validate: pin to a known-good shadcn release and Tailwind v3 in `package.json` lockfile. Re-check at scaffold time. |
| ASM-3 | `@page` size CSS with portrait/landscape and `break-after: page` works cross-browser for tile-per-page printing | Important | Supported — modern Chromium, Firefox, Safari all honor `@page size`. Edge cases: Firefox may add print headers/footers by default — user must disable. | Mitigate: include "disable browser headers/footers" instruction in printable HTML. |
| ASM-4 | `React.renderToStaticMarkup` produces SVG that opens correctly in Inkscape/Illustrator with mm dimensions | Important | Supported — `renderToStaticMarkup` produces clean static markup; mm units in `width`/`height` + `viewBox` are standard. Inkscape/Illustrator both honor mm. | Validate during Phase 4 by opening a real exported SVG in Inkscape. |
| ASM-5 | LocalStorage capacity (typically 5–10 MB) is sufficient for a tool-roll project | Supported | Confirmed — typical tool-roll project (20 tools + settings) serializes to < 10 KB. | Accept. |
| ASM-6 | `crypto.randomUUID()` is available in target browsers | Supported | Confirmed — supported in all evergreen browsers since 2022. | Accept. |
| ASM-7 | Sloped pocket top can be implemented with straight-line connections (no curves) in v1 | Supported | Confirmed by spec §11.4 — explicit "Do not use curves in v1 unless simple." | Accept; defer feature to v1.1 unless trivial. |
| ASM-8 | Tile cropping via SVG `transform: translate()` does not introduce sub-pixel rendering drift across multi-page prints | Critical | Weakly supported — SVG transforms are vector-precise mathematically, but rasterization at print time can produce ~1 device-pixel seams. Spec §17.5 calls for registration marks to handle this. | Mitigate: registration marks at each corner + the 12.7 mm tile overlap absorb single-pixel discrepancies. Test with a 6-page print early. |
| ASM-9 | Vitest is the default test runner for `npm create vite@latest --template react-ts` | Supported | Confirmed — Vitest is the canonical test runner for modern Vite projects (though not auto-installed by `create vite`; agent must add it). | Validate: add `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom` to devDependencies during scaffolding. |
| ASM-10 | A single continuous pocket-panel SVG path with stepped or sloped top can be hand-built without geometry offset libraries | Supported | Confirmed by spec §11.4 + §12.2 — the path is constructed from straight lines between known points; no curve offsets needed. | Accept. |

**Assumptions found:** 10 (7 explicit, 3 implicit). **Confirmed:** 3. **Supported:** 4. **Partially supported:** 2 (ASM-1, ASM-8 — both critical, both have mitigation in spec). **Weakly supported:** 1 (ASM-2 — important, mitigated by lockfile pinning).

The two critical partially-supported assumptions (ASM-1, ASM-8) both have explicit mitigations already in the spec (scale-check square, registration marks, overlap). No re-brainstorm needed; surface them in the printable-HTML user warnings.

## War-Game Results

**Most likely failure:** **User prints with browser "Fit to page" instead of "Actual size / 100%", producing a scaled-down pattern that ruins fabric.** Mitigation already in design: per-page scale-check square (50 mm or 1 in physical), prominent banner in printable HTML ("Print at 100%, do not scale to fit"), registration marks. Reinforce by including the warning in the construction notes printed with the pattern and as a modal confirmation before download.

**Scale stress (3–5x):** A 25-tool roll (≈500 mm wide) on Letter portrait yields ~6–8 pages; the SVG preview must remain interactive. Mitigation: use vector SVG (no canvas), avoid per-frame re-render — memoize layout computation with `useMemo` keyed on `(tools, settings, units)`. Profile with React DevTools at 25 tools before declaring Phase 2 done.

**Dependency risk:** **shadcn/ui breaking changes between releases.** shadcn vendors components into your source — once copied in, they're insulated from upstream breakage. Pinning Tailwind to v3 in `package.json` is the only real exposure. Mitigation: commit lockfile; document shadcn CLI version used in README.

**Secondary dependency risk:** **`crypto.randomUUID` unavailable in some environments** (older browsers, non-HTTPS local dev where the feature is gated). Mitigation: `utils/ids.ts` wraps it with a fallback (`'tool-' + Math.random().toString(36).slice(2, 10)`).

**6-month maintenance assessment:** Strong. The pure-function generator layer is independently testable and documented via spec §35. The `PatternGenerator<TSettings, TInput, TLayout>` interface makes adding a second generator a self-contained change. The single risk: someone adds geometry math inside a React component (violating spec §4 Design Philosophy). Mitigation: a one-line README rule ("Geometry math lives in `src/generators/*`, never in components") + a linter custom rule could enforce it, but is not blocking for v1.

**Cross-reference to Assumption Audit:** ASM-1 (browser print scaling) and ASM-8 (tile cropping precision) both compound with the "Most Likely Failure" scenario. The scale-check square is the single artifact that catches both — verify it's present on every tiled page in Phase 5.

## Evaluation Metadata

- **Evaluated:** 2026-05-20
- **Cynefin Domain:** Complicated — established patterns (SPA, SVG rendering, LocalStorage) but requires analysis (geometry, hem/seam modeling, tiled-print precision). Plan depth matches the domain.
- **Critical Gaps Found:** 0 (the spec is unusually thorough — already covers acceptance criteria, exclusions, geometry, error handling, validation)
- **Important Gaps Found:** 0 (Commander's Intent / Execution Guidance / Decision Authority were added as framework layers, not as gap fixes)
- **Suggestions:** 2 — (a) document tested browsers in README at Phase 6, (b) consider a linter rule preventing geometry math in `src/components/` (deferred to v1.x)
- **Frameworks applied:** Commander's Intent, OODA, Cynefin, MDMP War-Gaming, RAPID Decision Authority, HRO (light touch). Primitives framework skipped (not an agentic system).

## Next Steps

- [x] Initialize project context (`/forge-init`) — done 2026-05-20
- [x] Evaluate this design (`/forge-evaluate`) — done 2026-05-20
- [ ] Generate master spec (`/forge`)
- [ ] Red-team the spec (`/forge-red-team`)
- [ ] Expand into phase specs (`/forge-prep`)
- [ ] Execute (`/forge-run` interactive or `/forge-dark-factory` autonomous)
