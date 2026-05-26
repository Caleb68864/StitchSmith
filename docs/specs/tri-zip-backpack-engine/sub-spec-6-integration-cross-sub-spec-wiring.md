---
type: phase-spec
sub_spec_id: SS-06
phase: verify
wave: 5
depends_on: ['SS-01', 'SS-02', 'SS-03', 'SS-04', 'SS-05']
dispatch: factory
master_spec: "docs/specs/2026-05-25-tri-zip-backpack-engine.md"
title: "Integration — Cross-Sub-Spec Wiring (auto-generated)"
---

# SS-06 — Integration verification

## Context

Auto-generated terminal sub-spec. Confirms the entire system works end-to-end after waves 1–4. No new feature work — only verification + any small wiring fixes surfaced by exercising the full system.

## Scope

- Run the dev server (`npm run dev`).
- Exercise the primary end-to-end flows from the master spec's `## Verification` section.
- Confirm landing page lists both generators, both routes work.
- Confirm all six Tri-Zip exporters work end-to-end.
- Confirm Tool Roll still works end-to-end (regression).
- Confirm bundle size at production build.
- Confirm cross-generator project JSON loads surface friendly errors.

## Files

- **Files (new):** `docs/specs/tri-zip-backpack-engine/SS-06-integration-evidence.md`
- **Files (modify):** none expected. If wiring fixes are needed, edit the relevant component file from SS-04 or SS-05 and note it in the evidence file.

## Implementation Steps

### Step 1. Production build

```bash
npm run build
```

Capture the output. Confirm main bundle ≤ 350 KB gzipped. Confirm pdf-lib chunk is separate. Record sizes in evidence file.

### Step 2. Full test suite

```bash
npm test -- --run
```

All pass. Capture summary in evidence file.

### Step 3. Dev server + manual smoke

```bash
npm run dev
```

Walk through:
1. Landing page renders. Both "Tool Roll" and "Tri-Zip Backpack" cards present, both clickable.
2. Click Tri-Zip → settings panel renders with accordion sections. Volume readout updates as dimensions change.
3. Cycle through all six style presets → preview updates visibly for each.
4. Toggle `zipper_method: direct` vs `gusseted` → preview shows/hides the zipper gusset piece.
5. Export each format (SVG, Print HTML, PDF, DXF, Cut List, Instructions, Save Project). Verify each downloads / opens cleanly without console errors.
6. Import a saved Tri-Zip project → state restored.
7. Click "Back to Patterns" → return to landing.
8. Click Tool Roll → page renders. Add a tool, change ease, export SVG, save project, reset, re-import. No regressions.
9. From the Tool Roll page, attempt to import a Tri-Zip project JSON → friendly switch-generator error appears.

### Step 4. Document evidence

Write `SS-06-integration-evidence.md` with:
- Bundle sizes from Step 1.
- Test counts from Step 2.
- Pass/fail per smoke-test scenario from Step 3.
- Any console errors observed + the file fix applied + the commit hash.

### Step 5. Commit the evidence

```bash
git add docs/specs/tri-zip-backpack-engine/SS-06-integration-evidence.md
git commit -m "verify(integration): SS-06 cross-sub-spec wiring evidence [SS-06]"
```

## Verification Commands

- `npm run build` — production bundle in budget
- `npm test -- --run` — all suites green
- Manual end-to-end smoke (HUMAN REVIEW)

## Checks

| Criterion | Type | Command |
|---|---|---|
| Evidence file present | STRUCTURAL | `test -f docs/specs/tri-zip-backpack-engine/SS-06-integration-evidence.md \|\| (echo "FAIL: evidence missing" && exit 1)` |
| Full test suite green | MECHANICAL | `npm test -- --run 2>&1 \| tail -1; [ ${PIPESTATUS[0]} -eq 0 ] \|\| (echo "FAIL: full suite" && exit 1)` |
| Build succeeds | MECHANICAL | `npm run build \|\| (echo "FAIL: build" && exit 1)` |

## Acceptance Criteria

- `[INTEGRATION]` The primary end-to-end flow from the master spec's `## Verification` section succeeds when all sub-specs are deployed together. Cross-sub-spec wiring is correct.
- `[HUMAN REVIEW]` Manual smoke-test scenarios in Step 3 all pass without console errors.
- `[STRUCTURAL]` `SS-06-integration-evidence.md` is committed.

## Step N. Commit the artifact

The worker MUST commit the artifact before reporting `status: complete`. Hollow-success will be downgraded to `deferred_manual` by the orchestrator.

```bash
git add docs/specs/tri-zip-backpack-engine/SS-06-integration-evidence.md
git commit -m "factory(SS-06): integration evidence [factory-managed]"
```
