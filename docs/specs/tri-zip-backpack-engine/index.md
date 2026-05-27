---
type: phase-spec-index
master_spec: "docs/specs/2026-05-25-tri-zip-backpack-engine.md"
date: 2026-05-25
sub_specs: 6
---

# Tri-Zip Backpack Generator + Reusable Pattern Engine — Phase Specs

Refined from [2026-05-25-tri-zip-backpack-engine.md](../2026-05-25-tri-zip-backpack-engine.md).

| Sub-Spec | Title | Wave | Dependencies | Phase Spec |
|----------|-------|------|--------------|------------|
| 1 | Engine foundation — graph + geometry + materials + instructions + baseline exporters + boundary enforcement | 1 | none | [sub-spec-1-engine-foundation.md](sub-spec-1-engine-foundation.md) |
| 2 | Engine exporters — PDF, DXF, cut list + BOM, schemaVersion migrator | 2 | SS-01 | [sub-spec-2-engine-exporters.md](sub-spec-2-engine-exporters.md) |
| 3 | Tri-Zip generator core — modules, style presets, buildPattern | 2 | SS-01 | [sub-spec-3-tri-zip-generator-core.md](sub-spec-3-tri-zip-generator-core.md) |
| 4 | Tri-Zip UI, landing-page wiring, ExportPanel | 3 | SS-02, SS-03 | [sub-spec-4-tri-zip-ui.md](sub-spec-4-tri-zip-ui.md) |
| 5 | Tool Roll migration onto the engine | 4 | SS-01, SS-04 | [sub-spec-5-tool-roll-migration.md](sub-spec-5-tool-roll-migration.md) |
| 6 | Integration — cross-sub-spec wiring verification (auto-generated) | 5 | SS-01, SS-02, SS-03, SS-04, SS-05 | [sub-spec-6-integration-cross-sub-spec-wiring.md](sub-spec-6-integration-cross-sub-spec-wiring.md) |

## Requirement Traceability Matrix

| Requirement | Covered By |
|---|---|
| R1: `src/lib/pattern-engine/` library exists with submodules | SS-01 |
| R2: Edge-graph model (Point/Edge/Path/Piece/Pattern) with mirror, per-edge SA, shared edges | SS-01 |
| R3: Six engine exporters (svg, tiledHtml, pdf, dxf, cutList, instructions) | SS-01, SS-02 (split) |
| R4: Engine boundary forbids imports from generators/components | SS-01 |
| R5: `src/generators/tri-zip-backpack/` produces Pattern from inputs + preset | SS-03 |
| R6: Six style presets ship | SS-03 |
| R7: Tri-Zip accordion UI with live volume readout | SS-04 |
| R8: Landing page lists Tool Roll + Tri-Zip via registry | SS-04 |
| R9: Project JSON `schemaVersion` + per-version migrator chain | SS-02, SS-05 (split) |
| R10: Tool Roll migrated with geometric-equivalence test (epsilon = 0.01 mm) | SS-05 |
| R11: Existing Tool Roll vitest suite passes unchanged after migration | SS-05 |
| R12: Main bundle ≤ 350 KB gzipped; PDF/DXF/tiled-print lazy-loaded | SS-02, SS-04 (split) |

## Wave Plan

- **Wave 1:** SS-01 (foundation; no deps)
- **Wave 2:** SS-02 + SS-03 (both depend only on SS-01; can run in parallel)
- **Wave 3:** SS-04 (needs SS-02's exporters + SS-03's generator)
- **Wave 4:** SS-05 (Tool Roll migration; needs engine and the new landing/registry from SS-04)
- **Wave 5:** SS-06 (end-to-end integration verification)

## Execution

Run `/forge-run docs/specs/2026-05-25-tri-zip-backpack-engine.md` to execute all phase specs.
Run `/forge-run docs/specs/2026-05-25-tri-zip-backpack-engine.md --sub N` to execute a single sub-spec.
