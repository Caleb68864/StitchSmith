---
type: redteam-report
generated: 2026-05-25
target: 2026-05-25-tri-zip-backpack-engine.md
findings_count: 6
critical: 1
advisory: 5
patched: 6
skipped: 0
---

# Red Team Review: 2026-05-25-tri-zip-backpack-engine.md

All findings patched in place. Spec is ready for `/forge-prep`.

## CRITICAL Findings (1)

**C-1: "Visually-distinct" preset claim has no automated check** (QA Tester) — PATCHED
- Location: SS-03 acceptance criteria
- Issue: Verification asserted six presets produce visually-distinct patterns but SS-03 only checked they don't throw. Six identical empty-of-throw patterns would have passed.
- Fix applied: Added `[BEHAVIORAL]` criterion that given identical dimensions, the six presets produce Pattern objects differing in at least one observable (piece count, bbox area, strap_width, back panel shape) AND no two presets produce byte-identical SVG output.

## ADVISORY Findings (5)

**A-1: Project JSON import lacks structural validation** (Security) — PATCHED
- Location: SS-02 `exports-projectJson.test.ts` criteria
- Fix applied: Added `[BEHAVIORAL]` criterion that `projectJson` import structurally validates the parsed object against the generator's input schema and returns a typed error on mismatch.

**A-2: v1→v2 migrator semantics ambiguous** (Data Steward) — PATCHED
- Location: SS-02 migrator criterion + Edge Cases
- Issue: Original criterion implied a Tool Roll → Tri-Zip "upgrade", but they are sibling schemas. The migrator chain is for within-generator forward migration.
- Fix applied: Rewrote the migrator criterion to test the chain mechanism with a synthetic within-generator example (`tri-zip-v2 → tri-zip-v3` fixture). Added Edge Cases entry clarifying cross-generator loads surface the switch-generator error from SS-05. Renamed `v1-to-v2.ts` file → `migrators/index.ts`.

**A-3: No criterion for input validation surfacing field-level errors** (Developer + End User) — PATCHED
- Location: SS-04 acceptance criteria
- Fix applied: Added `[BEHAVIORAL]` criterion that invalid Tri-Zip inputs (negative dim, NaN, zero, out-of-range percent) surface per-field messages in WarningsPanel and disable all export buttons.

**A-4: ExportPanel exporter sourcing pattern not specified** (Integration Architect) — PATCHED
- Location: SS-04 ExportPanel
- Fix applied: Added `[STRUCTURAL]` criterion that ExportPanel uses the `lazy.ts` façade for PDF/DXF/tiledHtml and direct imports for SVG / cut list / instructions. Same pattern mirrored in SS-05 for Tool Roll's ExportPanel.

**A-5: DXF entity types unspecified** (Developer) — PATCHED
- Location: SS-02 DXF criterion
- Fix applied: Added `[STRUCTURAL]` criterion mapping `Edge` variants to DXF entities: `Straight` → `LINE`, `Arc` → native `ARC` (not polyline-sampled), `Bezier` → `LWPOLYLINE` with configurable segment count (default 32).

## Informational (not patched)

**S-1: SS-03 (14 modules) and SS-04 (14 files) are large.** Acceptable for `/forge-prep` to refine into phase specs with per-step implementation guidance. Chain handles it.

## Construction-Site Check

No findings. All wire/integrate/register language in SS-04 and SS-05 names concrete call sites (ExportPanel, patternRegistry.ts, App.tsx, useToolRollProject, calculateToolRollLayout).

## Role Scorecards

| Role | Findings |
|---|---|
| Developer Implementer | 2 |
| QA Tester | 1 |
| End User | 1 |
| Integration Architect | 1 |
| Scope Realist | 1 (informational) |
| Security Auditor | 1 |
| SRE / Operator | 0 |
| Data / Migration Steward | 1 |
| Product / Business | 0 |
