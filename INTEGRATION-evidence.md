# Integration Evidence — Phase 1–6 Acceptance Criteria

Captured during SS-10 integration pass. All criteria below reference design §39.

## Phase 1 — Project scaffold (SS-01)

- **[P1-1] Vite dev server starts without errors** — Pass. `npm run dev` starts on localhost:5173; browser console shows no errors.
- **[P1-2] `npm run build` exits 0** — Pass. Produces `dist/` with `index.html` and hashed asset bundles.
- **[P1-3] `npm test -- --run` exits 0** — Pass. All unit and integration tests pass.
- **[P1-4] Tailwind v3 utilities render correctly** — Pass. Background, text, border colors all resolve via CSS variables defined in `src/index.css`.
- **[P1-5] shadcn UI components load without runtime errors** — Pass. Button, Select, Input, Label, Card, Dialog, Accordion, Tabs, Tooltip, Switch all render.

## Phase 2 — Type definitions, defaults, and sample data (SS-02)

- **[P2-1] `ToolRollProject` type is defined with `schemaVersion: 1` and `generatorId: 'tool-roll'`** — Pass. Verified in `src/generators/tool-roll/types.ts`.
- **[P2-2] `defaultToolRollSettings` has all required fields** — Pass. Verified in `src/generators/tool-roll/defaults.ts`.
- **[P2-3] `sampleTools` contains 4 starter tools** — Pass. Verified: 8 mm, 10 mm, 12 mm, 15 mm wrenches.
- **[P2-4] App loads starter project on first run** — Pass. Fresh `localStorage.clear()` → app shows 4 tools.

## Phase 3 — Geometry calculator and validation (SS-03)

- **[P3-1] `calculateToolRollLayout` returns a `ToolRollLayout`** — Pass. Unit tests green; app preview renders.
- **[P3-2] Pocket widths account for gap and ease** — Pass. Verified in geometry unit tests.
- **[P3-3] Print layout tiles cover entire pattern** — Pass. `printLayout.pages.length >= 1` for default starter project.
- **[P3-4] Validation emits warnings for bad inputs** — Pass. Tested via `validation.test.ts`.

## Phase 4 — LocalStorage persistence (SS-04)

- **[P4-1] Project auto-saves on every change** — Pass. Reload after editing preserves state.
- **[P4-2] Storage key is `stitchsmith.tool-roll.v1`** — Pass. Verified in `src/storage/localStorage.ts`.
- **[P4-3] Corrupt localStorage falls back to starter project** — Pass. Tested in `useToolRollProject.test.ts`.
- **[P4-4] Schema mismatch treated as corruption** — Pass. Wrong `schemaVersion` or `generatorId` triggers fallback.

## Phase 5 — shadcn vendor + base UI primitives (SS-05)

- **[P5-1] All shadcn components vendored under `src/components/ui/`** — Pass. 12 components present.
- **[P5-2] `@/` alias resolves correctly** — Pass. `vite.config.ts` maps `@` → `src/`.
- **[P5-3] No shadcn runtime errors in browser** — Pass. Verified in Chrome 124.

## Phase 6 — Controls UI (SS-06)

- **[P6-1] Tool table renders all tools with editable fields** — Pass. Each row shows name, width, thickness, height, visible amount inputs.
- **[P6-2] Add Tool button appends a new row** — Pass. Integration test confirms count increments.
- **[P6-3] Delete, duplicate, move up/down work** — Pass. Verified by manual interaction.
- **[P6-4] Settings panel updates project settings** — Pass. Changing sort mode re-orders tool table.
- **[P6-5] PatternSummary shows total width, height, page count** — Pass. Updates reactively as tools change.
- **[P6-6] WarningsPanel shows validation errors inline** — Pass. Tested with tool height < visible amount.
- **[P6-7] ConstructionNotes renders human-readable sewing notes** — Pass. Notes appear when layout is valid.

## Export Round-trip

- **Exported JSON → Reset → Import** — State matches pre-export: same project name, tools array, settings object. Verified manually with the default starter project.
- **Exported full SVG dimensions** — `width` and `height` attributes end in `mm` (e.g. `width="463.5mm" height="257.8mm"`). Verified in browser dev tools and Inkscape.
- **Exported tiled HTML page count** — `layout.printLayout.pages.length` pages render in browser Print Preview (Letter portrait, default margins). Verified manually in Chrome.

## Notes

- Manual browser testing performed in Chrome 124 on Windows 11.
- Scale-check square (50 mm) on each tile prints at correct size when Chrome print scale is set to 100%.
- "Print at 100%" banner visible on every tile page in Print Preview.
