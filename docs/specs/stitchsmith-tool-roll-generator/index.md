---
type: phase-spec-index
master_spec: "../2026-05-20-stitchsmith-tool-roll-generator.md"
date: 2026-05-20
sub_specs: 10
---

# StitchSmith — Tool Roll Pattern Generator — Phase Specs

Refined from [`2026-05-20-stitchsmith-tool-roll-generator.md`](../2026-05-20-stitchsmith-tool-roll-generator.md).

| Sub-Spec | Title | Dependencies | Phase Spec |
|----------|-------|--------------|------------|
| 1 | Project scaffold (Vite + React + TS + Tailwind + shadcn) | none | [sub-spec-1-project-scaffold.md](sub-spec-1-project-scaffold.md) |
| 2 | Type definitions, defaults, and sample data | 1 | [sub-spec-2-types-defaults.md](sub-spec-2-types-defaults.md) |
| 3 | Geometry calculator and validation | 2 | [sub-spec-3-geometry-calculator.md](sub-spec-3-geometry-calculator.md) |
| 4 | LocalStorage persistence and project state hook | 2 | [sub-spec-4-localstorage-state.md](sub-spec-4-localstorage-state.md) |
| 5 | shadcn vendor pass + base UI primitives | 1, 2 | [sub-spec-5-shadcn-vendor.md](sub-spec-5-shadcn-vendor.md) |
| 6 | Tool table + settings panel + summary + warnings | 3, 4, 5 | [sub-spec-6-controls-ui.md](sub-spec-6-controls-ui.md) |
| 7 | SVG renderer (FullPatternSvg + layer components) | 3, 5 | [sub-spec-7-svg-renderer.md](sub-spec-7-svg-renderer.md) |
| 8 | Pattern preview + Full SVG export + Project JSON I/O | 4, 6, 7 | [sub-spec-8-preview-export.md](sub-spec-8-preview-export.md) |
| 9 | Tiled printable HTML export | 7, 8 | [sub-spec-9-tiled-print.md](sub-spec-9-tiled-print.md) |
| 10 | Generator registry + responsive polish + integration | 8, 9 | [sub-spec-10-integration.md](sub-spec-10-integration.md) |

## Wave Ordering

- **Wave 1** (no dependencies): SS-01
- **Wave 2** (depends on Wave 1): SS-02
- **Wave 3** (depends on Wave 2): SS-03, SS-04, SS-05
- **Wave 4** (depends on Wave 3): SS-06, SS-07
- **Wave 5** (depends on Wave 4): SS-08
- **Wave 6** (depends on Wave 5): SS-09
- **Wave 7** (final integration): SS-10

Within a wave, sub-specs can run in parallel.

## Requirement Traceability Matrix

| Requirement | Covered By |
|-------------|-----------|
| R1: Vite + React + TS project scaffold | SS-01 |
| R2: Tailwind v3 + shadcn init + vendored primitives | SS-01, SS-05 |
| R3: TypeScript types from §7/§10 | SS-02 |
| R4: `defaultToolRollSettings` + `sampleTools` | SS-02 |
| R5: Pure geometry calculator | SS-03 |
| R6: Validation (tool/settings/layout) | SS-03 |
| R7: Construction notes generation | SS-03 |
| R8: LocalStorage persistence (debounced) | SS-04 |
| R9: React UI shell (table, settings, preview, summary, warnings, notes, export) | SS-05, SS-06, SS-08 |
| R10: SVG renderer with layer ordering | SS-07 |
| R11: Full SVG export + Project JSON I/O | SS-08 |
| R12: Tiled printable HTML export | SS-09 |
| R13: `PatternGenerator` interface + registry | SS-10 |
| R14: Responsive layout (desktop two-column, mobile stacked) | SS-10 |
| R15: All Phase 1–6 acceptance criteria pass | SS-10 |
| R16: Production build deployable as static site | SS-01, SS-10 |

No orphaned requirements.

## Cross-Spec Contracts (summary — full machine schema in `contracts.json`)

| Contract | Owner | Consumers |
|----------|-------|-----------|
| All `ToolItem`, `ToolRollSettings`, `ToolRollProject`, `ToolRollLayout` types | SS-02 | SS-03, SS-04, SS-06, SS-07, SS-08, SS-09, SS-10 |
| `defaultToolRollSettings`, `sampleTools` | SS-02 | SS-04, SS-06, SS-10 |
| `inchesToMm`, `mmToInches`, `PAPER_SIZES_MM`, `getPaperSize` | SS-02 | SS-03, SS-06, SS-09 |
| `calculateToolRollLayout(tools, settings, units) -> ToolRollLayout` | SS-03 | SS-06, SS-07, SS-08, SS-09, SS-10 |
| `validateTool`, `validateSettings`, `validateLayout` | SS-03 | SS-04, SS-06 |
| `generateConstructionNotes` | SS-03 | SS-06 |
| `useToolRollProject()` hook | SS-04 | SS-06, SS-08, SS-10 |
| shadcn UI primitives (`Button`, `Input`, `Card`, ...) | SS-05 | SS-06, SS-08 |
| `<FullPatternSvg layout settings>` | SS-07 | SS-08, SS-09 |
| `<TileSvg>`, `<TileOverlay>` | SS-09 | (internal to SS-09) |
| `exportFullSvg`, `exportProjectJson`, `parseProjectJson` | SS-08 | SS-10 |
| `exportPrintableHtml` | SS-09 | SS-10 |
| `PatternGenerator<TSettings, TInput, TLayout>` interface + `toolRollGenerator` | SS-10 | (foundation for future modules) |

## Execution

Run `/forge-run ../2026-05-20-stitchsmith-tool-roll-generator.md` to execute all phase specs.
Run `/forge-run ../2026-05-20-stitchsmith-tool-roll-generator.md --sub N` to execute a single sub-spec.
