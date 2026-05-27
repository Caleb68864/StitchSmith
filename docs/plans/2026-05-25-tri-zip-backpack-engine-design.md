---
date: 2026-05-25
evaluated_date: 2026-05-25
topic: "Tri-Zip Backpack Generator + Reusable Pattern Engine"
author: Caleb Bennett
status: evaluated
tags:
  - design
  - tri-zip-backpack
  - pattern-engine
---

# Tri-Zip Backpack Generator + Reusable Pattern Engine — Design

## Summary

Add a configurable Tri-Zip backpack pattern generator to StitchSmith, and in the same project extract a reusable, generator-agnostic **pattern engine** library (`src/lib/pattern-engine/`) that represents patterns as a graph of connected edges (FreeSewing-inspired) rather than a collection of raw SVG shapes. Migrate the existing Tool Roll generator onto the engine in the final phase. Engine ships with six exporters: SVG, tiled HTML print, tiled PDF, DXF, cut list + BOM, and assembly instructions.

## Approach Selected

**Approach A — Engine-first → Tri-Zip on top → Tool Roll migration last.** Designing the engine API against the harder consumer (Tri-Zip: mirroring, shared seams, many modules, six style presets) before retrofitting the simpler Tool Roll minimizes the risk of an engine that fits only the case it was extracted from. Tool Roll migration in the final phase has the full engine and a working second generator as reference.

## Architecture

### Module layout

```
src/lib/pattern-engine/                  reusable, generator-agnostic
├── graph/
│   ├── Point.ts                         { x, y } in mm; unit conversion at I/O only
│   ├── Edge.ts                          Straight | Arc | Bezier; role: cut|fold|stitch|seam|notch
│   ├── Path.ts                          ordered Edge sequence; closed/open
│   ├── Piece.ts                         named, mirror flag, quantity, material ref, paths, annotations
│   └── Pattern.ts                       Pieces + Materials + Hardware + AssemblySteps + meta
├── geometry/
│   ├── offset.ts                        per-edge seam-allowance offset (CCW/CW aware)
│   ├── arc.ts                           arc fit + arc-corrected fold parallels (lifted from tool-roll)
│   ├── transform.ts                     translate / rotate / mirror
│   ├── units.ts                         mm ↔ in conversion + formatting
│   └── bbox.ts                          per-piece + pattern bounding boxes
├── materials/
│   ├── Material.ts                      fabric (name, weight, color); foam; webbing; binding
│   ├── Hardware.ts                      zippers, buckles, sliders, ladder-locks, hooks
│   └── cutList.ts                       per-piece consumption + per-material totals
├── exports/
│   ├── svg.ts                           Pattern → single SVG file (current Tool Roll behavior, generalized)
│   ├── tiledHtml.ts                     Pattern → tiled HTML print sheets (generalized)
│   ├── pdf.ts                           Pattern → tiled PDF via pdf-lib
│   ├── dxf.ts                           Pattern → DXF, one layer per piece
│   └── projectJson.ts                   Pattern + inputs → JSON round-trip
├── instructions/
│   ├── Step.ts                          { id, title, body, dependsOn[], refsPieces[] }
│   └── compile.ts                       topological sort + markdown/HTML renderer
└── index.ts

src/generators/
├── tool-roll/                            (untouched in phases 1–3, migrated in phase 4)
└── tri-zip-backpack/
    ├── inputs.ts                         params schema + validation; computed-volume readout
    ├── stylePresets.ts                   6 presets: urban_assault, tactical, hiking, camera, medical, minimalist
    ├── modules/
    │   ├── backPanel.ts
    │   ├── frontCenterPanel.ts
    │   ├── frontWing.ts                  Piece with mirror: true → qty 2
    │   ├── perimeterGusset.ts            single piece OR split when split_gusset=true
    │   ├── triZipSubsystem.ts            Y-zip geometry; direct or gusseted construction
    │   ├── shoulderStraps.ts             straight | ergonomic | s_curve
    │   ├── sternumStrap.ts
    │   ├── hipBelt.ts                    none | webbing | padded
    │   ├── topHandle.ts
    │   ├── compressionStraps.ts          none | side | side_and_bottom
    │   ├── frameSheet.ts                 none | hdpe | foam
    │   └── laptopSleeve.ts               reusable; attachable to other generators in future
    ├── buildPattern.ts                   orchestrates modules → Pattern
    ├── steps.ts                          per-module assembly Step contributions
    └── types.ts

src/components/
├── landing/LandingPage.tsx               registers Tri-Zip alongside Tool Roll
├── tool-roll/                            (unchanged during phases 1–3)
└── tri-zip-backpack/
    ├── TriZipPage.tsx
    ├── TriZipSettingsPanel.tsx           accordion sections in build order
    ├── sections/                         StylePresetSection, DimensionsSection (with live volume),
    │                                     TriZipGeometrySection, ZipperSystemSection, BackPanelSection,
    │                                     ShoulderStrapsSection, SternumHipSection, TopHandleSection,
    │                                     CompressionSection, FrameSheetSection, LaptopSleeveSection
    ├── PatternPreview.tsx                consumes engine SVG renderer
    └── ExportPanel.tsx                   SVG / Print HTML / PDF / DXF / Cut list / BOM / JSON
```

### Style preset parameter table

First-pass values. These become the agent's starting point in phase 3; visual tuning happens during preset implementation. All measurements in mm.

| Preset          | strap_width | foam_thickness | curve_style | back_panel_shape | compression_straps | hip_belt | laptop_sleeve attachment | sternum_strap | y_split_height_% | center_panel_width_% |
|-----------------|-------------|----------------|-------------|------------------|--------------------|----------|--------------------------|---------------|------------------|----------------------|
| urban_assault   | 75          | 10             | ergonomic   | rounded          | side               | webbing  | webbing-loop (removable) | true          | 60               | 35                   |
| tactical        | 75          | 10             | straight    | tactical         | side_and_bottom    | padded   | webbing-loop (removable) | true          | 55               | 40                   |
| hiking          | 65          | 12             | s_curve     | rounded          | side               | padded   | none                     | true          | 65               | 30                   |
| camera          | 65          | 8              | ergonomic   | square           | side               | webbing  | seam-sewn (internal)     | true          | 50               | 45                   |
| medical         | 70          | 10             | straight    | square           | none               | none     | seam-sewn (internal)     | false         | 70               | 50                   |
| minimalist      | 50          | 6              | straight    | rounded          | none               | none     | seam-sewn (internal)     | false         | 60               | 35                   |

Notes:
- Numbers are intentionally crude. Phase-3 implementation can adjust them; the goal is to give the agent a non-zero starting point rather than ask it to invent values.
- `frame_sheet` is independent of preset and defaults to `none` for all (user opts in).
- `zipper_method` defaults to `gusseted` for all presets (the recommended method per the brain dump).
- `zipper_gusset_width` defaults to `25` mm (≈1") for all presets.

### Step interface shape (instructions module)

```ts
// lib/pattern-engine/instructions/Step.ts
export interface Step {
  id: string;                  // unique within a Pattern, e.g. "tri-zip.front-center.attach-zipper"
  title: string;               // short imperative, e.g. "Attach center zipper to front center panel"
  body: string;                // markdown; can reference pieces by name with [[piece:back-panel]]
  dependsOn: string[];         // ids of steps that must complete before this one
  refsPieces: string[];        // piece ids this step touches (used to render piece thumbnails inline)
  group?: string;              // optional grouping ("Sub-assembly: Front", "Final assembly")
}
```

`compile.ts` topologically sorts steps by `dependsOn`, groups by `group`, and renders to markdown or HTML.

### Engine boundary enforcement

The constraint "`src/lib/pattern-engine/` has no imports from `src/generators/` or `src/components/`" is enforced by **two complementary mechanisms**, both in the engine foundation phase:

1. **Eslint rule** — `no-restricted-imports` with patterns `../generators/*`, `../components/*`, `@/generators/*`, `@/components/*` scoped to `src/lib/pattern-engine/**`.
2. **Vitest contract test** — `src/lib/pattern-engine/__tests__/boundaries.test.ts` walks the engine source tree and asserts no offending import strings. Catches eslint config drift.

### Project JSON schema versioning

The exported project JSON includes a top-level `schemaVersion` integer. Tool Roll's current export gains `schemaVersion: 1` retroactively on the next save. The engine-aware Tri-Zip export starts at `schemaVersion: 2`. `importProjectJson` runs a per-version migrator chain on load. Unknown future versions surface a friendly error instead of corrupting state.

### Critical primitives the engine must get right

- **Edge-graph mirroring** — a `Piece` with `mirror: true` means cut 2 (one mirrored). Twins are never hand-coded.
- **Shared-edge identity** — when two pieces share a seam, both reference the same `Edge` id. The Pattern compiler verifies length match (e.g., zipper length ↔ center-panel zipper edge).
- **Per-edge seam allowance** — different edges on one piece can have different SA (zipper edges typically 6 mm / ¼", hem edges 12 mm / ½"). Offset is per edge, not per piece.
- **Notches as first-class** — notches live at edge `t`-values and propagate through seam-allowance offset to the cut path.
- **Units everywhere** — internal storage is mm. Unit conversion only at user-facing I/O (inputs, labels, exports).
- **No hardcoded dimensions** — every value derives from `inputs` or a `stylePreset`. Constants live alongside the preset that owns them.

### Phasing

1. **Engine foundation.** Graph, geometry, materials/hardware models, SVG exporter, tiled HTML exporter, instructions compiler. Port the arc-correction and hem-fold-parallel work from the current tool-roll geometry into the lib **without yet rewiring tool-roll to it** (tool-roll continues to use its own copies; the lib copies exist for the engine and future migration).
2. **Engine exporters.** Tiled PDF (pdf-lib), DXF, cut list + BOM table renderer.
3. **Tri-Zip generator.** Modules, style presets, page UI (accordion), landing-page registration, export panel.
4. **Tool Roll migration.** Refactor tool-roll/* to consume the engine. Snapshot test the SVG output of the sample project before/after migration; require pixel-identity within a tolerance.
5. **Polish.** Validation messages, warnings panel, persistence shape, documentation updates.

## Components

| Component | Owns | Does NOT own |
|---|---|---|
| `lib/pattern-engine/graph` | Point/Edge/Path/Piece/Pattern data model and invariants | Geometry math, rendering, materials |
| `lib/pattern-engine/geometry` | Seam-allowance offset, arcs, transforms, bbox, units | Pattern structure, exports |
| `lib/pattern-engine/materials` | Material + Hardware definitions, cut-list aggregation | Per-piece geometry |
| `lib/pattern-engine/exports/*` | One file format per module; consume a `Pattern` and emit | Pattern construction, validation rules |
| `lib/pattern-engine/instructions` | Step model + topo-sort + render | Per-pattern step content (that lives in each generator) |
| `generators/tri-zip-backpack/modules/*` | One module per pack piece; emit `Piece` and contribute `Step`s | Engine internals, other modules' pieces |
| `generators/tri-zip-backpack/stylePresets.ts` | Six named bundles of default parameters | Engine, modules |
| `generators/tri-zip-backpack/buildPattern.ts` | Orchestrating modules into a `Pattern` | Module-level geometry |
| `components/tri-zip-backpack/TriZipSettingsPanel.tsx` | Accordion UI; bind to state | Geometry, exports |
| `components/tri-zip-backpack/ExportPanel.tsx` | Trigger engine exporters via a unified button group | What each format does internally |
| `components/landing/LandingPage.tsx` | Pattern registry display | Anything pattern-specific |

## Data Flow

```
User inputs (TriZipPage)
        │
        ▼
TriZipInputs ─┐                         ┌─→ SVG          → file/string
              │                         │
StylePreset ──┤    buildPattern()       ├─→ TiledHTML    → window/file
              ├──────────────────┬─→    │
zipperGusset ─┤   modules emit   │      ├─→ PDF tiled    → blob/download
              │   Piece(s) +     │      │
materials  ───┘   contribute     │      ├─→ DXF          → file
                  Steps          ▼      │
                              Pattern ──┼─→ Cut list/BOM → table + CSV
                              (Pieces,  │
                              Materials,├─→ Instructions → markdown/HTML
                              Hardware, │
                              Steps,    └─→ Project JSON → import/export
                              meta)
```

- **Inputs side.** Validated `TriZipInputs` + chosen `StylePreset` flow into `buildPattern()`. The function iterates over the enabled modules; each module emits one or more `Piece` objects and contributes `Step` objects to the assembly sequence.
- **Pattern object.** Pure data — no DOM, no canvas. Holds all geometry as the edge graph, plus materials, hardware, and ordered assembly steps.
- **Export side.** Each exporter is a pure function `Pattern → output`. Side-effectful triggers (download, print window) live in thin component wrappers.
- **Persistence.** The project JSON exporter serializes inputs + style preset name (not the materialized `Pattern`) so a re-import re-runs `buildPattern()` and benefits from engine improvements over time.
- **Live volume readout.** `DimensionsSection` computes `H × W × D ÷ 1000` (mm³ → liters) and displays it; no commitment to a calibrated solver.

## Error Handling

### Validation layers

1. **Input schema validation** (per generator) — surfaces field-level errors in the WarningsPanel UI before `buildPattern()` runs.
2. **Engine invariants** — when `buildPattern()` returns the `Pattern`, the engine performs structural checks:
   - shared-edge length mismatch (e.g., zipper edge ≠ declared zipper length)
   - any negative dimension after seam-allowance offset
   - perimeter gusset length vs. measured front+side+top+bottom perimeter
   - split-gusset segment widths vs. configured fabric width
3. **Export-time errors** — exporters return `Result<Output, ExportError>`. PDF reports "piece too large for selected paper size"; DXF reports "invalid entity"; etc. Errors surface as a non-blocking warning row + a toast.

### Migration safety (phase 4)

- Before any tool-roll migration code lands, snapshot the SVG output of the current sample project (4-wrench layout) and commit the snapshot.
- **Equivalence check is geometric, not pixel-based.** Sample N points along each emitted path (default N=64 per closed path, N=32 per open path) and compare to the snapshot's sampled points with `epsilon = 0.01 mm`. Any sample exceeding epsilon fails the check.
- **Why geometric, not pixel-based:** float-ordering and SVG attribute formatting differences are noise; geometry is signal. Pixel-bbox tolerance was rejected because picking a number that catches real regressions without flagging cosmetic emitter differences is impractical.
- Migration PR/spec runs the existing tool-roll Vitest suite unchanged — all tests must pass.
- An additional vitest case loads the snapshot, runs the new engine path, and asserts geometric equivalence at the stated epsilon.

### Failure modes most likely to bite us

- **Engine API overfits to Tri-Zip.** Mitigation: phase 4 migration is explicitly part of the project, not an afterthought; phase-2 exporter design is reviewed against tool-roll's existing exports before tool-roll migration starts.
- **Seam-allowance offset on tight curves.** Inner-curve offset can self-intersect for small radii. Engine detects + warns; per-edge SA can be reduced as a workaround.
- **PDF bundle size.** pdf-lib adds ~150 KB. Lazy-load the PDF exporter module so it doesn't impact first paint.
- **Six presets is a lot of art direction.** Style presets are *parameter bundles*, not bespoke pattern modules — every preset must be expressible in the same parameter space. If a desired preset needs a new module, that's a green light to add the module, not branch the engine.

## Success Criteria

- Engine produces a valid `Pattern` from `TriZipInputs` for every combination of: any of the 6 style presets × `zipper_method ∈ {direct, gusseted}` × `back_panel_shape ∈ {square, rounded, tactical}` × `compression_straps ∈ {none, side, side_and_bottom}` × `frame_sheet ∈ {none, hdpe, foam}` × `hip_belt ∈ {none, webbing, padded}`.
- All six exporters work for every Tri-Zip combination listed above: SVG, tiled HTML, tiled PDF, DXF, cut list + BOM, assembly instructions.
- Live "Computed volume: X L" readout updates with dimension changes.
- Landing page lists Tool Roll + Tri-Zip Backpack; adding a new pattern is one entry in the pattern registry.
- Tool Roll migrated onto the engine with output pixel-identical (within tolerance) to pre-migration for the sample project; existing Vitest suite passes unchanged.
- `src/lib/pattern-engine/` has no imports from `src/generators/` or `src/components/`. Enforced by eslint `no-restricted-imports` + a vitest contract test that walks the engine source tree.
- No hardcoded dimensions outside style presets or input defaults.
- Project import/export round-trips bit-for-bit for both generators. Exported JSON carries `schemaVersion` (Tool Roll = 1, Tri-Zip = 2); import runs a per-version migrator chain.
- **Bundle-size budget:** main (initial) bundle ≤ 350 KB gzipped after engine landing. PDF exporter, DXF exporter, and tiled-print sheets lazy-loaded via dynamic `import()`. Tracked in CI via `vite-bundle-visualizer` or equivalent at spec time.

## Exclusions

- No cloning of commercial patterns (Mystery Ranch Urban Assault, 2 Day Assault, CamelBak Tri-Zip series). Inspiration only.
- No reverse capacity solver (liters → dimensions with locked dim) in v1; live volume readout only.
- No user-defined / user-saved style presets in v1 (the six listed are it).
- No backend, no telemetry, no accounts (project mandate).
- No new Tool Roll features bundled with the migration; migration is feature-preserving only.
- No 3D preview; SVG flat preview only.
- No automated pattern-piece nesting on fabric in v1 (cut list is per-piece area + totals; layout optimization is a v2 nicety).

## Open Questions

1. **PDF library choice.** pdf-lib (~150 KB, deterministic, modern) vs. jsPDF (~250 KB, simpler API but heavier). *Recommend pdf-lib*; confirm at spec time.
2. **Y-split corner radius.** At the Y intersection, hard angle or small radius? Curving the join is more sewable. *Recommend* `y_intersection_radius` parameter with a sensible default (e.g., 6 mm).
3. **Perimeter gusset construction.** Single tapered strip vs. discrete top/side/bottom segments joined at corners. *Recommend discrete segments*; matches MYOG convention, corner notches handle geometry.
4. **Materials model granularity.** Per-piece grain direction (always) vs. per-strap only (where bias matters most)? *Recommend* optional per-piece grain attribute, default unset.
5. **Laptop sleeve attachment.** Sewn-in seam vs. webbing-loop hung. *Recommend* style-preset-dependent: hiking/minimalist seam-sewn, urban_assault/tactical webbing-loop, camera/medical configurable.
6. **Tool Roll snapshot tolerance.** Pixel-identity within N px bbox or paths-identical via geometric comparison? Pick at phase-4 spec time.

## Approaches Considered

- **Approach A — Engine-first → Tri-Zip → Tool Roll migration. SELECTED.** Engine API is exercised by the harder consumer (Tri-Zip) first, then proven against the simpler one (Tool Roll). Tool Roll continues to ship its current behavior throughout phases 1–3.
- **Approach B — Extract-first.** Refactor Tool Roll into the engine before adding new exporters or Tri-Zip. *Rejected*: weeks of refactor on a mature, shipping feature with no visible user-facing progress; high regression risk; Tri-Zip ships much later.
- **Approach C — Parallel rails (Tool Roll migration deferred to v2).** Run both generators in parallel; only extract obviously-shared low-risk utilities up front. *Rejected*: user explicitly chose to include the Tool Roll migration in this scope, and deferring it indefinitely is exactly the duplication this engine exists to prevent.

## Commander's Intent

**Desired End State:**
- A user can open StitchSmith, pick "Tri-Zip Backpack" from the landing page, configure any of the six style presets + dimensions + per-section parameters, see a live SVG preview update, and export the resulting pattern in any of six formats (SVG, tiled HTML print, tiled PDF, DXF, cut list + BOM, assembly instructions).
- Tool Roll continues to work end-to-end with output geometrically identical to pre-migration (epsilon = 0.01 mm).
- A new pattern type can be added by dropping a new module directory under `src/generators/` and one entry in the pattern registry consumed by the landing page.

**Purpose:**
- Make the next pattern (after Tool Roll) cost an order of magnitude less to build by extracting shared infrastructure into a reusable engine.
- Establish an edge-graph pattern representation that supports seam allowance, notches, mirroring, and shared seams correctly from day one — the foundation for any future generator.

**Constraints (MUST / MUST NOT):**
- MUST keep StitchSmith fully client-side (no backend, no telemetry, no accounts).
- MUST preserve Tool Roll behavior through phases 1–3; migration in phase 4 must not introduce user-visible regressions.
- MUST NOT hardcode dimensions outside `stylePresets.ts` and per-generator input defaults.
- MUST NOT import from `src/generators/` or `src/components/` inside `src/lib/pattern-engine/`.
- MUST NOT clone any commercial pattern (Mystery Ranch, CamelBak); inspiration only.
- MUST keep main bundle ≤ 350 KB gzipped after engine landing; PDF / DXF / tiled-print exporters are lazy-loaded.

**Freedoms (the implementing agent MAY):**
- Choose internal helper modules, file names, and directory structure within each phase, as long as the public engine surface (graph types, exports) stays clean.
- Pick test organization (next-to-source, per project convention) and test fixture shape.
- Refactor the existing tool-roll geometry helpers as part of phase-1 extraction without touching tool-roll's user-facing behavior.
- Choose default values for style-preset parameters within the parameter table above as a starting point; visual tuning during phase-3 implementation is expected.
- Pick the curve representation for arcs (parametric vs. polyline-sampled) per exporter — DXF wants arcs, SVG/PDF can render either.

## Execution Guidance

**Observe (signals to monitor during implementation):**
- `npm test -- --run` — full vitest suite, must stay green throughout. Phase-4 adds the geometric-equivalence regression test.
- `npm run build` — Vite production build. Bundle-size budget tracked here.
- TypeScript errors via `tsc --noEmit` (strict mode is OFF per `forge-project.json` but no implicit-any tolerance).
- Eslint output, especially the `no-restricted-imports` rule scoped to `src/lib/pattern-engine/**`.
- The `boundaries.test.ts` contract test catching engine import violations.
- Snapshot files in `src/generators/tool-roll/__tests__/` once they exist — diffs there during phase 4 are the migration's truth.

**Orient (codebase conventions to maintain):**
- ESM throughout (`"type": "module"` in package.json). Imports use `.js` extensions on relative paths because the project is true ESM.
- Tests live next to source files as `*.test.ts` (per existing tool-roll convention).
- shadcn/ui components are copy-in via `npx shadcn@latest add`, NOT npm packages. Place new shadcn primitives in `src/components/ui/`.
- Tailwind v3 (NOT v4). Class names follow shadcn conventions.
- State hooks live in `src/state/`; one hook per generator (`useToolRollProject`, future `useTriZipProject`).
- Persistence: LocalStorage auto-save + JSON import/export; `src/storage/localStorage.ts` is the pattern to follow for the Tri-Zip equivalent.
- Existing module layout for a generator: `inputs/types/defaults`, geometry math, grouping/validation, construction notes, optional `index.ts`. The new pattern-engine consumes those concerns instead.
- Components import paths use the `@/` alias for `src/`.
- Construction-note generation lives WITH the generator that needs it, but is fed through the engine's `instructions/` compiler.
- React is the rendering target; SVG is emitted as JSX in the preview component but as a string in `exports/svg.ts`.

**Escalate When:**
- A success criterion or constraint above is in conflict with the brain-dump scope (the human picks).
- The engine API needs a new public primitive (new edge type, new annotation kind) to support a style preset — flag it for human review before adding to the public surface.
- A new external dependency is required (especially pdf-lib alternatives, or any DXF helper). The plan recommends pdf-lib; deviations need a human OK.
- A style preset's intent cannot be expressed in the documented parameter space without a new bespoke module. Surface the preset + the proposed module before implementing.
- Phase-4 geometric-equivalence check fails after best-effort engine work; do NOT loosen the epsilon to make it pass — escalate.
- Bundle-size budget exceeded; do NOT delete lazy-loaded imports — escalate with a proposed remediation.

**Shortcuts (apply without deliberation):**
- New generator module file naming: `<piece-name>.ts` in lower-kebab-case (matches existing tool-roll style).
- New React component files: `PascalCase.tsx` at one component per file.
- New tests: `<source>.test.ts` next to the source; describe blocks named after the module.
- Geometry helpers reuse the arc-correction work already in tool-roll's `geometry.ts` — port to `lib/pattern-engine/geometry/arc.ts`, do not re-derive.
- Reuse `src/components/ui/accordion.tsx` for the Tri-Zip settings panel sections.
- Reuse the existing `Card` + `Button` shadcn primitives instead of styling from scratch.
- LocalStorage key naming: `stitchsmith.<generator-id>.project` (current Tool Roll uses a similar shape; check `localStorage.ts`).
- SVG path emission: prefer absolute commands (`M`, `L`, `A`, `C`); avoid relative commands to keep diffs and DXF translation predictable.

## Decision Authority

**Agent decides autonomously:**
- Internal file/folder layout inside each phase's deliverable.
- Helper module extraction and naming.
- Test fixture shape and assertion style.
- Variable and function naming.
- Internal types not part of the engine's public surface.
- Per-component prop shape inside `src/components/tri-zip-backpack/`.
- Step `id` and `dependsOn` graph contents (subject to the documented `Step` interface).
- Wording of validation messages, error toasts, and warnings (existing WarningsPanel pattern).
- Eslint rule configuration details (path patterns, severity levels) as long as the constraint is enforced.

**Agent recommends, human approves:**
- pdf-lib vs. an alternative if pdf-lib proves blocked (e.g., a maintenance pause). Default = pdf-lib per the open question.
- DXF helper library choice if a pure-JS writer turns out to be more work than expected.
- First-pass style-preset values (the table above is a starting point; tuning surfaces a recommendation).
- Laptop-sleeve default attachment per preset (table proposes values; phase-3 may revise).
- Migration tolerance change (epsilon = 0.01 mm is the default; deviations escalate).
- New engine public primitives (edge type, annotation kind).
- Any change to the persistence schema after `schemaVersion: 2` lands.

**Human decides:**
- Scope changes — adding or removing features beyond the brain dump.
- Adding any new external dependency beyond pdf-lib (already accepted in scope).
- Bundle-size budget waivers.
- Anything affecting Tool Roll's user-facing behavior beyond the documented migration.
- Public input shape changes after phase-3 launch.
- Removing or relaxing any MUST / MUST NOT constraint above.

## War-Game Results

**Most Likely Failure:** Engine API overfits to Tri-Zip's needs and reveals missing primitives only at phase-4 Tool Roll migration. **Mitigation:** phase-3 includes a "Tool Roll sanity audit" sub-spec — before phase 4 begins, dry-fit the engine API against a small Tool Roll fixture (one tool, one pocket) and surface any missing primitives as additions to the engine before committing to the full Tool Roll migration.

**Scale Stress:** Not relevant — single-user browser app with bounded inputs. The largest credible input (say, 60+ tools or 6-zone backpack) still produces patterns measured in low hundreds of pieces, well within SVG/JS limits.

**Dependency Risk:** pdf-lib version churn or maintenance pause. **Mitigation:** isolated to `lib/pattern-engine/exports/pdf.ts`, lazy-loaded; swap-out is a one-file change. The DXF, SVG, and tiled-HTML exporters have zero external deps.

**Maintenance Assessment (6-month):** Pass. The edge-graph model is documented; phase-1 introduces the `Pattern`/`Piece`/`Edge` types with doc comments explaining the invariants. Module boundaries are clear. **Improvement:** add a brief "why this module exists" doc comment at the top of each `lib/pattern-engine/*/index.ts` and each `generators/tri-zip-backpack/modules/*.ts` file during implementation.

**Assumption Audit Cross-Reference:**
- ASM-3 (pixel-identity) — addressed by the migration-tolerance fix above (geometric equivalence, epsilon = 0.01 mm).
- ASM-4 (six presets in one parameter space) — mitigated by "if a preset needs a new module, that's a green light to add it" (already in plan) + the parameter table makes the assumption concrete.
- ASM-7 (six presets ship in phase-3) — timeline risk acknowledged; phase 3 may be split if six presets don't fit cleanly.

## Evaluation Metadata

- **Evaluated:** 2026-05-25
- **Cynefin Domain:** Complicated
- **Design Gaps Found:** 2 Important, 4 Suggestions (all resolved)
- **Critical Gaps:** 0
- **Framework Additions:** Commander's Intent, Execution Guidance, Decision Authority, War-Game Results
- **Assumptions Audited:** 7 (1 high-severity addressed, 4 medium-severity mitigated, 2 low-severity accepted)

## Next Steps

- [ ] Turn this design into a Forge spec (`/forge docs/plans/2026-05-25-tri-zip-backpack-engine-design.md`)
- [ ] Confirm pdf-lib over jsPDF before phase-2 spec write-up
- [ ] Pick a snapshot tolerance strategy for phase-4 Tool Roll migration
- [ ] Decide laptop-sleeve attachment defaults per style preset before phase-3 spec write-up
