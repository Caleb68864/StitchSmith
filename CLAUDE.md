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

Used by: Tool Roll, Tri-Zip, Roll-Top Sack, Mag Pouch, Book Cover, Circle Skirt, Padded Strap (via the strap engine), Micro Rig (panel and pocket pieces; its pleated face is the card's Convention B).

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

Used by: **Zip Pouch** (see `src/generators/zip-pouch/dimensions.ts`), the **Padded Sling** (tube cut with allowance and turning ease included), the **Tactical Organizer** (hems marked at double, baked into the cut), the **Fanny Pack** (allowance and, for the fold finish, the zipper lip baked in) and the
**Mag Pouch pleated card** construction (`src/lib/pouch-engine/construction/pleatedCard.ts`,
dimensions resolved in `src/generators/mag-pouch/resolve.ts`). The card is
hemmed, not seam-allowanced: cut = finished + hems, hem folds are `fold`-role
edges, cell divisions are `stitch`-role lines, every strip and panel carries
explicit `seamAllowances: 0`. The Mag Pouch folded-T construction stays on
Convention A.

### Both conventions

- Hem allowances (where applicable) are emitted as `fold`-role edges and rendered dashed.
- Step instructions that say "cut including seam allowance" must reflect what is actually drawn.

## Vault-derived rules (do not "simplify" these away)

The MYOG research vault (`~/Documents/Notes/Caleb's Vault/Hobbies/MYOG`, index
in `stitchsmith-reference-prompt.md`) is the source for most tactical-gear
numbers. Rules already encoded, with the note that justifies each:

- PALS column pitch 1.5" is immutable; a PALS-mounted rifle cell is 3", not
  mag width + ease (`mag-pouches/pals-grid-vs-cell-width.md`). Off-grid spans
  get the "will not mount up in spec spacing" warning — a tested failure.
- PALS rows are 1" webbing at a 2" pitch (1" gap); back rows are cut 1" long
  and trimmed after sewing (`plate-carriers/pals-sewn-webbing.md`,
  `reference/technique-stitch-shrinkage.md`).
- Face per cell ≈ mag_w + 2·mag_t + ease; pucker per side must stay ≥ ~0.9"
  (`rigs/micro-rig-mag-cell-sizing.md`, `mag-pouches/mag-pouch-4pack-single-dimensions.md`).
- Hems are single-fold, marked at double the depth; cut = finished + hems
  (`bags/construction-hem-mark-at-double.md`).
- Interior pieces (loop, cradles, face bars) go on the face before any join;
  bottom edge first, then divisions, then sides (`reference/technique-glide-path-sequencing.md`).
- Padded straps: SOE's recommended build tacks the webbing 1" into the pad
  ends, never through the foam (`rigs/harness-padded-strap-construction.md`);
  strap length must take the gusset depth as an input (`packs/medpack-shoulder-harness.md`).
- Stacked cells (`rigs/stacked-mag-cell-geometry.md`): the mag stands flat
  side out, so rear cell = mag depth + ease (≥ 1/4", not PALS-snapped), front
  mark = rear cell + wrap allowance (1/4"–mag thickness, unsettled — mock it),
  stack depth = deep × thickness + 1/8", pouch = coverage × length; the cradle
  is the depth stop and the bungee anchor; no elastic that cannot be replaced.
- One-piece lids fold their tip back into a 1.5" pull channel (the 1" sample
  was too small gloved) and keep ≥ 3" of hook purchase at every adjustment
  (`rigs/subgun-lid-pull-channel.md`); the channel adds to the lid length.
- PALS fields come from `src/lib/pattern-engine/primitives/palsField.ts`
  (1" rows, 2" pitch, 1.5" columns, 1/4" margin, rows cut 1" long); do not
  draw a field by hand. Non-spec row widths (the LBV's 1.5") keep the warning.
- When a note marks a number Open / Inferred, carry it forward as an input or
  a warning tagged `mock-derived`, never as a hard default.
- H-harness (`rigs/harness-h-geometry.md`): 1.5" webbing full pad length and
  out both ends to four side-release corners (NSN-compatible, frozen), 8" of
  chest adjustment on a slotted cross strap (cut down between slots, never
  add), corner tails never cut, hydration channels are unsewn crossings (the
  sew map whitelists them). Pad length/width, foam, crossing height, spread
  and drop legs are Open — inputs with mock-derived warnings.

- Fanny pack lid drop (`bags/fanny-pack-lid-drop-tuning.md`): a lid hinged
  along its zipper falls open only if the zipper panel runs down each side by
  about the bag depth, and that length comes off the rising sides one for one;
  SOE's +3"/side did not open, +4" did. The heuristic is mock-derived; the
  override is the real input.
- A folded zipper lip consumes 1" beyond the finished edge
  (`bags/construction-edge-tape-vs-fold.md`, `packs/medpack-zipper-lip-math.md`);
  edge tape instead keeps the cut at finished size and goes on the cut list.
- Grommets sit ≥ 1/2" from any seam over a reinforcement patch and are set
  while the piece is flat, pre-burnt at 750°F, batched into one press visit
  (`bags/fanny-pack-drainage-grommets.md`, `reference/technique-grommet-setting.md`).
- Horizontal, non-load-bearing pouch zippers take a non-locking slider;
  vertical or loaded ones lock (`bags/zipper-slider-locking-vs-not.md`).

- Clamshell frames (`packs/medpack-zipper-lip-math.md`,
  `toolpod-zipper-frame-construction.md`): a folded zipper lip consumes 1"
  beyond the finished lip; the frame is two strips split by the zipper and
  the PALS budget on the gusset is `cols × 1.5" + clearance ≤ gusset depth`.
  Hoops are cut long and trimmed at the bottom join; the closing piece is cut
  last from the measured gap + 2 × fold-in (`medpack-technique-alligator-mouth.md`).
- Every wrap-around length on a clamshell (compression straps, harness tails,
  Velcro runs) scales with the gusset depth; a depth change invalidates the
  standard cut list (`packs/medpack-compression-straps.md`).
- PALS fields on any panel come from `src/lib/pattern-engine/primitives/palsField.ts`
  (rows cut 1" long, off-grid spans warn); side-gusset rows lie across the
  strip and start clear of the zipper underwrap (`medpack-technique-pals-spacing.md`).

- Plate carrier (`plate-carriers/*.md`): plate pocket = plate + 0.25–0.5" ease
  per side, shell = pocket + 0.5" oversize; binding adds no allowance (explicit
  0), turning needs SA; loop field ≥ ~2" of engagement; laser-cut PALS needs
  laminate; plate size and torso length are independent inputs (the plate
  top rides two finger widths below the sternal notch); every other number in
  those notes is reference grade — inputs with mock-derived warnings.
- PALS fields everywhere go through `buildPalsField`
  (`src/lib/pattern-engine/primitives/palsField.ts`): 1" rows at a 2" pitch,
  1.5" columns, 1/4" edge margin, rows cut 1" long; `rowWidth` carries the
  LBV's 1.5" divergence with its warning.

- Modular LBV (`rigs/lbvmod-*.md`): PALS rows are 1.5" scuba webbing at the
  1.5" column pitch (slots taller than spec — the divergence warning stays);
  first mark = ½" tape concealment + row width; strips = cols × 1.5" + 2 × ¼";
  rows go on before edge tape, bartacked in one direction; verticals 24" with
  1" tabs (22" usable) at the 4" marks, contiguous shoulder → panel → belt;
  3 × 12" of circumference, +3" with the tension locks outboard; two belt
  loops per panel, never three; loop on any face that gets sewn through.
  Panel outline, row pitch, pad size, cross piece angle and front strap
  positions are never stated — inputs with mock-derived warnings.
- Straps that must run beside the neck on the torso form kick out from
  their panel landing to the shoulder line (`overShoulder(..., xStart)` in
  the LBV assembly); a strap drawn long in x drapes with `along: 'x'`.

## 3D preview conventions

- Every `fold`-role path a generator emits is a hinge for the 3D preview
  (`src/lib/fold-engine`) and a crease for the cloth simulation
  (`src/lib/cloth-engine`). A fold only splits the regions it fully crosses,
  so short marks are harmless, but label real folds: the default angle comes
  from the label (`hem`/`mouth` → 180°, `lid` → 150°, `wing`/`bottom`/`spine`
  → 90°), and a label may state it outright, e.g. `Lid crease over the top (90°)`.
- A lid that wraps an object standing proud of the mouth needs two creases
  (over the top, down the face) and a length of 2 × exposed + depth + overlap.
- Generators supply seams to the preview in flat pattern coordinates
  (`FoldPreview3D.seams`); a seam through a folded double layer must be
  declared for both layers. Gathered seams are not modelled — leave them out
  and say so.
- A reference line drawn as a `fold` that is not folded in construction (the
  roll-top collar line) must carry `(0°)` in its label, or the preview creases it.
- **Boxed corners consume fabric.** A box stitch line D long takes D off the
  cut width (the seam moves to mid-depth on each side) and D/2 off the height.
  Cut panel = finished length + depth + allowances wide and finished height +
  depth/2 + allowances tall. The cloth check catches this: the two panels
  cannot close round a block of the finished size otherwise.
- Two-panel bags (Zip Pouch, Roll-Top) pass `pin: 'footprint'` on the 3D
  object so the cloth holds only the host panel under the contents and lets
  the rest wrap to the seams; pieces whose other faces are hinged regions of
  the same piece (Mag Pouch) keep the default whole-root pin.
- Placements (`PiecePlacement` in `src/lib/fold-engine/placement.ts`) can
  rotate a piece about its x axis (`rx`, a gusset laid under the bag) and
  `attach` it to the folded region of the piece it is sewn to (a flap on a
  cover). A piece cut twice mirrored is one drawing; the assembly mirrors it
  with `mirrorPieceX` into a second instance with its own id. Put the
  assembly in the generator (`assembly3d.ts`, as Tri-Zip does) so the page
  and the cloth test share it.
- A zipper gusset strip set between panels takes its width from those panels:
  the assembled front must equal the back panel's width.
- Body forms: `torsoForm` / `shoulderPath` in the cloth engine give a rounded
  chest, shoulder line and neck; a page passes `object.shape: 'torso'` and
  drapes pads along a shoulder path (`PiecePlacement.drape`) with their ends
  held (`FoldPreview3D.pins`). Put the assembly in the generator's
  `assembly3d.ts` and report fit findings in words (the padded strap's cross
  strap range check is the model).
- Cloth-to-cloth collision is on in the viewer and the pattern tests; layers
  stay one thickness apart. `maxStretch` counts elongation only (a coarse
  mesh shows wrinkles as compressed edges) and takes an `inside` filter so
  seam-allowance flaps do not count; `clothBounds` measures a finished
  envelope the same way. Unfilled cloth pillows: a boxed pouch measures
  between its finished length and its seam-to-seam width, and the tests say so.
- Gathered seams: a seam samples by its SHORTER side, so a long edge sewn to
  a short one keeps free vertices that buckle into gathers (the pleated
  face bottom onto the card). The row above a gather shears; measure stretch
  away from it. A pleated bottom lifts the magazine ~1" (vault ride height).
- Materials: `materialBendStiffness` and `materialPlateStiffness` map a
  piece's `materialId` to bending; foam and webbing get an isometric plate
  constraint so they stay straight where cloth curls. Gravity is on in the
  viewer (0.01 mm/step² along −up; a page may pass its own).
- Placements also take `rz` (turn a piece upside down) and `cone` (skirt
  panels wrapped from an apex); `placementMap` gives the direct flat→3D map
  for draped or cone pieces. Pages may pass extra `solids` (a hip form).
- Every page shows its preview through `PreviewTabs` (Pattern / 3D
  assembly); a new generator supplies an `assembly3d.ts` and passes its
  object, placements, pins and seams to `FoldPreview3D` with
  `initialSimulate` in the assembly tab.
- Do not draw fold lines that run along an outline edge (the cross-bottom
  cutouts): they cannot hinge in the rigid preview and their pressed-crease
  rests fight the seams in the cloth; the cloth folds such panels through
  the seams alone. Where allowance flaps must cross to close a seam (arms
  meeting edge to edge), pass `selfCollision: false` for that assembly.

## Engine usage

All generators (Tool Roll, Tri-Zip, Roll-Top Sack, Mag Pouch, Book Cover, Zip Pouch, Circle Skirt, Padded Strap, Micro Rig, Padded Sling, Tactical Organizer, Fanny Pack, Clamshell Pack, Plate Carrier, Modular LBV) consume `src/lib/pattern-engine/` for graph types (`Point`, `Edge`, `Path`, `Piece`, `Pattern`), geometry helpers (offset, arc, bbox), and exporters (SVG, PDF, DXF, project JSON). New generators must use the engine — do not fork geometry or export code into the generator directory.

## Project JSON envelope

- `schemaVersion: 1` → Tool Roll, Roll-Top Sack
- `schemaVersion: 2` → Tri-Zip
- `schemaVersion: 3` → Mag Pouch (v3 gained optional `construction`, `cell_count`,
  `cell_span`, `face_per_cell`, `bottom_style`, hems and the `velcro_dot` /
  `kydex_wedge` / `none` retention styles without a version bump — every new
  field is optional and defaults to the pre-existing behaviour)
- `schemaVersion: 4` → Book Cover
- `schemaVersion: 5` → Zip Pouch
- `schemaVersion: 6` → Circle Skirt
- `schemaVersion: 7` → Padded Strap / H-harness
- `schemaVersion: 8` → Micro Rig
- `schemaVersion: 9` → Padded Sling
- `schemaVersion: 10` → Tactical Organizer
- `schemaVersion: 14` → Modular LBV
- `schemaVersion: 13` → Plate Carrier
- `schemaVersion: 12` → Clamshell Pack
- `schemaVersion: 11` → Fanny Pack
- These are sibling schemas, not an upgrade chain. Distinguish by `generatorId`
  (the source of truth is each hook's `isValid` guard in `src/state/use*Project.ts`).
- Unknown future versions return a friendly error, not partial state.

## UI conventions
- Settings panels use the shared field primitives in
  `src/components/shared/fields/` (`NumericField`, `SelectField`,
  `ChoiceField`, `Toggle`, `UnitToggle`, `SectionHeader`, `HelpText`) — no
  new local `NumericField`. Every input has a label bound by id, units once,
  help under the field, and `mockDerived` on vault-Open numbers. A new
  generator registers with a `category`, a one-line `summary` and `tags`
  (or adds itself to `PATTERN_META`) so it lands in the right landing group
  and is searchable.
- New generators do not copy export or preview code: the page supplies an
  `ExportAdapter` to `PatternExportPanel` and a built `Pattern` to the shared
  `PatternPreview` (`src/components/shared/export/`), shows warnings through
  `WarningsPanel` (strings or `{ severity, message, field, tag }`) and derived
  numbers through `DerivedNumbers` (`src/components/shared/warnings/`), in the
  sidebar order warnings → legend → export → derived numbers → steps.
- Only closed **cut** outlines take a seam allowance in exports; a closed
  stitch/fold mark (Velcro outline, grommet patch) never gets an SA line, so a
  generator may draw closed marks freely.
- The viewer skips (and lists) seams onto pieces outside the scene and zero-
  length seams, coarsens meshes above 40 000 vertices, stops on a diverged
  solve, and reports any scene-build error in its own panel. New assemblies
  should still pass `src/generators/__tests__/assembly-sweep.test.ts` (add a
  case with a measured ceiling) and new generators the export sweep.
