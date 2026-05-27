---
type: phase-spec
sub_spec_id: SS-01
phase: run
wave: 1
depends_on: []
dispatch: factory
master_spec: "docs/specs/2026-05-25-tri-zip-backpack-engine.md"
title: "Engine foundation — graph + geometry + materials + instructions + baseline exporters + boundary enforcement"
---

# SS-01 — Engine foundation

## Context

Stand up `src/lib/pattern-engine/` from scratch. This is the foundation every other sub-spec depends on. No imports from `src/generators/` or `src/components/` are allowed in the engine — enforced by a vitest contract test (the project has no eslint configured). Port the arc-correction work already in `src/generators/tool-roll/geometry.ts` into `src/lib/pattern-engine/geometry/arc.ts`; Tool Roll keeps its own copy until SS-05.

See master spec `## Architecture` and `## Constraints` for the full picture.

## Scope

- Create `src/lib/pattern-engine/` and submodules: `graph/`, `geometry/`, `materials/`, `instructions/`, `exports/`.
- Implement the graph data model: `Point`, `Edge` (discriminated union `Straight | Arc | Bezier` with `role: 'cut' | 'fold' | 'stitch' | 'seam' | 'notch'`), `Path`, `Piece` (with `mirror`, `quantity`, per-edge SA), `Pattern`.
- Implement geometry helpers: `offset.ts` (per-edge seam-allowance offset, CCW/CW aware, returns `Result` on self-intersection), `arc.ts` (ported from tool-roll), `transform.ts`, `units.ts` (mm ↔ in), `bbox.ts`.
- Implement materials/hardware models + `cutList` aggregator.
- Implement instructions `Step` interface + `compile.ts` (topological sort + markdown/HTML render).
- Implement baseline exporters: `svg.ts`, `tiledHtml.ts`.
- Implement the engine-boundary vitest contract test that walks the source tree and rejects any disallowed import string.

## Files

- **Files (new):** see master spec SS-01 Files (new) list (29 files).
- **Files (modify):** `package.json` (add no new runtime deps; this sub-spec is dep-free).

## Interface Contracts

### Pattern
- Direction: SS-01 → SS-02, SS-03, SS-05
- Owner: SS-01
- Shape: `interface Pattern { id: string; name: string; units: 'mm'; pieces: Piece[]; materials: Material[]; hardware: Hardware[]; steps: Step[]; meta: PatternMeta; }`
- File: `src/lib/pattern-engine/graph/Pattern.ts`

### Piece
- Direction: SS-01 → SS-02, SS-03, SS-05
- Owner: SS-01
- Shape: `interface Piece { id: string; name: string; mirror: boolean; quantity: number; paths: Path[]; materialId?: string; annotations?: PieceAnnotation[]; seamAllowances?: Record<EdgeId, number>; }`
- File: `src/lib/pattern-engine/graph/Piece.ts`

### Edge
- Direction: SS-01 → SS-02 (DXF entity mapping), SS-03, SS-05
- Owner: SS-01
- Shape: discriminated union `Straight | Arc | Bezier`, each with `id: string`, `role: 'cut' | 'fold' | 'stitch' | 'seam' | 'notch'`.
- File: `src/lib/pattern-engine/graph/Edge.ts`

### Step
- Direction: SS-01 → SS-03 (contributions), SS-04 (rendering)
- Owner: SS-01
- Shape: `interface Step { id: string; title: string; body: string; dependsOn: string[]; refsPieces: string[]; group?: string; }`
- File: `src/lib/pattern-engine/instructions/Step.ts`

### offsetPath
- Direction: SS-01 → SS-02 (via SA-aware exporters), SS-03 (per-piece SA application)
- Owner: SS-01
- Shape: `function offsetPath(path: Path, sa: number | Record<EdgeId, number>): Result<Path, OffsetError>`
- File: `src/lib/pattern-engine/geometry/offset.ts`

### exportSvg
- Direction: SS-01 → SS-04 (preview + button), SS-05 (Tool Roll's SVG export)
- Owner: SS-01
- Shape: `function exportSvg(pattern: Pattern, opts?: SvgOptions): string`
- File: `src/lib/pattern-engine/exports/svg.ts`

### exportTiledHtml
- Direction: SS-01 → SS-04, SS-05 (via lazy façade from SS-02)
- Owner: SS-01
- Shape: `function exportTiledHtml(pattern: Pattern, opts: TileOptions): string`
- File: `src/lib/pattern-engine/exports/tiledHtml.ts`

## Implementation Steps (TDD)

### Step 1. Test: graph types exist with the right shape

Write `src/lib/pattern-engine/__tests__/graph.test.ts` asserting:
- `Point`, `Edge` (with `role` discriminator), `Path`, `Piece` (with `mirror: boolean`, `quantity: number`), `Pattern` all importable.
- A `Piece` with `mirror: true, quantity: 2` is well-typed.

Run: `npm test -- --run src/lib/pattern-engine/__tests__/graph.test.ts` → expect fail (no files yet).

### Step 2. Implement graph types

Create `Point.ts`, `Edge.ts`, `Path.ts`, `Piece.ts`, `Pattern.ts`, `graph/index.ts`. `Edge` is a discriminated union:

```ts
type EdgeRole = 'cut' | 'fold' | 'stitch' | 'seam' | 'notch';
export type Edge =
  | { kind: 'straight'; id: string; role: EdgeRole; a: Point; b: Point }
  | { kind: 'arc'; id: string; role: EdgeRole; center: Point; radius: number; startAngle: number; endAngle: number; clockwise: boolean }
  | { kind: 'bezier'; id: string; role: EdgeRole; p0: Point; p1: Point; p2: Point; p3: Point };
```

Run graph test → expect pass.

### Step 3. Test: boundary contract

Write `src/lib/pattern-engine/__tests__/boundaries.test.ts`:
- Walk `src/lib/pattern-engine/**/*.ts` files (use `fast-glob` if available, else recursive readdir).
- For each file, read contents and assert no line matches `from\s+['"]\.\.\/generators\b`, `from\s+['"]\.\.\/components\b`, `from\s+['"]@\/(generators|components)\b`.
- Assert `from\s+['"]src\/(generators|components)\b` also fails.

Run: expect pass (no files import anything yet besides graph types).

### Step 4. Implement geometry primitives

Create `geometry/units.ts` (mm/in conversion, `format(n, unit)`), `geometry/bbox.ts` (`bboxOf(piece)`, `bboxOfPattern`), `geometry/transform.ts` (translate/rotate/mirror).

Test in `__tests__/geometry-offset.test.ts`. Use Vitest assertions; tolerance `Number.EPSILON * 10` for FP comparisons.

### Step 5. Implement seam-allowance offset

Create `geometry/offset.ts`. Algorithm:
- For each `Edge` in a closed `Path`, compute the outward normal (CCW path → outward = left of direction; CW → right).
- Offset endpoints by SA along the normal.
- Connect adjacent offsets with miters (or arc segments for non-tangent joins).
- Detect self-intersection by checking adjacent offset edges for crossings → return `Result.err({ kind: 'self-intersection', edgeId })`.

Test: unit square 1 mm × 1 mm, CCW, SA = 0.1 mm outward → offset area = 1.44 mm² (within FP tolerance). Inward SA = 0.1 → 0.64 mm². Inner arc with radius < SA → returns self-intersection error.

### Step 6. Port arc-correction from tool-roll

Read `src/generators/tool-roll/geometry.ts` (recent hem-fold-parallel work). Copy the arc-correction helpers verbatim into `src/lib/pattern-engine/geometry/arc.ts`, adapting types from `geometry.ts`'s local types to the engine's `Point`/`Edge` types. Tool Roll keeps its own copy until SS-05.

### Step 7. Implement materials + cut list

Create `materials/Material.ts` (`{ id, name, kind: 'fabric' | 'foam' | 'webbing' | 'binding'; weight?; color? }`), `materials/Hardware.ts` (`{ id, name, kind: 'zipper' | 'buckle' | 'slider' | 'ladder-lock' | 'hook'; ... }`), `materials/cutList.ts` (`computeCutList(pattern): { byMaterial: [...], byHardware: [...] }`).

Test in `__tests__/`. Use a fixture pattern with 2 materials, 2 hardware items.

### Step 8. Implement instructions compiler

Create `instructions/Step.ts` (interface above) and `instructions/compile.ts`:
- Topological sort by `dependsOn`. Detect cycles → return `Result.err({ kind: 'cycle', steps: [...] })`.
- Group consecutively-grouped steps under their `group` header.
- Render markdown with step numbers and group headers.

Test: 5 steps with a chain `A → B → C` and parallel `D` plus `E ← C,D`. Assert topo order, assert cycle detection.

### Step 9. Implement SVG exporter

Create `exports/svg.ts`. Output:
- `<svg xmlns viewBox width height>` with viewBox in mm (1 unit = 1 mm).
- One `<g>` per piece, with `data-piece-id`.
- One `<path>` per `Path`, using absolute commands (`M`, `L`, `A`, `C`).
- Annotations (labels, grain arrows) emitted as `<text>` / `<line>`.

Test: single-square Piece (CCW unit square) emits `<path d="M0,0 L10,0 L10,10 L0,10 Z"/>` (within whitespace tolerance).

### Step 10. Implement tiled-HTML exporter

Create `exports/tiledHtml.ts`. Output a self-contained HTML document with:
- One page per tile (CSS `@page` + `page-break-after: always`).
- Tile size from `TileOptions` (default letter at 210×297 mm).
- A 50 mm scale-check square on every tile.
- Crop marks + registration triangles at tile corners.

Test: a 3-tile pattern produces 3 page sections with the scale square present in each.

### Step 11. Wire `index.ts` barrel exports

Create `src/lib/pattern-engine/index.ts` that re-exports the public surface: types from `graph/`, geometry helpers, materials, instructions compiler, and the two baseline exporters. Keep `exports/lazy.ts` out of the barrel — it lives in SS-02.

### Step 12. Final boundary contract pass

Re-run `boundaries.test.ts`. Run full test suite: `npm test -- --run`. Expect all green. Run `npm run build`. Expect exit 0.

### Step 13. Document the engine

Create `src/lib/pattern-engine/README.md` with: purpose, public surface, "why edge graph not raw SVG", how to consume, contract test rationale.

### Step 14. Commit

```bash
git add src/lib/pattern-engine package.json
git commit -m "feat(engine): pattern-engine foundation — graph, geometry, materials, instructions, SVG/tiledHtml exporters, boundary contract test [SS-01]"
```

## Verification Commands

- Build: `npm run build`
- Test: `npm test -- --run`
- Boundary contract: `npm test -- --run src/lib/pattern-engine/__tests__/boundaries.test.ts`
- Existing Tool Roll suite (must remain green): `npm test -- --run src/generators/tool-roll/`

## Checks

| Criterion | Type | Command |
|---|---|---|
| All files under `src/lib/pattern-engine/` exist | STRUCTURAL | `test -d src/lib/pattern-engine/graph && test -d src/lib/pattern-engine/geometry && test -d src/lib/pattern-engine/materials && test -d src/lib/pattern-engine/instructions && test -d src/lib/pattern-engine/exports \|\| (echo "FAIL: engine subdirs missing" && exit 1)` |
| `Edge.ts` exports a discriminated union with `role` | STRUCTURAL | `grep -q "role:" src/lib/pattern-engine/graph/Edge.ts \|\| (echo "FAIL: Edge missing role" && exit 1)` |
| `Piece.ts` exports `Piece` with `mirror` | STRUCTURAL | `grep -q "mirror" src/lib/pattern-engine/graph/Piece.ts \|\| (echo "FAIL: Piece missing mirror" && exit 1)` |
| `Step.ts` matches the documented shape | STRUCTURAL | `grep -qE "(dependsOn\|refsPieces)" src/lib/pattern-engine/instructions/Step.ts \|\| (echo "FAIL: Step interface" && exit 1)` |
| No imports of `generators` from engine | MECHANICAL | `! grep -rE "from ['\"](\.\./)+generators\|@/generators" src/lib/pattern-engine/ \|\| (echo "FAIL: engine imports from generators" && exit 1)` |
| No imports of `components` from engine | MECHANICAL | `! grep -rE "from ['\"](\.\./)+components\|@/components" src/lib/pattern-engine/ \|\| (echo "FAIL: engine imports from components" && exit 1)` |
| Boundary contract test passes | MECHANICAL | `npm test -- --run src/lib/pattern-engine/__tests__/boundaries.test.ts 2>&1 \| tail -1; [ ${PIPESTATUS[0]} -eq 0 ] \|\| (echo "FAIL: boundaries test" && exit 1)` |
| Full build + test green | MECHANICAL | `npm run build && npm test -- --run \|\| (echo "FAIL: build or test" && exit 1)` |

## Acceptance Criteria (from master SS-01)

Reproduced verbatim from the master spec for worker reference. Apply all.

- `[STRUCTURAL]` All files under `src/lib/pattern-engine/` listed in master SS-01 exist and export the types named.
- `[STRUCTURAL]` `Edge.ts` exports an Edge discriminated union (Straight | Arc | Bezier) with `role`.
- `[STRUCTURAL]` `Piece.ts` exports the documented `Piece` interface.
- `[STRUCTURAL]` `Step.ts` matches the design-doc shape.
- `[MECHANICAL]` No imports of `src/generators` from engine.
- `[MECHANICAL]` No imports of `src/components` from engine.
- `[MECHANICAL]` `npm test -- --run src/lib/pattern-engine/__tests__/boundaries.test.ts` exits 0.
- `[MECHANICAL]` `npm run build` + `npm test -- --run` exit 0; existing tests still pass.
- `[BEHAVIORAL]` `exports/svg.ts` produces correct absolute-command SVG for a unit square.
- `[BEHAVIORAL]` `geometry/offset.ts` offsets correctly; self-intersection returns Result error.
- `[BEHAVIORAL]` `instructions/compile.ts` topo-sorts and detects cycles.

## Escalation Triggers

- The Edge discriminated union needs a new variant to support a future style. Escalate.
- Seam-allowance offset on real Tool Roll geometry self-intersects unexpectedly during SS-05. Escalate with epsilon analysis.
