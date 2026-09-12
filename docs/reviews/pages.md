# Page-layer review (2026-09-12)

Critical review of the generator pages after fourteen per-generator
`ExportPanel` / `PatternPreview` / `CutListTable` copies were replaced by one
shared set. Everything below was checked by driving the real pages in React
Testing Library, not by reading the diff.

## Findings

| Sev | What | Where | Fixed |
|---|---|---|---|
| High | Every warning that names an input rendered a clickable `[field]` that did nothing. The panel built the selector from the snake_case field name while the panels give inputs short kebab ids (`side_seam_allowance` → `side-seam`), so on the six pages sampled **not one** link resolved. | `shared/WarningsPanel.tsx` | Yes |
| High | `defaultFocusField` called `scrollIntoView` before `focus`, so anywhere that method is missing the focus was lost too. | `shared/WarningsPanel.tsx` | Yes |
| Med | The preview is the point of the page and had the smallest share of it: the shell capped the page at 1280 px and gave the two rails 620 px of it. | `shared/PatternPageShell.tsx` | Yes |
| Med | The legend opened by default on every page: ~250 px of five-paragraph reference material above the export panel, every visit. | `shared/PatternEngineLegend.tsx` | Yes |
| Med | Assembly instructions rendered in full in the 300 px sidebar. The LBV's 18 steps ran ~1200 px and pushed the page past 3700 px tall. | `shared/ConstructionSteps.tsx` | Yes |
| Med | The preview viewport was 480 px against the 3D tab's 560 px, so switching tabs jumped the layout and the drawing had less room than it could use. | `shared/export/PatternPreview.tsx` | Yes |
| Low | Zip Pouch handed the exporters `seam_allowance` raw. That input is in the display unit, so an inch project declared a 0.375 **mm** allowance. Harmless today because every Zip Pouch piece carries explicit per-edge zeros, but the next piece added without them would be drawn wrong. | `zip-pouch/{ExportPanel,PatternPreview}.tsx` | Yes |
| Low | Cut list and BOM tables had no overflow container; the five-column strip table and a 59-piece id list could widen the sidebar instead of scrolling. | `shared/export/{EngineCutListTable,BomTables}.tsx` | Yes |
| Low | Derived-number values could not wrap out of their grid column. | `shared/warnings/DerivedNumbers.tsx` | Yes |
| Low | Tool Roll listed its warnings fifth in the sidebar; every other page leads with them. | `tool-roll/ToolRollPage.tsx` | Yes |
| Med | The preview canvas carried `dark:bg-gray-900`, so enabling dark mode drew the engine's black cut lines on a near-black ground. This is what forced the shell fork to revert its theme wiring. | `shared/PatternViewport.tsx` | Yes |

## Dark mode: the preview is unblocked

The pattern preview now paints paper. `PatternViewport` keeps a white canvas
in either theme, because the exporter's stroke colours are deliberate and
belong to the exported file: the preview has to read the way it will print.
Everything floating on that canvas — the zoom toolbar, the piece-count chip,
the label and annotation toggles, the Tool Roll's tile-grid button and its
pocket count — is pinned to explicit light colours rather than theme tokens,
which would otherwise turn near-white and vanish. The focus ring is offset
against the paper instead of the page background.

A test asserts the canvas keeps `bg-white` and that no element inside it
carries a `dark:bg-` override, so the surface cannot quietly follow the theme
again.

**The shell fork's theme wiring can go back in.** Everything outside the
canvas already uses theme tokens and was checked while reviewing these files.
The 3D viewer (`FoldViewer`) was not in scope here and wants the same look
before dark mode ships.

### Investigated, not a defect

- **PDF export failing with `WinAnsi cannot encode "→"` on the LBV and
  Organizer.** Seen once during a full `src/components` run and not
  reproducible afterwards. It was real: the coordinator was mid-edit adding
  text drawing to the PDF exporter, and the standard font cannot encode the
  arrow and approximately-equal glyphs that vault labels are full of. Fixed in
  the exporter with a `toWinAnsi` sanitiser and covered by a test there.

## Re-run against the fixed exporters

The matrix was re-run after the exporter library was repaired (tiled HTML was
emitting blank pages, the PDF drew no text and truncated pieces larger than a
page, and SVG labels overflowed their pieces). All 30 matrix tests still pass,
and the tiled-HTML assertion was tightened to require an inline drawing on the
page, which is what "blank pages" would now fail on.

## Export matrix

Each page rendered, each button pressed, each artefact inspected. All 14
engine pages pass every column. Tool Roll is off the pattern engine and keeps
its own panel, so it is not in the matrix.

| Page | SVG | Material sheets | Tiled | PDF | DXF | Cut list | CSV | Instructions | Project JSON |
|---|---|---|---|---|---|---|---|---|---|
| book-cover, circle-skirt, clamshell-pack, fanny-pack, lbv, mag-pouch, micro-rig, organizer, padded-strap, plate-carrier, roll-top-sack, sling, tri-zip-backpack, zip-pouch | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |

Assertions per page: the SVG starts with `<svg>`, contains piece groups and no
`NaN`; the material sheets carry a `<section>` and an inline SVG per material;
the DXF has `SECTION` and `ENTITIES`; the cut list renders rows; the CSV has a
header and body; the instructions are a full HTML document; the project JSON
parses and names the right `generatorId`. **The piece types the preview
reports and the piece groups in the exported SVG are compared for every page**,
which is what proves the export adapter and the preview build the same
pattern.

Also pinned: a Convention B page (organizer) exports no seam-allowance line,
and an inch-unit Zip Pouch labels the allowance in inches while handing the
exporters millimetres.

## Error and empty states

All 14 pages, driven by setting their first numeric input to `NaN`:

- the drawing is replaced by an explanation, never left stale or blank;
- every export button disables, and pressing all of them writes no file;
- the panel explains why ("Fix validation errors to enable exports").

## Behaviour changes from the migration

| Change | Verdict |
|---|---|
| Zip Pouch, Roll-Top and Book Cover lost "Download cut list as JSON" and gained CSV, tiled HTML, PDF, DXF, per-material sheets and instructions. | **Kept.** Three pages had the JSON button and eleven never did; re-adding a fifteenth button for three generators reintroduces the inconsistency the migration removed. Flagged here because it is a capability removal, not a rename. |
| Book Cover's "Download PDF" / "Download DXF" became "PDF" / "DXF". | Kept: one label set on every page. |
| Book Cover's legend and steps moved from the preview column to the sidebar. | Kept: matches the other thirteen pages. |
| Tri-Zip's cut list now lists its hardware. | Kept, and pinned by a test. |
| Mag Pouch keeps its own BOM renderer with cut tags. | Kept, and pinned by a test. |

Sidebar order is now identical on all 14 engine pages: warnings, legend,
export, derived numbers, steps. Tool Roll now leads with warnings too, then
keeps its own legend, export, summary and construction notes because it is not
on the pattern engine.

## Outside these files

1. **Tri-Zip silently discards its generator warnings.** `buildShoulderStraps`
   returns `warnings`, and `buildPattern`'s `collect()` takes only `pieces` and
   `steps`, so the strap engine's mock-derived warnings never reach the page.
   Tri-Zip is consequently the only engine page with no warnings panel. Repro:
   `buildShoulderStraps(resolveInputs(defaults, preset)).warnings` is non-empty
   while nothing in `buildPattern`'s result carries it. Fix belongs in
   `src/generators/tri-zip-backpack/buildPattern.ts` (return the warnings), and
   then one line on the page.
2. **Zip Pouch shows three blank dimension boxes when a preset supplies the
   dimensions.** The page passes `project.inputs` through untouched, so the
   page is not dropping them: the defaults store only `preset: 'pencil'` and
   `resolveInputs` fills the dimensions in later.
   `ZipPouchSettingsPanel.tsx` already materialises preset dimensions when the
   user toggles units (see its comment at the `convertUnits` helper); the same
   values want to be the field placeholders at rest. Settings-panel fix.
3. **`downloadProjectJson` builds its own anchor** rather than using
   `utils/download.ts`, so it is the one download path a test cannot intercept
   through the shared helper (`src/export/projectEnvelopeIO.ts:90`). Harmless,
   but it is duplicated code in the one place downloads are centralised.

## Tests added

| File | Tests |
|---|---|
| `src/components/__tests__/export-matrix.test.tsx` | 30 |
| `src/components/__tests__/page-composition.test.tsx` | 19 |
| `src/components/__tests__/page-error-states.test.tsx` | 14 |
| `src/components/__tests__/warning-field-links.test.tsx` | 8 |

`src/components` plus `src/app/App.test.tsx`: 36 files, 321 tests, all
passing. `tsc --noEmit` clean for these paths.
