# Improve Report — StitchSmith — sweep — 2026-08-18

## Summary

Four meaningful improvements, all **correctness/reliability**:

1. Book Cover drew a doubled seam allowance on four pieces — the same bug class
   fixed in Zip Pouch earlier today (`f5c46df`), found in a second generator.
2. Tool Roll's storage guard accepted a *different generator's* project and a
   malformed record with no `tools`, where the intended behaviour is to fall
   back to the starter project.
3. **Circle Skirt built every pattern at 1/25 scale** out of the box — the most
   severe finding of the run.
4. All six remaining project `isValid` guards accepted `inputs: null`, restoring
   state that white-screens the app unrecoverably on every reload.

Final validation: build pass, typecheck pass, **1431/1431** tests
(baseline 1419, +12 new regression tests, all confirmed failing pre-fix).

Stop reason: both confirmed high-value low-risk items are done; what remains
needs a design decision or is a refactor with no defect attached.

## Baseline

Recorded before any edit:

| check | result |
|---|---|
| build (`tsc && vite build`) | pass (6.55s) |
| typecheck (`tsc --noEmit`) | pass (exit 0) |
| lint | n/a — no lint script in package.json |
| tests (`vitest run`) | 87 files / 1419 passed / **0 failed** |

No pre-existing failures. Every result below is therefore attributable.

User WIP left untouched: `.claude/settings.local.json`, `docs/specs/redteam-report.md`.

## Completed

| id | problem | change | why | validation | commit |
|---|---|---|---|---|---|
| C3 | Circle Skirt's `inputs.ts` documented "unit conversion is the UI layer's responsibility", but no circle-skirt UI file did it — `CircleSkirtPage`'s `toMm` feeds only its own validation messages, while all three `buildPattern` call sites passed raw inputs. The shipped default ships `units:'in'` with waist 28 / length 24, so the engine built **51.6 × 51.6 mm panels** (probed directly) while the mm-based seam (15) and hem (20) allowances stayed full size — not even uniformly scaled. Every SVG/PDF/DXF carried it. | `resolveInputs` normalises to mm, converting only the measurements the settings panel labels `(${units})` (waist, length, hip); the always-mm fields pass through. | Converting in resolve also covers `validateInputs` (which delegates to it) and eliminates the three-call-site failure mode that produced the bug. | Default now resolves to 746 mm panels; independently checked r=116.4, R=726, +20 hem = 746. Old test asserting passthrough replaced. 1426→1429. | `dd8d984` |
| C4 | All six remaining `isValid` guards used `typeof v.inputs === 'object'`; `typeof null === 'object'`. Corrupt localStorage with `"inputs": null` passed, was restored by the `useState` initializer, then threw on first property access. Hooks run at `App.tsx:62-63`, **above** `<ErrorBoundary>` at `:154`, so it is uncatchable and re-read every reload — a blank page surviving refresh. | Shared `isPlainObject` predicate used by all six guards. | `parseProjectJson` already rejected this on the *import* path, with a comment explaining exactly this failure; the storage-load path was never back-ported. | Test confirmed failing on the pre-fix guard (`expected null not to be null`). 1429→1431. | `dd8d984` |
| C2 | `isValidProject` in `src/storage/localStorage.ts` checked `schemaVersion === 1` and nothing else. But CLAUDE.md states schemaVersion 1 is shared by Tool Roll **and** Roll-Top Sack as sibling schemas "distinguished by `generatorId`". Probed directly: a Roll-Top Sack project stored under the tool-roll key was **accepted and loaded** (`generatorId: 'roll-top-sack'`, `tools: undefined`); a bare `{schemaVersion: 1}` was also accepted, leaving `tools` undefined where every consumer calls `project.tools.map(...)` — a crash on load instead of the intended starter-project fallback. | Guard now also requires `generatorId === 'tool-roll'`, `Array.isArray(tools)`, and a non-null `settings` object, matching all six sibling hooks. | Tool Roll is the only generator not using the shared `makeProjectStorage({ isValid })` helper, so it silently missed the discriminator the other six enforce. | 3 new tests confirmed failing pre-fix (incl. `expected 'roll-top-sack' to be 'tool-roll'`). 1423→1426, build + typecheck clean. `serialize()` has always written the three checked fields, so no persisted project is orphaned. | `6e87f28` |
| C1 | `velcro-panel`, `retention-strap`, `spare-mag-pocket` compute `cutWidth = finished + 2*SA` and label themselves with cut dims, but declared `seamAllowances: {}`. `computeSeamAllowancePolygon` reads `piece.seamAllowances ?? {}`, so `{}` still counts as present, `svg.ts`'s guard passes, and `flattenPath` falls back to `defaultSeamAllowance` on every edge. Preview and both export paths pass `inputs.seam_allowance ?? 9.5` unconditionally → an SA line drawn 9.5 mm outside a cut line that already included 9.5 mm. `bookmark-ribbon` had the same declaration but is cut from ribbon stock and takes no allowance. | Added `zeroSeamAllowances(...outlines)` carrying the rationale; applied to the four pieces and the two loop-built maps it replaces. | A sewer following the dashed SA line cuts every affected piece 9.5 mm oversized. The same file already used explicit zeros on six other pieces, so it was mixing both CLAUDE.md conventions — the failure mode that document names. | 4 new tests **confirmed failing on the pre-fix code** ("expected undefined to be +0"), then passing. Full suite 1419→1423, build + typecheck clean. | `eb7a8dd` |

## Swept and found clean (no change)

- `roll-top-sack/buildPattern.ts:156` — explicit per-edge map. Correct.
- `tri-zip-backpack/modules/laptopSleeve.ts:102,126` — `seamAllowances: { [topEdge.id]: 0 }` is **deliberate** Convention A: the piece is finished-size and wants the engine offset, with the top edge zeroed because the hem is already in the cut height. The comment says so. Not a bug.
- `zip-pouch` — excluded from discovery; reworked and reviewed earlier today.

## Deferred

| item | class | why it needs a human |
|---|---|---|
| `book-cover/buildPattern.ts:355` — `card-slot-stack` still declares `seamAllowances: {}` | product/design decision | Unlike the four fixed pieces, it adds **no** SA to its geometry (`pieceW = book_width`). So the fallback offset may be intended (Convention A) or the SA may simply be missing from the geometry. Both readings are defensible; guessing could remove a legitimately needed allowance. Needs someone who knows how card slots are assembled. |
| Tool Roll uses a bespoke storage module rather than the shared `makeProjectStorage({ isValid })` | architectural | Consolidating would remove this whole divergence class at the root, but it is a refactor with no remaining defect attached now that C2 is fixed. Record, don't build. |

## Remaining ranked queue

Three parallel `Explore` lenses were launched (engine/domain correctness,
runtime/state/UI reliability, tests+docs+history). All three went idle without
their findings ever reaching this session, and a follow-up request for their
lists produced only further idle notifications — so **no lens output informed
this run**. Everything above was found by direct investigation.

Covered directly: the seam-allowance bug class across all generators, and the
CLAUDE.md `schemaVersion` table vs the actual `isValid` guards (which led to C2 —
the table itself is accurate; the divergence was Tool Roll's guard).

**Update:** the runtime lens did eventually report (after the report was first
written), with 8 findings. Its two most severe — C3 and C4 above — were verified
and fixed. Its remaining six are queued below. Note one correction: it proposed
converting `waist_ease`, `hip_circumference` and `fabric_width` for C3; the
types and panel labels show ease and fabric_width are always-mm, so converting
them would have introduced a new bug. Only waist/length/hip are display-unit.

It also explicitly cleared several areas: `Toaster` (no leak/loop),
`PatternViewport` (observers/listeners/rAF all cleaned), blob URLs (every
`createObjectURL` has a matching revoke), `FileReader` (both call sites wire
`onerror`), Reset confirmations, and lazy-route `ErrorBoundary`/`Suspense`
ordering.

Remaining queue, highest value first:
1. **Circle Skirt unit toggle reinterprets numbers instead of converting them** (`CircleSkirtSettingsPanel.tsx:161,169`). Toggling mm↔in silently changes the garment by 25.4×. Same shape reported in `RollTopSackSettingsPanel.tsx:92,100` and `BookCoverSettingsPanel.tsx:450,458` — unverified. Note this *masks* C3 during manual testing.
2. **Async export handlers are `try/finally` with no `catch`** in three near-identical ExportPanels (circle-skirt, tri-zip, mag-pouch). A rejected dynamic `import()` (chunk 404 after redeploy) silently no-ops the export; the toast module already exists.
3. **`importProject` skips the generatorId guard** in mag-pouch and tri-zip, which their five siblings have. Mitigated today by `parseProjectJson`; defense-in-depth gap.
4. Circle Skirt SA/hem/band inputs hard-labelled "(mm)" while the panel offers an inches toggle — fold into item 1.
5. Debounced autosave never flushes on `pagehide` — up to 250 ms of edits lost on tab close.
6. Circle Skirt tiled-HTML export silently no-ops when the popup is blocked; tri-zip already handles this better by downloading the file.
7. The three ExportPanels are near-verbatim copies — consolidating would fix items 2 and 6 at once. Architectural; record only.

Still not investigated (lenses never reported):
- Engine geometry edge cases — degenerate offsets, zero-radius arcs, NaN/negative inputs in `src/lib/pattern-engine/geometry/**`.
- Test-quality audit — tests that assert nothing or restate the implementation formula.

## Stop reason

The four confirmed, evidence-backed items are implemented and validated
against the baseline. What remains in the swept areas needs either a design
decision (card-slot-stack) or is a refactor with no defect attached (Tool Roll
storage consolidation). The three uncovered categories have no ranked candidates
yet because the delegated lenses never reported — continuing would mean starting
discovery from scratch, which is better done as a fresh run than appended here.
