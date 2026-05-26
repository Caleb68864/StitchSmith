---
type: phase-spec
sub_spec_id: SS-05
phase: run
wave: 4
depends_on: ['SS-01', 'SS-04']
dispatch: factory
master_spec: "docs/specs/2026-05-25-tri-zip-backpack-engine.md"
title: "Tool Roll migration onto the engine + geometric-equivalence regression test"
---

# SS-05 — Tool Roll migration

## Context

Refactor the existing Tool Roll generator to consume `src/lib/pattern-engine/`. The Tool Roll page, settings, and export buttons must keep their current behavior. Output must be geometrically equivalent to pre-migration (epsilon = 0.01 mm). The existing Vitest suite passes unchanged. Tool Roll projects carry `schemaVersion: 1`; v1 ↔ v2 are sibling schemas (Tool Roll vs. Tri-Zip), not an upgrade chain.

**CRITICAL:** Do NOT loosen the epsilon to make the test pass. Escalate per master ET3.

## Scope

- Refactor `src/generators/tool-roll/calculateToolRollLayout.ts`, `geometry.ts`, `grouping.ts`, `types.ts`, `constructionNotes.ts`, `defaults.ts`, `renderHelpers.ts` to consume the engine.
- Refactor `src/export/exportSvg.ts`, `exportPrintableHtml.ts`, `exportProjectJson.ts`, `importProjectJson.ts` to use the engine's exporters + projectJson with `schemaVersion: 1` + `generatorId: 'tool-roll'`.
- Refactor `src/components/tool-roll/PatternPreview.tsx`, `ExportPanel.tsx`, `ConstructionNotes.tsx` to consume engine outputs.
- Refactor `src/state/useToolRollProject.ts` and `src/storage/localStorage.ts` for the new persistence envelope.
- Commit a snapshot of the current Tool Roll SVG output BEFORE the refactor.
- Add `__tests__/geometric-equivalence.test.ts`.

## Files

- **Files (new):** `src/generators/tool-roll/__tests__/migration-snapshot.svg`, `src/generators/tool-roll/__tests__/geometric-equivalence.test.ts`.
- **Files (modify):** see master SS-05 (15 files).

## Interface Contracts

### Pattern (consumed)
- Direction: SS-01 → SS-05
- Owner: SS-01

### exportSvg / exportTiledHtml / exportProjectJson (consumed)
- Direction: SS-01, SS-02 → SS-05
- Owner: SS-01 / SS-02

## Implementation Steps (TDD)

### Step 1. Snapshot the current output FIRST

Before any code change. From the current working tree (with the existing Tool Roll behavior):

```bash
# Generate the SVG for the default sample project (4 wrenches) and commit it
# A small script in scripts/snapshot-tool-roll.mjs can do this:
node scripts/snapshot-tool-roll.mjs > src/generators/tool-roll/__tests__/migration-snapshot.svg
git add src/generators/tool-roll/__tests__/migration-snapshot.svg
git commit -m "test(tool-roll): snapshot current SVG output before engine migration [SS-05]"
```

If `scripts/snapshot-tool-roll.mjs` doesn't exist, create it inline: import `calculateToolRollLayout` + `sampleTools` + `defaultSettings`, run, output the SVG via the current (pre-migration) `exportSvg`. Commit BOTH the snapshot and the script. The snapshot commit must precede any migration commit (verified via `git log`).

### Step 2. Write the geometric-equivalence test

`src/generators/tool-roll/__tests__/geometric-equivalence.test.ts`. Algorithm:
- Load the snapshot SVG. Parse `<path>` elements by their `data-piece-id` attribute.
- Run the new engine-backed path for the same sample project. Build the Pattern via the refactored code.
- For each piece in both, sample N points along each path: N=64 per closed path, N=32 per open path.
- Assert every sample is within 0.01 mm of the snapshot's corresponding sample.
- The test should run FAST (~1 second). Cache the parsed snapshot.

Run: expect fail (no refactor yet).

### Step 3. Refactor types.ts to use engine types

Replace the local `Point`, `Path`-like types in `tool-roll/types.ts` with imports from `src/lib/pattern-engine/graph`. Keep Tool Roll's own input types (`Tool`, `ToolRollSettings`, `ToolRollProject`) — those are domain inputs, not graph.

### Step 4. Refactor geometry.ts

Replace local geometry math with engine helpers. Re-export from `src/lib/pattern-engine/geometry` where appropriate. After this step, no math is duplicated.

### Step 5. Refactor calculateToolRollLayout to produce a Pattern

The function's return shape changes from the current `ToolRollLayout` to a `Pattern`. Update grouping.ts and constructionNotes.ts to contribute Pieces and Steps respectively. Update `renderHelpers.ts` to be a thin adaptor (or delete if no longer needed).

### Step 6. Refactor exporters

`src/export/exportSvg.ts` → call engine's `exportSvg(pattern)` directly.
`src/export/exportPrintableHtml.ts` → call engine's `loadTiledHtmlExporter()` then `exportTiledHtml(pattern, opts)`.
`src/export/exportProjectJson.ts` → wrap inputs in `{ schemaVersion: 1, generatorId: 'tool-roll', inputs }` via `exportProjectJson` from SS-02.
`src/export/importProjectJson.ts` → use `importProjectJson` with a Tool Roll input schema; on `generatorId: 'tri-zip-backpack'` surface the friendly switch-generator error.

### Step 7. Refactor components

`PatternPreview.tsx` → consume the engine's SVG output.
`ExportPanel.tsx` → use the lazy façade for PDF/DXF/tiledHtml, mirror the pattern from SS-04. (Tool Roll didn't expose PDF/DXF before — these become available now, optional to surface buttons.)
`ConstructionNotes.tsx` → consume engine's `instructions/compile` output.

### Step 8. Refactor state + storage

`useToolRollProject.ts` — persists the new envelope shape. `localStorage.ts` — accommodate the schemaVersion+generatorId envelope. Old localStorage data without schemaVersion is assumed to be v0 and migrated forward at load time (legacy compat shim — small one-time migration; no schemaVersion: 0 file exists, but in-tree dev users may have one).

### Step 9. Run the geometric-equivalence test

`npm test -- --run src/generators/tool-roll/__tests__/geometric-equivalence.test.ts`. Iterate on the refactor until it passes. **Do not loosen epsilon.**

### Step 10. Run the entire existing Tool Roll test suite

`npm test -- --run src/generators/tool-roll/`. Must pass with zero test edits beyond adding the new file in Step 2.

### Step 11. Run App-level integration test

`npm test -- --run src/app/App.test.tsx`. Must pass unchanged.

### Step 12. Cross-generator load test

Test (add to `src/export/__tests__/importProjectJson.test.ts` or similar): loading a v2 Tri-Zip JSON on the Tool Roll page returns a friendly switch-generator error (not a crash, not partial state).

### Step 13. Build + bundle check

`npm run build`. Main bundle ≤ 350 KB gzipped. Escalate if over.

### Step 14. Manual smoke test (HUMAN REVIEW)

Run `npm run dev`. Open Tool Roll. Add a tool. Change ease. Change units. Export SVG. Export tiled HTML. Save Project. Reset. Re-import. All succeed without console errors. Visual diff vs. pre-migration SVG: no visible regressions (pockets, flap, hem folds, tie marks, labels).

### Step 15. Commit

```bash
git add src/generators/tool-roll src/export src/components/tool-roll src/state/useToolRollProject.ts src/storage/localStorage.ts
git commit -m "refactor(tool-roll): migrate to pattern-engine; geometric-equivalence regression test (eps=0.01mm) [SS-05]"
```

## Verification Commands

- `npm test -- --run src/generators/tool-roll/__tests__/geometric-equivalence.test.ts`
- `npm test -- --run`
- `npm run build`
- Manual smoke test (HUMAN REVIEW)

## Checks

| Criterion | Type | Command |
|---|---|---|
| Migration snapshot committed | STRUCTURAL | `test -f src/generators/tool-roll/__tests__/migration-snapshot.svg \|\| (echo "FAIL: snapshot missing" && exit 1)` |
| Snapshot precedes refactor | MECHANICAL | `git log --oneline --follow src/generators/tool-roll/__tests__/migration-snapshot.svg \| tail -1 \| grep -q "snapshot" \|\| (echo "FAIL: snapshot not committed first" && exit 1)` |
| Equivalence test exists | STRUCTURAL | `test -f src/generators/tool-roll/__tests__/geometric-equivalence.test.ts \|\| (echo "FAIL: equivalence test missing" && exit 1)` |
| Equivalence test passes | MECHANICAL | `npm test -- --run src/generators/tool-roll/__tests__/geometric-equivalence.test.ts 2>&1 \| tail -1; [ ${PIPESTATUS[0]} -eq 0 ] \|\| (echo "FAIL: equivalence test failed" && exit 1)` |
| All Tool Roll tests pass | MECHANICAL | `npm test -- --run src/generators/tool-roll/ 2>&1 \| tail -1; [ ${PIPESTATUS[0]} -eq 0 ] \|\| (echo "FAIL: tool-roll suite" && exit 1)` |
| App.test.tsx passes unchanged | MECHANICAL | `npm test -- --run src/app/App.test.tsx 2>&1 \| tail -1; [ ${PIPESTATUS[0]} -eq 0 ] \|\| (echo "FAIL: App test" && exit 1)` |
| No duplicated geometry math | MECHANICAL | `! grep -rE "function (offsetPath\|arcCorrect)" src/generators/tool-roll/ \|\| (echo "FAIL: duplicated geometry math" && exit 1)` |
| Build succeeds + bundle in budget | MECHANICAL | `npm run build \|\| (echo "FAIL: build" && exit 1)` |

## Acceptance Criteria (from master SS-05)

All criteria from master SS-05 apply, including:
- Snapshot committed before refactor (git history check).
- Geometric equivalence at epsilon 0.01 mm.
- Existing Vitest suite passes unchanged.
- v1 ↔ v2 cross-generator loads surface friendly switch-generator error.
- HUMAN REVIEW: visual diff of SVG export is acceptable.

## Escalation Triggers

- **Epsilon failure.** Equivalence test fails after best-effort migration. Escalate with the diff data. DO NOT loosen epsilon.
- **Bundle budget breach.** Main bundle > 350 KB gzipped. Do NOT delete lazy-loaded imports.
- **Tool Roll behavior change.** Any user-visible change beyond the documented migration. Escalate.
