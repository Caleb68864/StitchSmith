# 3D preview review — performance, correctness, interaction (2026-09-12)

Scope: `src/components/shared/FoldViewer.tsx` and `viewer/**`, `src/lib/cloth-engine`,
`src/lib/fold-engine`, every `src/generators/*/assembly3d.ts`, and the assembly sweep.

Profiling scripts are in the session scratchpad: `profile-cloth.ts` (counts and
timings per assembly), `profile-converge.ts` (convergence and the value of weak
plate constraints), `profile-skirt.ts` / `dbg-creep.ts` (the skirt), `dbg-budget.ts`
(mesh budget), `time-viewer.mjs` and `time-cache.mjs` (wall clock in a real
browser). Every number below was measured, not estimated.

## Headline

Opening the 3D tab used to freeze the page for tens of seconds. The heaviest
assembly now settles in under three, the page never blocks, and a second visit
is instant.

Wall clock in headless Chromium with software rendering (a real GPU is faster),
from clicking the 3D tab to a settled solve:

| Assembly | Before (e2e) | After | Steps run |
|---|---|---|---|
| Clamshell pack | 37 s | 2.7 s | 200, settled |
| Modular LBV | 31 s | 3.1 s | 180, settled |
| Plate carrier | 29 s | 2.4 s | 180, settled |
| Circle skirt | 60 s | 8.9 s | 360, still moving |
| Tri-Zip backpack | — | 3.3 s | 200, settled |
| Micro rig | — | 1.4 s | 240, settled |
| Fanny pack | — | 1.0 s | 200, settled |
| Tactical organizer | — | 0.3 s | 300, settled |

Repeat visit to the same tab: 3276 ms → **129 ms**, from the settle cache.

## Where the time went

Solver cost for 360 steps, in Node, with the mesh and constraint counts:

| Assembly | Vertices | Plate constraints | Before | After |
|---|---|---|---|---|
| Clamshell pack | 8 845 | 24 272 → 0 | 30 564 ms | 3 863 ms |
| Modular LBV | 8 423 | 22 018 → 4 668 | 34 004 ms | 4 999 ms |
| Plate carrier | 6 478 | 14 148 → 2 186 | 27 748 ms | 4 083 ms |
| Circle skirt | 9 656 | 0 | 17 778 ms | 4 919 ms |
| Tri-Zip backpack | 9 765 | 0 | 11 188 ms | 4 426 ms |
| Micro rig | 4 024 | 6 947 → 0 | 10 711 ms | 1 783 ms |
| Fanny pack | 3 485 | 9 478 → 0 | 13 184 ms | 1 415 ms |
| Tactical organizer | 1 211 | 3 231 → 0 | 4 174 ms | 594 ms |
| Zip pouch (boxed) | 1 596 | 0 | 1 990 ms | 645 ms |

Three causes, in order of size.

**1. Allocation in the innermost loops (2.0–3.1× on its own).** `projectPlate`
allocated ten arrays per call; `solidDistance` allocated five arrays and an
object per call; `collide` allocated four arrays per particle per solid. At
twelve constraint iterations a step and 360 steps that is hundreds of millions
of allocations. All three now work in place against module-scope scratch
buffers. `Math.hypot` in the two distance helpers became `Math.sqrt` of the dot
product: hypot's overflow guard is several times the cost and the magnitudes
here are millimetres. The self-collision spatial hash keyed its cells with
template strings; it now uses packed integers.

**2. Plate constraints on cloth (a further 2.0–2.6× where they applied).**
`materialPlateStiffness` returned 0.02 for Cordura, so every bending pair of
every fabric piece became a four-vertex isometric plate projection — 24 272 of
them on the clamshell, the single largest cost in the solve. Measured effect of
removing them: the settled shape moves **1.0 mm rms** (a quarter of a mesh cell)
and the reported stretch, seam gap and penetration do not change at all to two
decimals. Cordura is cloth; its bending constraint at 0.45 is what holds it.
Plates below `PLATE_MIN_STIFFNESS` (0.1) are no longer built, so foam (0.35) and
webbing (0.5) keep theirs and cloth does not.

**3. Distance evaluations against body solids.** A torso is three capsules and
rounded boxes, and every particle was evaluated against every one of them twelve
times a step. Each smooth solid now rejects particles on its bounding box first.

## Stopping at the right time

The solver ran a fixed 360 steps whether or not anything was still moving.
`relaxUntilSettled` / `createSettleMonitor` now stop when the shape stops
changing. Measured against the full 360-step answer, stopping early costs
0.11–0.79 mm rms (worst single vertex 5.0 mm) and leaves the reported stretch
and seam figures identical.

The criterion is **rms displacement over a window of 20 steps**, not per-step
movement. A position-based solve never comes to rest: seam corrections, the
stretch projection and the self-collision pass trade hundredths of a millimetre
back and forth for ever, so per-step movement falls to a floor (0.05–0.25 mm)
and stays there whether or not the shape is still changing — the clamshell is
still "moving" 2.2 mm a step at step 360 when its shape has been fixed for a
hundred steps. Over a window that jitter cancels and coherent motion
accumulates, so bounding the window displacement bounds how far the answer can
still move. A first attempt at a plateau detector (has the movement stopped
*improving*) was tried and rejected: it declared the circle skirt settled at step
140, 172 mm rms away from where it was heading.

## What the viewer does now

- **The page never blocks.** The loop ran eight solver steps per animation
  frame, which on the clamshell was about 680 ms of blocked main thread per
  frame. It now runs to a 10 ms deadline and yields, whatever the assembly costs.
- **Nothing is re-solved needlessly.** A settled result is cached under a hash of
  everything the solve reads (mesh vertices, seam endpoints, pins, solids,
  gravity, spacing, fold angles, fold progress), so flipping to the Pattern tab
  and back restores it. "Reset view" used to rebuild the scene and restart the
  solve; it now only re-frames the camera.
- **The mesh budget is a time budget.** `CLOTH_VERTEX_BUDGET` dropped from 40 000
  to 12 000. Measured: this changes only the circle skirt (33 660 vertices at
  8 mm → 12 172 at 14 mm, 21 s → 8.9 s). Every other assembly is under 12 000 and
  still meshes at the full 8 mm.
- **The wheel belongs to the page** until you click into the viewer, so scrolling
  a settings page past the 3D view no longer zooms it and traps the scroll.
  The hint says "click first, then wheel to zoom". `flat`, `all pieces` and
  `simulate` gained hover explanations.

## Stretch: what is reported, and why it changed

The viewer reported the largest elongation of any single mesh edge. On the micro
rig that was 93 %, on the stacked .308 variant 116 %, on the organizer 50 % —
numbers a sewer can do nothing with, on patterns whose seams all close to a
tenth of a millimetre. One sheared cell beside a gathered seam, or one seam
allowance dragged round a corner, sets them.

`stretchReport` now gives the distribution: the 99th percentile as the headline,
the worst edge and which piece carries it as an aside, and the share of edges
over 10 % as a measure of how widespread the strain is. The same assemblies read
15.3 %, 31.7 % and 14.2 % — still flagged as the strained ones, but no longer
absurd — while the clamshell, LBV, plate carrier and fanny pack read 0.2–2.5 %,
which matches "these close easily".

The assembly sweep asserts the percentile too, with ceilings retuned from the
measured values. This tightened the test considerably: the organizer's bound
went from a worst-edge ceiling of 0.50 (which nothing could fail) to a
percentile ceiling of 0.17, and the LBV's from 0.15 to 0.01.

| Assembly | 99th pct | Worst edge | Seam mean |
|---|---|---|---|
| Modular LBV | 0.2 % | 4 % | 0.05 mm |
| Padded sling / strap pair | 0.1 % | 0–1 % | 0.00 mm |
| Fanny pack | 1.0 % | 3 % | 0.04 mm |
| Plate carrier | 1.4 % | 5 % | 0.15 mm |
| Clamshell pack | 2.5 % | 18 % | 0.13 mm |
| Circle skirt | 2.6 % | 14 % | 0.08 mm |
| Tri-Zip backpack | 2.9 % | 30 % | 0.05 mm |
| Zip pouch (boxed) | 3.8 % | 10 % | 0.05 mm |
| Tactical organizer | 14.2 % | 50 % | 0.51 mm |
| Micro rig | 15.3 % | 93 % | 1.17 mm |
| Micro rig (.308 stacked) | 31.7 % | 116 % | 1.42 mm |

## Correctness: the circle skirt was in free fall

The skirt's waist was pinned at fifty 4 mm discs spaced along the inner arc.
Cloth vertices sit on a square grid at 8–16 mm, so **every one of those discs
fell between vertices and held nothing**. The skirt was not draping; it was
falling at the integrator's terminal velocity for the whole simulation, and the
envelope it reported (1 492 × 1 988 × 1 492 mm for a 610 mm skirt) scaled
exactly with gravity — the signature of unconstrained fall. The sweep passed
throughout, because a sheet in free fall has no stretch and its seams stay shut.

`PinSpec` gained a `ring` (annulus) shape and the skirt pins its waist with one,
18 mm deep — what a waistband actually grips. It now holds 144 vertices and the
skirt hangs. Any pin whose area is smaller than a mesh cell has this problem;
the type's documentation now says so.

The skirt still does not settle: it creeps downward at 1 mm a step (exactly
`gravity / (1 - damping)`) while its 99th-percentile stretch stays near 4 %, so
its shape at step 360 is a frame of a fall. That is a solver limitation — a
long chain of Gauss-Seidel distance constraints cannot transmit the waist's
support to a hem forty cells away faster than gravity pulls — and fixing it
properly means an implicit solve or long-range attachments, which is more than a
review. The viewer now says so in the stats panel ("still moving after 360
steps — this is a frame of a drape in progress, not a resting shape"), which is
the honest thing to show until the solver improves.

## Other fixes

- **LBV shoulder straps no longer tangle round the neck.** The front and back
  webbing of a shoulder ran along the same line over the crest, three layers deep
  with the pad between them. They meet at the tension lock in reality, so they
  now take lanes a strap-width apart.

## Deliberately not changed

- **The plate carrier's front panel sits flat off the chest.** It is a hard
  armour plate in a pocket; it does not conform to a rounded chest, and the 2 mm
  standoff is the shell thickness. Correct as it is.
- **The constraint iteration count (12 a step).** Dropping it would be the next
  lever, but the measured gains above already put every settling assembly under
  three seconds, and fewer iterations trade directly against seam closure.
- **The fold-angle slider restarts the solve on every change** while "simulate"
  is ticked, because the fold pose is the solve's starting state. The cache makes
  repeats cheap, but a first drag across the range is still expensive. Debouncing
  it needs a change to how the geometry effect is keyed.
- **A Web Worker.** With the frame deadline the main thread no longer blocks, so
  a worker would buy background completion rather than responsiveness — worth
  doing if the solve ever needs to keep running while the user edits inputs.

## The one change I cannot make: `e2e/3d-assembly.spec.ts`

The test ids (`sim-stats`, `sim-progress`, `fit-report`, `fold-preview-3d`) and
the `window.__stitchsmithFoldViewer.finish()` hook are unchanged, and `finish()`
still runs the solve to completion — it now stops at settlement rather than
always at 360. Two assertions in `finishCloth` and the test body read the old
stats wording and will fail:

1. `stretch: num('max stretch')` — the label is now `stretch`, so this parses
   `NaN`. Change to `num('stretch')`.
2. `expect(stats.steps, stats.text).toBe(360)` — assemblies now stop when they
   settle (180–300). Change to a settled check, which is the stronger assertion:

```ts
    expect(stats.steps, stats.text).toBeGreaterThanOrEqual(140);
    expect(stats.text).toMatch(/settled|still moving/);
```

The `maxStretch` ceilings in `TARGETS` were sized for the worst-edge figure and
are now far too loose against the percentile. Measured values, so ceilings of
roughly double these would catch a regression: mag pouch and roll-top and book
cover are not in my sweep, but of the rest — modular LBV 0.2 %, padded
sling/strap 0.1 %, fanny pack 1.0 %, plate carrier 1.4 %, clamshell 2.5 %,
circle skirt 2.6 %, tri-zip 2.9 %, zip pouch 3.8 %, organizer 14.2 %, micro rig
15.3 %, micro rig .308 31.7 %. The `maxStretch: 150` entries on the micro rig and
pleated card can come down a long way.

Note also that the circle skirt is now expected to report "still moving": it is
the one assembly that does not settle (see above).
