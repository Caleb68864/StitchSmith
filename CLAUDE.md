# StitchSmith — Project Instructions

## Pattern generator requirements

**Every pattern generator MUST support seam allowance.** This is non-negotiable.

- Accept a `seam_allowance` input (mm, finite, ≥ 0) in the generator's `Inputs` type.
- Apply it to geometry — not just to step text. Pick **one** of the two
  conventions below and apply it consistently across every piece the generator
  emits. Mixing them within a generator is the bug that produces a doubled or
  missing SA line.

### Convention A — finished-dims pieces (default)

Pieces are drawn at finished size and the engine adds the allowance.

- Set `Piece.seamAllowances` (per-edge, keyed by `Edge.id`) so the engine can draw the SA-offset cut line, OR
  apply a uniform offset via `offsetPolygon` / per-edge SA helpers in `src/lib/pattern-engine/geometry/offset.ts`.
- The SVG/PDF exports must render the SA-offset cut line distinctly from the body cut line.

Used by: Tool Roll, Tri-Zip, Roll-Top Sack, Mag Pouch, Book Cover, Circle Skirt.

### Convention B — baked-in SA (documented exception)

Pieces are drawn at **cut** size with the allowance already included in every
dimension. This suits generators whose cut geometry is not a simple offset of
the finished shape — where an outward polygon offset would not produce the
right piece anyway.

A generator using this convention MUST:

- Derive every cut dimension in one place, so the pattern and the BOM cannot
  disagree about what to cut.
- Give every cut edge an **explicit** `seamAllowances` entry of `0`. Never leave
  it `{}` — `computeSeamAllowancePolygon` treats `{}` and `undefined`
  differently, and an empty object falls through to the exporter's
  `defaultSeamAllowance`, drawing the SA line one allowance too far out.
- Draw the sew line instead: emit `stitch`-role paths inset by the seam
  allowance on each sewn edge, so the sewer still sees where to stitch.
- State cut dimensions (not finished ones) in the step text, and say the
  allowance is included.

Consequence: no SA-offset cut line is drawn, because the cut line *is* the
outer line. That is expected under this convention, not a defect.

Used by: **Zip Pouch** (see `src/generators/zip-pouch/dimensions.ts`).

### Both conventions

- Hem allowances (where applicable) are emitted as `fold`-role edges and rendered dashed.
- Step instructions that say "cut including seam allowance" must reflect what is actually drawn.

## Engine usage

All generators (Tool Roll, Tri-Zip, Roll-Top Sack, Mag Pouch, Book Cover, Zip Pouch, Circle Skirt) consume `src/lib/pattern-engine/` for graph types (`Point`, `Edge`, `Path`, `Piece`, `Pattern`), geometry helpers (offset, arc, bbox), and exporters (SVG, PDF, DXF, project JSON). New generators must use the engine — do not fork geometry or export code into the generator directory.

## Project JSON envelope

- `schemaVersion: 1` → Tool Roll, Roll-Top Sack
- `schemaVersion: 2` → Tri-Zip
- `schemaVersion: 3` → Mag Pouch
- `schemaVersion: 4` → Book Cover
- `schemaVersion: 5` → Zip Pouch
- `schemaVersion: 6` → Circle Skirt
- These are sibling schemas, not an upgrade chain. Distinguish by `generatorId`
  (the source of truth is each hook's `isValid` guard in `src/state/use*Project.ts`).
- Unknown future versions return a friendly error, not partial state.
