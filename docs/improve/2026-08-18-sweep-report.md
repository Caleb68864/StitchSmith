# Improve Report — StitchSmith — sweep — 2026-08-18

## Summary

One meaningful improvement, in **correctness**: Book Cover drew a doubled seam
allowance on four pieces. This is the same bug class fixed in Zip Pouch earlier
today (`f5c46df`); the sweep confirmed it had a second instance in a different
generator, then swept the remaining generators to confirm no third.

Final validation matches baseline with the new tests added: build pass,
typecheck pass, **1423/1423** tests (baseline 1419, +4 new regression tests).

Stop reason: the confirmed high-value low-risk item is done, and the remaining
candidate needs a design decision rather than a fix.

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
| C1 | `velcro-panel`, `retention-strap`, `spare-mag-pocket` compute `cutWidth = finished + 2*SA` and label themselves with cut dims, but declared `seamAllowances: {}`. `computeSeamAllowancePolygon` reads `piece.seamAllowances ?? {}`, so `{}` still counts as present, `svg.ts`'s guard passes, and `flattenPath` falls back to `defaultSeamAllowance` on every edge. Preview and both export paths pass `inputs.seam_allowance ?? 9.5` unconditionally → an SA line drawn 9.5 mm outside a cut line that already included 9.5 mm. `bookmark-ribbon` had the same declaration but is cut from ribbon stock and takes no allowance. | Added `zeroSeamAllowances(...outlines)` carrying the rationale; applied to the four pieces and the two loop-built maps it replaces. | A sewer following the dashed SA line cuts every affected piece 9.5 mm oversized. The same file already used explicit zeros on six other pieces, so it was mixing both CLAUDE.md conventions — the failure mode that document names. | 4 new tests **confirmed failing on the pre-fix code** ("expected undefined to be +0"), then passing. Full suite 1419→1423, build + typecheck clean. | `eb7a8dd` |

## Swept and found clean (no change)

- `roll-top-sack/buildPattern.ts:156` — explicit per-edge map. Correct.
- `tri-zip-backpack/modules/laptopSleeve.ts:102,126` — `seamAllowances: { [topEdge.id]: 0 }` is **deliberate** Convention A: the piece is finished-size and wants the engine offset, with the top edge zeroed because the hem is already in the cut height. The comment says so. Not a bug.
- `zip-pouch` — excluded from discovery; reworked and reviewed earlier today.

## Deferred

| item | class | why it needs a human |
|---|---|---|
| `book-cover/buildPattern.ts:355` — `card-slot-stack` still declares `seamAllowances: {}` | product/design decision | Unlike the four fixed pieces, it adds **no** SA to its geometry (`pieceW = book_width`). So the fallback offset may be intended (Convention A) or the SA may simply be missing from the geometry. Both readings are defensible; guessing could remove a legitimately needed allowance. Needs someone who knows how card slots are assembled. |

## Remaining ranked queue

Discovery was narrower than a full sweep: three parallel `Explore` lenses
(engine/domain correctness, runtime/state/UI reliability, tests+docs+history)
were launched but had not reported by the end of the run, so their categories
are **not** covered here. Coverage achieved was the seam-allowance bug class
across all generators, traced from direct prior evidence.

Not yet investigated, in rough priority order:
1. Engine geometry edge cases — degenerate offsets, zero-radius arcs, NaN/negative inputs in `src/lib/pattern-engine/geometry/**`.
2. React effect/subscription hygiene and localStorage round-trip validity in `src/state/use*Project.ts`.
3. Test-quality audit — tests that assert nothing, or that restate the implementation formula instead of an independently-derived property (this repo has had at least one real instance).
4. Docs accuracy — the `schemaVersion` table in CLAUDE.md vs the actual `isValid` guards.

## Stop reason

The one confirmed, evidence-backed, low-risk item is implemented and validated.
The only other finding in the swept area needs a design decision. Remaining
categories were delegated but unreported, so continuing would mean starting
discovery over rather than working a ranked queue — better resumed as a fresh
run than extended here.
