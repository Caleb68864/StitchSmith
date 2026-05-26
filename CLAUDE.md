# StitchSmith — Project Instructions

## Pattern generator requirements

**Every pattern generator MUST support seam allowance.** This is non-negotiable.

- Accept a `seam_allowance` input (mm, finite, ≥ 0) in the generator's `Inputs` type.
- Apply it to geometry — not just to step text. Either:
  - Set `Piece.seamAllowances` (per-edge, keyed by `Edge.id`) so the engine can draw the SA-offset cut line, OR
  - Apply a uniform offset via `offsetPolygon` / per-edge SA helpers in `src/lib/pattern-engine/geometry/offset.ts`.
- The SVG/PDF exports must render the SA-offset cut line distinctly from the body cut line.
- Hem allowances (where applicable) are emitted as `fold`-role edges and rendered dashed.
- Step instructions that say "cut including seam allowance" must reflect what is actually drawn.

## Engine usage

Both Tool Roll and Tri-Zip generators consume `src/lib/pattern-engine/` for graph types (`Point`, `Edge`, `Path`, `Piece`, `Pattern`), geometry helpers (offset, arc, bbox), and exporters (SVG, PDF, DXF, project JSON). New generators must use the engine — do not fork geometry or export code into the generator directory.

## Project JSON envelope

- `schemaVersion: 1` → Tool Roll
- `schemaVersion: 2` → Tri-Zip
- These are sibling schemas, not an upgrade chain. Distinguish by `generatorId`.
- Unknown future versions return a friendly error, not partial state.
