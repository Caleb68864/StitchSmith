---
date: 2026-09-11
project: StitchSmith
type: roadmap
source: ~/Documents/Notes/Caleb's Vault/stitchsmith-reference-prompt.md (348-note MYOG corpus)
---

# StitchSmith pattern roadmap

This roadmap ranks work by how much reconciled evidence the MYOG vault already
holds for it. A pattern whose vault notes carry `## For the generator` blocks
with confirmed numbers is cheap to build correctly; one whose numbers are Open
needs a measured sample first. Vault paths below are relative to
`~/Documents/Notes/Caleb's Vault/Hobbies/MYOG/`.

## Where the code stands (2026-09-11)

| Generator | Engine | State |
|---|---|---|
| Mag Pouch | pouch-engine (`folded_t`, `pleated_card`) | Rebuilt on the vault this session. Folded-T single and the SOE pleated card (1–8 cells). |
| Tri-Zip Backpack | pattern-engine modules + strap-engine | Shoulder straps rebuilt on the strap engine this session. Body modules unchanged. |
| Tool Roll, Roll-Top Sack, Book Cover, Zip Pouch, Circle Skirt | pattern-engine | Unchanged; no vault work needed. |

Engines: `pattern-engine` (graph, geometry, exporters), `pouch-engine`
(pouch constructions + components), `strap-engine` (padded strap primitive).

## Done this session

**Mag pouch**
- `pleated_card` construction: hemmed back + folded double face pleated into N
  cells; hems baked in (Convention B); cell divisions as stitch lines; cradle /
  pleat / open bottoms; AK face hem. Geometry pinned by test to the SOE 4-pack
  card cut list (14×7.5 back, 20.5×11 face, 8 loop strips, 4 cradles, 12 face
  bars, 2 back rows). `mag-pouches/mag-pouch-4pack-single-dimensions.md`.
- PALS grid quantization: PALS-mounted cells snap to 1.5" multiples (3" rifle);
  .308 → 4.5" with the grid-tax warning; off-grid overrides get the "will not
  mount up in spec spacing" warning. `mag-pouches/pals-grid-vs-cell-width.md`.
- PALS component to spec: 1" rows at a 2" pitch, rows cut 1" long and trimmed
  after, one vertical mount strap per column. `plate-carriers/pals-sewn-webbing.md`.
- Face per cell = mag_w + 2·mag_t + 5/16" (≈4.86" vs 4.875" measured); pucker
  floor 0.9". `rigs/micro-rig-mag-cell-sizing.md`.
- Retention: Velcro dot (1" square, one face), Kydex wedge (platform-keyed),
  bungee (16" per cell, mock-derived, caliber lock warning), lid hook/loop with
  loop = hook + travel. `mag-pouches/mag-pouch-retention-options.md`,
  `reference/technique-oversized-loop-fields.md`.
- Presets: .308 PMAG 20 (2.9×1.1×5.75) and AK 30-rd (2.5×1.1×9.5) with
  platform-driven defaults. `rigs/stacked-rig-308-adaptation.md`.
- Lid length derived (exposed mag + cell depth + reach); coverage semantics
  fixed; every derived number surfaced in a "Derived numbers" panel; BOM
  carries cut dimensions and cut-to-net / trim-after-sew / mock-first tags.
- Steps in the vault's sequence: interior pieces on the face first, bottom
  before divisions before sides, forward-only through 12–14 layer stacks,
  build-in-scrap-first and batch notes.

**Shoulder straps**
- `strap-engine`: shell, mesh or Cordura backer, foam (inset, own cut sheet),
  tail and top-anchor webbing, hardware and steps for five architectures
  (foam+mesh standard, SOE tacked ends, SOE quilted through-webbing, crushable
  sleeve, slick). J-curve / S-curve / straight outlines with tapered ends.
  Bound = explicit 0 SA; turned = SA on every edge.
  `reference/technique-shoulder-strap-construction.md`,
  `rigs/harness-padded-strap-construction.md`, `packs/compare-shoulder-strap-traditions.md`.
- Tri-Zip tail length now takes the gusset depth as a term
  (`packs/medpack-shoulder-harness.md`); pad architecture, edge finish,
  webbing width, pad length and hardware are inputs.

## Mag pouch and strap follow-ups (finish "perfect")

1. **Pistol magazine presets.** The vault says the pistol cell width is
   unknown (`mag-pouches/mag-pouch-6mag-pistol-variant.md`); measure a Glock
   17 / M&P / 1911 mag and add presets with a `pistol` platform. Cell span
   under a PALS mount rounds to 1.5" (one column) or 3" (two) — surface the
   choice.
   **BLOCKED (checked 2026-11-09): open question.** No pistol magazine
   dimensions are sourced in the repo (`src/generators/mag-pouch/magazines.ts`
   has rifle presets only) and the vault note says the cell width is unknown.
   Needed before any code: measured width × thickness × length for a Glock 17,
   M&P and 1911 magazine (manufacturer sheet or calipers, ±0.05"), and the
   pistol cell ease. Do not add placeholder numbers.
2. **Stacked (two-deep) cells.** `rigs/stacked-mag-cell-geometry.md` carries a
   full parametric block with a .308 test case (mag_depth 2.9, thick 1.1,
   length 5.75 must reproduce its table). Add `cells_deep` to the card.
   **Status 2026-11-09:** the block itself is done — built on the micro rig
   (`stacked_cells`, pattern #4) and now lifted into the pouch engine
   (`src/lib/pouch-engine/fit/stacked.ts`: `stackedCellGeometry` +
   `validateStackedCells`, .308 table pinned in
   `src/lib/pouch-engine/__tests__/stacked.test.ts`); the micro rig consumes
   it with no change to its output. Hardened: a cradle drop deeper than the
   uncovered magazine length (magazine top below the mouth, negative exposed
   height) is now rejected. **Still open:**
   - 2a. `cells_deep` on the standalone Mag Pouch card: the rear self-lined
     pouch / front pouch / divider / bridge / cradle pieces are drawn only in
     `src/generators/micro-rig/buildPattern.ts` (`buildStackedPieces`). Move
     them into a pouch-engine construction (or a `pleated_card` option) so
     both generators draw them from one place, then add the input, BOM, steps
     and a 3D assembly to the Mag Pouch.
   - 2b. Open question for 2a: the standalone card has no host panel, so the
     back the rear pouch sews to (and its height above the pouch) is not in
     any sourced note the repo cites. Carry it as an input with a
     mock-derived warning, or source it, before 2a draws a back.
3. DONE 2026-09-12 — **One-piece lid with pull channel** (`rigs/subgun-lid-pull-channel.md`):
   lid_cut = wrap + 1.5" channel + velcro overrun; overrun ≥ tallest-mag delta
   + 3" purchase. Replace the derived lid with this when a lid is chosen.
4. **Mouth hem to the outside** for lugged magazines
   (`rigs/subgun-hem-to-outside-mag-mouth.md`): 1" hem, cell loses the hem from
   its cut height.
   **Not started (checked 2026-11-21): needs a decision.** Neither mag-pouch
   construction has a hemmed single-layer mouth: the pleated card's face is
   folded double at the mouth and the folded-T mouth is seam-allowanced
   (decisions.md 2026-09-12). The owner has to say which construction gets
   it (a new single-layer cell for the subgun rig, or an option on one of
   the two), and the vault note has to be read for the hem's direction and
   what "loses the hem from its cut height" means before any code.
5. DONE 2026-09-12 — **Hourglass aesthetic** (`mag-pouches/mag-pouch-hourglass-aesthetic.md`):
   optional, default off, +0.25" per side, labor-cost note.
6. DONE 2026-09-12 — **MALICE clip alternative** in the mount options (clip count = columns,
   size by rows) instead of sewn mount straps.
7. **Kydex wedge dimensions per platform** — Open in the vault; add when a
   wedge is measured.
8. DONE 2026-09-12 (BOM; hip belt/sternum still drawn by the module) — **Tri-Zip hardware BOM.** The strap engine returns hardware; Tri-Zip has no
   BOM structure, so it is folded into step text. Add a BOM to Tri-Zip and
   route hip belt and sternum strap through the strap engine too
   (sternum production lengths 18" and 24", `packs/medpack-shoulder-harness.md`).
9. DONE 2026-09-12 — **Load-path tack rule in back-panel steps**: strap tacks must sit outboard
   of the bag-closing seam (`packs/toolpod-shoulder-strap-provision.md`).
10. **Prototype vs final cut sheet labelling** and a per-pattern change log
    (`mag-pouches/construction-prototype-in-solid.md`,
    `reference/soe-production-principles.md`).
    **Not started (checked 2026-11-21): needs the vault.** Nothing in the repo
    says what a prototype sheet changes (fabric, tolerances, marks) or what a
    change-log entry holds; both live in the two notes, which agents cannot
    read. Needs the owner to state the rule or make the notes readable.

## Next patterns, in order

### 1. Padded strap / H-harness generator (standalone page) — DONE 2026-09-11
`src/generators/padded-strap/`: pack strap pair (tail from torso and gusset)
and the H-harness (1.5" webbing full length to four side-release corners,
slotted cross strap with 8" adjustment, hydration channel bars sewn ends only,
routing PALS). Open vault numbers are inputs with mock-derived warnings.
Follow-ups: a torso block for the 3D preview so the J-curve and the H
crossing can be checked; the LBV shoulder set variant (24" verticals, 12"
drop, tension locks centred) as a third mode.

### 2. Micro rig / chest rig platform — DONE 2026-09-11
`src/generators/micro-rig/`: the panel-as-pocket chassis (10.5"–19" wide,
7" tall), pleated mag cells from the pouch engine, utility pocket, side
PALS, bottom loops, dangler field, split front join, webbing or H-harness
suspension, width budgeting, 3D assembly. Follow-ups: Stacked Micro
individual slots + tear-off med pouch as a pocket set, shotshell / en-bloc /
lever-gun card hosts, and the covert rig's elastic card
(`rigs/soe-covert-rig.md`, `rigs/covert-elastic-mag-card.md`).

### 3. Padded two-point sling — DONE 2026-09-11
`src/generators/sling/`: turned tube with turning ease, foam setback,
webbing tuck and engagement rule, rod vs cord turn, one-way adapter anchored
in the closing stitch, tri-glide / QD / sewn ends. No vault lengths: every
length is an input with a mock-derived placeholder and the cord mock-up is
step one.

### 4. .308 stacked micro rig (tandem-depth cells) — DONE 2026-09-11
`stacked_cells` pocket set on the micro rig: rear cell = depth + ease, front
mark = rear + wrap, stack depth, coverage-driven pouch height, cradle depth
stop with grommets, bungee over the top, split vs plain pulls, weight
warning. The .308 test case reproduces the vault table. Left: the tear-off
med pouch piece and a second magazine in the 3D view.

### 5. Tactical organizer / pen-and-notebook organizer — DONE 2026-09-12
`src/generators/organizer/`: folded body with hems marked at double, split
horizontal hook Velcro (or PALS) on the back, oversized front panel whose
side folds become bellows (span-loss math, gusset warning), pen-slot dividers
from the side seam, 13-step vault order with the panel-bottom seam before
the sides, production mode, bifold / grommets / name tape / loop-over-hook
variations, 3D assembly round a 3 × 5 notebook. Follow-up: the admin face as
a pocket-set on the modular back (pouch line item 4).

### 6. Fanny pack — DONE 2026-09-12
`src/generators/fanny-pack/`: back and front panels on a hoop of two zipper
halves plus a rising gusset; the lid-drop rule (zipper panel extended down the
sides by ≈ depth, taken off the rising sides, override + mock-derived
warning), tape-or-fold zipper edge (+1" lip), drawbridge cord limiter with
cord = 2 × chord at the target angle, 0/2/4 bottom drainage grommets with
patches set while flat, dual-mode belt with measured settings, non-locking
slider in the BOM, 3D hoop-and-panels check. Body sizes are starting points
(the vault has no cut list). Follow-ups: simulate the open lid (split the 3D
band at the zipper and let the front fall), ~~a front PALS/loop face~~ (DONE
2026-11-22: `front_face` pals — the PALS primitive inside the hoop seam,
rows on the cut list cut 1" long — or loop, a Velcro field 1/4" inside the
seam; plain by default).

### 7. Clamshell pack (medpack / tool pod) — DONE 2026-09-12
`src/generators/clamshell-pack/`: zipper frame hoop as two strips split by
the zipper (base gusset + lid strip, 1" lip fold-over, cut long and trimmed),
alligator-mouth bottom cut from the measured gap, PALS fields on sides, face
and bottom through the shared `buildPalsField` primitive, bowed handle,
depth-scaled compression straps, removable-strap tabs and stow pocket,
interior loop walls, pocket-grid footprints, 3D hoop assembly round the
block. Follow-ups: padded straps through the strap engine terminating in the
same male-buckle spec; ~~drainage grommet~~ (DONE 2026-11-22: `bottom_grommets`
0–2 on the bottom centre line, each over a 1.5" patch, set flat and
pre-burnt per the vault grommet rule, with a warning under 1/2" from the
seam; a seam-slot port is still open); ~~hydration port~~ (DONE 2026-11-22: a
slot and patch at the lid strip's top centre, the slot length a flagged
placeholder).

### 8. Plate carrier — DONE 2026-09-12
`src/generators/plate-carrier/`: plate presets and cuts (SAPI / shooter /
swimmer), pocket + shell envelopes, loop or PALS fields on both faces (via the
new PALS field primitive), strap-engine padded straps or slick webbing,
elastic or skeletal cummerbund with side plate pockets and QR buckle choice,
bound or turned edges, bartack map, 3D fit on the medium torso with strap and
cummerbund span verdicts. The vault is reference-grade here: four inputs carry
mock-derived warnings. Follow-ups: SAPI XS–XL nomenclature as presets,
QR-buckle mount drawings, ~~a removable back pad piece with its Velcro~~
(DONE 2026-11-22: `back_pad_removable` binds the comfort pad on its own,
two 1" hook strips across its back into two loop strips inside the back
shell, the pad width less 1" each side; the pad binding on the hardware), and the
loop field's edge-under-binding variant.

### 9. Modular LBV — DONE 2026-09-12
`src/generators/lbv/`: three zippered foam-pocket panels (back bellowed),
Velcro-faced 1.5" PALS rows on the shared PALS primitive with the row-width
divergence flagged, verticals at the 4" marks with the 22"-usable / 12"-drop
arithmetic, strap-engine shoulder pads with centred tension locks, angled
cross pieces, four-point-dispersion drag handle, three front straps (males
right), 36" of circumference adjustment with the outboard-lock escalation,
snap belt loops capped at two, 3D fit on the torso with a written report.
Every number the transcripts never state is a mock-derived input. Left: the
front column count (count bartacks on a video frame), the butt pack and
hydration carrier interfaces as pieces, laser-cut slotted shoulder straps.

### 10. Shelter, sleep, apparel — 10a and 10b DONE 2026-11-16, 10c DONE 2026-11-21, 10d bivy DONE 2026-11-22, 10e gaiters DONE 2026-11-22 (garments with sleeves still open)
87 notes but almost all reference material (LearnMYOG, materials), not
reconciled builds. Circle Skirt already covers the apparel entry point. Hold
until the tactical line is done.

**Status 2026-11-16 (morning): proposal only, nothing built.**
Checked against the code: there is nothing for shelter or sleep in `src/`
(no tarp, quilt, hammock, bivy or net generator, and no helper for them).
Apparel is the Circle Skirt only. Three reasons not to build:

- The item names a category, not a pattern. Every pattern from 1 to 9 was
  built from a reconciled vault build with a `## For the generator` block.
  This entry says those blocks do not exist for this category.
- The vault was not on the machine that ran this check
  (`~/Documents/Notes/Caleb's Vault/` is missing). None of the 87 notes could
  be read, so none could be confirmed as a reconciled build. A generator
  built now would have no sourced numbers behind it. CLAUDE.md forbids that:
  an Open number is an input with a warning, never a hard default.
- The hold condition is half met. Patterns 1 to 9 are done, but the pouch
  line ("Pouch styles beyond the mag pouch") and follow-ups 2a, 4, 7 and 10
  are still open.

Candidates, ordered by how well the existing engine fits each:

| # | Pattern | What the engine already has | What it still needs | Owner or vault input needed |
|---|---|---|---|---|
| a | **Flat / A-frame tarp** (rectangle, optional cat-cut ridge and edges) | Flat panels. The Circle Skirt's `fabric_width` panel split for yardage seams. Tiled print and DXF for large pieces. Grommet patch placement from `pouch-engine/components/drainage.ts`. A fold line at the ridge for the fold preview. | A catenary (or parabola) edge curve; `geometry/arc.ts` has only Bézier and spline fits. The **Hem primitive** from the engine list below. Tie-out reinforcement patches as pieces. A ridge seam choice (flat-felled or `frenchSeam.ts`). | Footprint, cat-cut sag ratio, number and position of tie-outs, hem depth, fabric (sewn silnylon vs taped or bonded DCF, which the engine cannot express). |
| b | **Gathered-end hammock** | A rectangle with channel hems at the ends. BOM and steps machinery. | Hem primitive (channel = hem). A whipping or channel end choice. A structural-ridgeline length (a derived number). A load warning. | Length, width and fabric. Whether to encode the common ~83 % ridgeline figure (not a vault number as far as the roadmap records). A safety disclaimer policy. |
| c | **Top quilt / underquilt** | Tapered outline via spline fits. Fabric-width panel splitting. | A baffle-chamber primitive (sewn-through vs baffled; baffle height; differential cut between shell and liner). A fill-weight calculation per chamber (volume × overstuff / fill power) in the BOM, in grams. A footbox closure (zip or sewn). | Target loft, fill power, overstuff %, baffle spacing and height, taper. All are reference-grade at best, so inputs with `mock-derived` warnings. |
| d | **Bivy / bathtub floor or bug net** | Boxed corners (`geometry/boxedCorner.ts`). Zipper pieces from the pouch and pack generators. | A long zipper on a curved edge. A mesh material on its own cut sheet (already an open engine item). | Body length, shoulder girth, tub height, zipper layout. |
| e | **Apparel beyond the skirt** (gaiters first, then a wind shirt or beanie) | Circle Skirt measurement handling and units conversion. Cone-wrap 3D placements over a body form. | Body-measurement drafting: slopers, grading, curved armholes and necklines. There is no drafting primitive, so this is the largest lift. Gaiters are the exception: a shaped tube plus an instep strap. | Which garment. A measurement set. A sizing source. |

Already covered and not needed: stuff sacks and ditty bags (Roll-Top Stuff
Sack, Zip Pouch). A drawstring compression-sack mode on the Roll-Top is the
cheapest "sleep" item if one is wanted.

Recommended order once released: **a → b → c → d → e**. The tarp and hammock
share the Hem primitive and flat-panel layout, and building them pays for
that engine item. The quilt adds the baffle primitive. Apparel waits for a
drafting engine.

Before the first one is built, the owner needs to:

1. Release the hold, or say which open tactical items must land first.
2. Pick the first pattern. The recommendation is the tarp.
3. Make the vault readable to the agent, or list which of the 87 notes (if
   any) carry a `## For the generator` block. Otherwise every number is
   `mock-derived`.
4. Say whether DCF (taped or bonded, not sewn) is in scope. The engine models
   only sewn seams.

**Owner decisions, 2026-11-16:**

1. The hold on item 10 is lifted.
2. The tarp (10a) goes first.
3. The vault will not be made available. Build with placeholder numbers and
   give every one a `mock-derived` warning, so it is clear each still has to
   be checked against the vault.
4. **DCF is out of scope for now.** Sewn seams and sewn fabrics only
   (silnylon, silpoly and the like). No taped or bonded construction.

#### 10a. Flat / A-frame tarp — DONE 2026-11-16 (`pattern/10-shelter-sleep-apparel`, `b6f8ede` + `c59af98`, merged to main as PR #1 `3a6d4a9`)
`src/generators/tarp/`, page `src/components/tarp/`, project schemaVersion 15,
new landing category "Shelter and sleep". Two panels on a flat-felled ridge
seam, or one panel when the width fits the fabric. Catenary cat cuts on the
ridge and both eaves (`geometry/catenary.ts`). Cat-cut stations in the
steps for marking the curve on cloth. Ends and eaves hemmed through the Hem
primitive (rolled by default, or the vault's single fold marked at double;
production floor). Every
curve is mirrored inside the end hems so they fold flat. Box-X patches with
grosgrain loops at the corners, along the eaves and at both ridge ends. A
fabric-width check (an error, on the field that fixes it). Convention B (cut
size, explicit 0 on every edge, ridge stitch line drawn). BOM in fabric
length off the roll. 3D check: the two panels pitched as an A-frame from the
ridgeline height, sewn along the cat-cut ridge, held at every tie-out, with
a written pitch report (angle and footprint).

Every number is a placeholder with no vault source, listed in `PLACEHOLDERS`
(`src/generators/tarp/defaults.ts`). The default project leaves them all empty,
so each field shows its placeholder with a "measure" chip and the page raises
one `[mock-derived]` note naming every one still unentered. **Check each
against the vault:**

| Placeholder | Value |
|---|---|
| Ridge length | 120" (10') |
| Width eave to eave | 96" (8') |
| Ridge cat-cut depth at mid-span | 2" |
| Eave cat-cut depth at mid-span | 3" |
| Usable fabric width | 58" |
| Ridge seam allowance (flat-felled) | 12.7 mm (1/2") |
| Hem depth | 1/2" |
| Tie-outs per eave between the corners | 1 |
| Reinforcement patch | 3" square |
| Grosgrain per tie-out loop | 5" |
| Grosgrain width | 5/8" |
| Ridgeline height (pitch check only) | 42" |
| Cord per guyline (added 2026-11-21) | 96" (8') |
| End cat-cut depth (added 2026-11-21, ends cut only) | 1" |
| Beak reach past the end (added 2026-11-22, beaks only) | 18" |

Choices with no number are not mock-derived: two-panel ridge seam (default)
vs single panel, cat cut (default) vs straight edges, a rolled hem (default
since 2026-11-16: silnylon frays, see decisions.md) vs the vault's
single-fold hem marked at double, ridge-end tie-outs on. With the rolled
default the placeholder panels cut 122" × 49.5" (244" of fabric); the hem
depth placeholder (1/2") stays `[mock-derived]`.

Found while building: the viewer kept a placement only when it carried an
offset, drape, cone or attach. A rotation-only placement (`rx` alone) was
dropped and the piece laid out flat, while the test harness applied the
rotation, so a cloth test could pass on a scene the browser never showed.
**Fixed 2026-11-16 (`fix/tarp-followups`):** the viewer's layout moved to
`src/components/shared/viewer/layout.ts` and places a piece in the scene
whenever `isScenePlaced` (`fold-engine/placement.ts`) says so, which counts a
rotation alone. `viewer-layout.test.ts` fails on the old rule; every
assembly-sweep case now also checks that the viewer puts each scene piece
where the harness does (all 19 cases agreed before and after, so no
existing scene changed). The tarp now uses rotation-only placements.

Follow-ups: ~~cat-cut ends~~ (DONE 2026-11-21: `cut_ends` toggle, off by
default so existing projects keep straight ends; each ridge-to-eave edge
cut as a catenary of `end_sag`, a single panel's end as two curves meeting
at the ridge line; mirrored inside the eave hem and ridge allowance; end
hem creases follow the curve; stations in the cat-cut step. The 3D check
still draws straight ends, a slight over-size there), ~~guyline and
line-lock hardware~~ (DONE 2026-11-21: a guyline, line-lock and stake per
tie-out on the BOM, `guylines` / `line_locks` toggles, cord per guyline a
`[mock-derived]` placeholder, a Guylines step; tests in
`tarp/__tests__/buildPattern.test.ts`), ~~ridge pull-outs mid-panel~~ (DONE 2026-11-21:
`pullouts` toggle, off by default; one patch-and-loop pull-out at mid-span
in the middle of each panel, or each half of a single panel, counted as
tie-outs so the patches, loops and guylines follow; not pinned in the 3D
check, since a pull-out is guyed out, not fixed), ~~a doorway~~ (DONE
2026-11-22: `doors` none / one end / both ends; each end closed by a
mirrored pair of hemmed right-triangle halves sized to the pitch check —
the ridgeline height down the middle, half the footprint along the ground,
the panel end as the long edge — zipped up the middle (zipper = ridgeline
height, on the BOM) and lapped over the panel end hems; door fabric added
to the roll; errors when the eaves cannot reach the ground or the ends are
cat-cut; in the 3D check since 2026-11-22: each half draped in the end
plane, seamed to its panel end and to its partner up the middle), ~~a beak variant~~ (DONE 2026-11-22: `beaks`
none / one end / both ends; a mirrored pair of right-triangle halves per
beaked end — reach past the end × the panel end — sewn to the panel end
and to each other along the ridge at the seam allowance, the outer edge
hemmed; the beaked panel end loses its hem for the seam allowance; the
ridge-end tie-out moves to the tip; `beak_length` placeholder 18",
`[mock-derived]`; refuses doors and cat-cut ends; in the 3D check since 2026-11-22 as the
roof carried on past the end, seamed to the panel end and along the ridge;
the tip is not staked down in the check),
and moving the organizer and pleated-card hems onto the Hem primitive.

**Single-panel 3D check — DONE 2026-11-16 (`fix/tarp-followups`).** The
single panel is folded over the ridgeline in the 3D tab and the cloth test.
The 3D copy splits the panel at its ridge reference line and joins the two
halves there with a zero-allowance seam, then pitches them like the two
panels. A rigid hinge along the ridge line cannot be used: it crosses the
180° end hems, the fold engine's hinge tree cannot fold that consistently,
and half of each end hem flips up over the ridge. The exported pattern is
unchanged (one piece, a (0°) ridge line). Tests: `assembly3d.test.ts`
(fails on the old code, which returned no assembly), an assembly-sweep case
and an e2e target `tarp (single panel)`, all on a 56" panel under a 24"
ridgeline (28" a side does not reach the ground from the 42" placeholder).

#### 10b. Gathered-end hammock — DONE 2026-11-16 (`pattern/10b-hammock`, no 3D)
`src/generators/hammock/`, page `src/components/hammock/`, project
schemaVersion 16, "Shelter and sleep" category. One body: long sides hemmed
(or the selvedge), ends as channels (the Hem primitive at the channel depth:
channel = hem) or whipped (a tail beyond a marked whip line, the tail's raw
end rolled). Rolled hems by default, single fold marked at double
selectable, production floor. Convention B (cut size, explicit 0, channel
stitch lines drawn). Fabric-width check like the tarp's (error on `width`;
leftover fabric is an info note, or a warning on a selvedge body). Derived
structural ridgeline (percentage of the length). A standing load warning,
with an optional occupant weight against the fabric maker's rating. BOM:
body, fabric length off the roll, end cords or whipping cord, the ridgeline.
Registered in every shared table (generators, inputs review, persistence,
export sweep, export matrix, page composition and error states, warning
links, settings a11y, App smoke).

Every number is a placeholder with no vault source, listed in `PLACEHOLDERS`
(`src/generators/hammock/defaults.ts`), left empty in the default project and
named in one `[mock-derived]` note. **Check each against the vault:**

| Placeholder | Value |
|---|---|
| Length gather to gather | 132" (11') |
| Finished width | 58" |
| Usable fabric width | 60" |
| Side hem depth (also the whip-tail hem) | 1/2" |
| Channel depth (channel ends) | 1 1/4" |
| Whip tail beyond the whip line (whipped ends) | 3" |
| Structural ridgeline | 83 % of the length (109.56" at 132") |
| Tree strap (added 2026-11-22, tree straps only) | 120" (10') |

Also `[mock-derived]`: the 78–88 % ridgeline band the range warning uses.
With the defaults the body cuts 137" × 60" (two 2.5" rolled channels, two
1" rolled side hems) and fills the 60" fabric exactly; whipped ends cut 140".

**No 3D tab (recorded):** the cloth engine holds pinned rectangles in place
and cannot gather a whole end to a point, so a hung hammock is not
simulated. The page shows the disabled tab with the reason. Needed first: a
"gather to a point" pin or an edge-to-point seam in the cloth engine; then
an `assembly3d.ts` hung from two points a ridgeline apart, with a sag/lay
report.

Open for the owner: confirm the safety policy (one standing load warning,
never blocks export; decisions.md 2026-11-16) and whether to keep the 83 %
figure. Follow-ups: 3D (above), ~~bug-net zip~~ (DONE 2026-11-22: `bug_net`, a mesh net the body long and
wide plus an allowance each side, sewn to one long side and zipped to the
other, its ends into the channels with the body), ~~double-layer option~~ (DONE
2026-11-22: `layers: 2`, the body cut twice and sewn as one through the
hems and ends), ~~suspension hardware on the BOM~~ (DONE 2026-11-22:
`suspension: 'tree_straps'` adds two tree straps, `strap_length`
placeholder 10' flagged, and two load-rated carabiners), ~~a wider body~~ (DONE 2026-11-22: `join_widths`, two halves joined by a
flat-felled centre seam; the fabric check then uses the half) from two widths joined by a
flat-felled centre seam (would give `seam_allowance` a job).

#### 10c. Top quilt — DONE 2026-11-21 (`pattern/10c-quilt`, no 3D)
Engine: `src/lib/pattern-engine/primitives/chambers.ts`, the baffle-chamber
primitive: `layoutChambers` (walls at an even pitch no longer than the
spacing, a volume and fill per chamber, Simpson over a tapered width) and
`fillGrams` (volume in³ × (1 + overstuff) / fill power in³/oz, in grams).
Baffled = a box of the loft height; sewn-through = a parabolic lens, 2/3 of
the box. Tests: `pattern-engine/__tests__/chambers.test.ts`.

Generator: `src/generators/quilt/`, page `src/components/quilt/`, project
schemaVersion 17, "Shelter and sleep" category. A tapered shell and liner
(straight taper shoulders to foot), chambers across the width, baffled
(one trapezoid mesh baffle per wall: shell edge to the shell's width, liner
edge to the liner's) or sewn through. Shell differential across the width
(sewn-through forces 0). Fill per chamber written in each chamber on the
liner and listed in the fill step; total in grams on the BOM. Sewn or zipped
footbox (zipper = half the foot width + the footbox length). Convention B:
cut size, explicit 0 on every edge, perimeter sew line and every wall drawn.
Fabric-width check on the wider of the two cuts (error on `shoulder_width`).
Registered in every shared table (generators, inputs review, persistence,
export sweep, export matrix, page composition and error states, warning
links, settings a11y, App smoke and search).

Every number is a placeholder with no vault source, listed in `PLACEHOLDERS`
(`src/generators/quilt/defaults.ts`), left empty in the default project and
named in one `[mock-derived]` note. **Check each against the vault:**

| Placeholder | Value |
|---|---|
| Length head to foot | 78" |
| Shoulder width | 54" |
| Foot width | 40" |
| Footbox length | 20" |
| Usable fabric width | 58" |
| Loft (baffle height / sewn-through peak) | 2" |
| Chamber spacing (largest pitch) | 6" |
| Shell differential (baffled only) | 3 % |
| Fill power | 850 in³/oz |
| Overstuff | 10 % |
| Seam allowance | 12.7 mm (1/2") |

Also `[mock-derived]` in effect: the 2/3 sewn-through volume factor (a
parabola, not a measured loft). With the defaults: 13 chambers at 6", 12
baffles 3" tall cut, liner ≈ 55" × 79", shell ≈ 56.7" × 79", fill ≈ 269 g
(9.5 oz).

**No 3D tab (recorded):** the cloth engine has no loft or fill model (the
chambers would lie flat) and no lying body form. Follow-ups: ~~an underquilt
mode~~ (DONE 2026-11-22: `kind: 'underquilt'` — a rectangle the shoulder
width across, the differential on the liner (the layer toward the
hammock), both ends rolled together into a shock-cord channel
(`end_channel` placeholder 3/4", Hem primitive) with the chambers between
the channel lines, no footbox; shock cord and cord locks on the hardware), ~~a neck drawcord/snap and pad straps~~ (DONE 2026-11-22:
`neck: 'drawcord'` rolls the head, both layers, into a channel (placeholder
3/4", Hem primitive) with the chambers starting below it, a drawcord, cord
lock and neck snap on the hardware; `pad_straps` marks loops a third and
two thirds down each side seam and lists two straps about the pad width,
`pad_width` placeholder 20"),
~~vertical side baffles~~ (DONE 2026-11-22: `side_baffles`, baffled only — a
mesh strip the finished side long and the loft tall down each edge, the
cross baffles' ends caught under it, more mesh on the BOM), ~~joining fabric widths for a wider quilt~~ (DONE
2026-11-22: `join_widths` cuts each layer as a mirrored pair of halves,
every line clipped to the half, a flat-felled centre seam; the fabric
check then uses the half), synthetic
batting instead of a fill weight.

#### 10d. Bathtub-floor bivy — DONE 2026-11-22 (`pattern/10-doors-bivy-apparel`, no 3D)
Engine: `src/lib/pattern-engine/geometry/chordArc.ts` — the circular arc of
a given length standing on a given chord (bisection on sin(θ/2)/(θ/2), up
to a semicircle), with `chordArcPoints`. Tests: `chordArc.test.ts`.

Generator: `src/generators/bivy/`, page `src/components/bivy/`, project
schemaVersion 18, "Shelter and sleep". Four pieces: a one-piece bathtub
floor (tub sides fold up, each corner square folds on its diagonal into an
ear: no floor seam below the tub height), a top wider than the floor, and
head and foot gussets cut to the arch the top makes over the floor (base =
floor width, arc = top width); head gusset in no-see-um mesh (default) or
the top fabric. A side zipper in the top-to-tub seam from the head, left or
right. Convention B (cut size, explicit 0, sew lines drawn). Fabric-width
errors on the floor and top, arch beyond a semicircle an error on
`top_width`. Derived head height (tub + arch rise). Registered in every
shared table.

Placeholders (common starting points, `[mock-derived]`, editable, no vault
source): floor length 84", floor width 26", tub height 5", top width 40",
side zipper 48", usable fabric width 58", seam allowance 12.7 mm. With them:
floor 95" × 37" cut, top 85" × 41", arch rise ≈ 12.6", head height ≈ 17.6".

**No 3D tab:** the cloth engine has no lying body to hold the top up.
**3D — DONE 2026-11-22** (`bivy/assembly3d.ts`): the floor's 3D copy is cut
as a cross (corner squares out, each corner's two edges seamed: the same tub
as the folded ears), held flat on the ground; a sleeper block inside; the
top placed over the rim, its long edges seamed to the side rims; the head
and foot gussets draped in the end planes, bases seamed to the end rims and
arches to the top's short edges. Seams close to < 1 mm, p99 stretch ~3 %.
The J-zip bivy too since 2026-11-22: the head section and the body top
placed either side of the J line, joined across by the zipper (shown
closed), both seamed to the rims.
Tests: `bivy/__tests__/assembly3d.test.ts`, an assembly-sweep case, an e2e
target.
Follow-ups: ~~a bug-net variant~~ (DONE 2026-11-22: `top_material: 'mesh'`
puts the top and both gussets in no-see-um mesh over the same waterproof
tub, with an info note), ~~a J zipper~~ (DONE 2026-11-22: `zip_style: 'j'`
splits the top at `j_from_head` (placeholder 30") into a head section and a
body; the zipper runs across the top there and down the zip side, length =
top width + side run), ~~a hood/brim~~ (DONE 2026-11-22 as a brim: `brim`
adds a channel strip across the head of the top for a wire or short pole,
`brim_from_head` 6" and `brim_channel` 1" placeholders; a shaped hood stays
open), stake loops at the tub corners.

#### 10e. Gaiters (apparel beyond the skirt, first item) — DONE 2026-11-22 (no 3D)
Engine: `src/lib/pattern-engine/geometry/frustum.ts` — the flat development
of a tapered tube (annular sector; apex flips when the bottom is narrower;
equal ends a near-rectangle). Tests: `frustum.test.ts`.

Generator: `src/generators/gaiter/`, page `src/components/gaiter/`, project
schemaVersion 19, "Apparel" category. One piece cut as a mirrored pair: calf
circumference at the top, boot circumference at the bottom, height at the
back, the bottom dropping at the front over the laces (a parabola, 0 at the
back). Hook-and-loop overlap (default; overlap + hem on the overlap edge,
hem on the underlap, loop and hook strips drawn) or a zipper (seam
allowance on both front edges). Top elastic channel and bottom hem from the
Hem primitive (rolled default). Instep strap anchors half-way round each
side, a lace hook at the front. Hardware per pair on the BOM. Registered in
every shared table.

Placeholders (common starting points for a mid-height gaiter, flagged
`[mock-derived]`, editable; not measurements): height 12", top 15", bottom
17", front drop 1.5", overlap 1", hem 1/2", elastic channel 3/4", elastic
90 % of the top, instep strap 9", fabric 58", zipper seam allowance 12.7 mm.

**3D check — DONE 2026-11-22:** `src/generators/gaiter/assembly3d.ts` wraps
the piece back onto its cone (the `cone` placement, as the circle skirt)
round a leg capsule a little inside the top circumference, closes the front
(hook strip over loop strip, or the zipper edges) with a seam, and holds the
top where the elastic grips. Tests: `gaiter/__tests__/assembly3d.test.ts`,
an assembly-sweep case, an e2e target `gaiters`. A bottom narrower than the
top is not wrapped (the cone hangs from its apex, so it would be upside
down); the tab says why. Still open in 10e: a
wind shirt, beanie or anything with sleeves, which needs a drafting engine
(slopers, grading, armholes).

#### 10f. Drafting engine for sleeved garments — PLANNED 2026-11-22 (not started)
Small, separately testable steps; each lands with its own tests and no
garment depends on a later step:

1. DONE 2026-11-22 — **Measurement set** (`pattern-engine/drafting/measurements.ts`;
   tests `measurements.test.ts`; scye depth added as a measured length so
   no drafting-system formula is needed for it): chest,
   waist, hip, back length, shoulder, neck, arm length, bicep, wrist, as
   user inputs with ease per measurement. No size table: a standard size
   chart (ASTM D5585, ISO 8559) is not in the repo, so presets wait until
   one is sourced. Tests: validation, unit conversion.
2. DONE 2026-11-22 — **Bodice block** (`drafting/bodice.ts`; tests `bodice.test.ts`;
   the front neck depth is solved so the neckline measures half the eased
   neck; the shoulder drop is a required option, flagged by the garment): front and back from the
   measurements — chest/4 + ease per quarter, shoulder slope, neckline
   (quarter ellipse) and armhole (Bézier through the armhole depth and the
   shoulder and side points). Tests: front + back widths = chest/2 + ease,
   seam lengths match (shoulder to shoulder, side to side), curves smooth.
3. DONE 2026-11-22 — **Sleeve block** (`drafting/sleeve.ts`; tests `sleeve.test.ts`;
   S-curve cap halves solved by bisection, cap ease optional, default 0): cap height solved so the cap
   curve length = armhole length + cap ease (bisection, like `chordArc`),
   bicep and wrist widths, sleeve length. Tests: the cap matches the
   armhole within a millimetre; front and back cap halves match their
   armholes.
4. DONE 2026-11-22 — **First garment on it: a wind shirt** (`src/generators/wind-shirt/`,
   page `src/components/wind-shirt/`, schemaVersion 21, Apparel; built
   Convention B like the shelter line rather than A, because the drafted
   outlines are offset per edge (0 on the bound neck, the hem and cuff
   allowances elsewhere); back and front whole, two sleeves, a neck binding,
   a quarter zip, elastic cuffs; straight or shaped body; tests pin every
   seam pair — shoulders, sides, armhole to cap (less the cap ease, within
   1 mm), underarm seams, neckline to binding — in three variants;
   measurements empty by default and drafted from a flagged example body), (pullover, set-in sleeve, hood
   optional later), Convention A. Tests: every seam pair matches in length.
5. DONE 2026-11-22 (body; sleeves open) — **3D**: `armForms` in
   `cloth-engine/body.ts` (a capsule per arm from the shoulder, angled out);
   `wind-shirt/assembly3d.ts` hangs the back and front on a torso built from
   the measurements (chest girth as a 1.4:1 ellipse, nape to waist,
   shoulder width, neck), arms held out 45° so the side seams pass under
   them, shoulder and side seams closed. Tests: `assembly3d.test.ts`, an
   assembly-sweep case, an e2e target. **Sleeves in 3D — DONE 2026-11-22:**
   the `cone` placement takes an `axis` (and `ref`), so each sleeve wraps a
   cone along its arm (apex past the wrist, the underseam under the arm),
   its cap seamed half by half into the front and back armholes and its
   underseam closed; seams close to < 1 mm, p99 stretch ~10 % at the caps.

**Beanie — DONE 2026-11-22 (before the engine, no 3D).** Engine:
`src/lib/pattern-engine/geometry/gore.ts` — gores of a half-ellipsoid dome
(width at each height = ring circumference / N, length = the meridian's
arc). Generator `src/generators/beanie/`, page `src/components/beanie/`,
schemaVersion 20, Apparel: N gores from head circumference + ease and a
crown height, a folded cuff band or a single-fold hem (Hem primitive),
Convention B. Measurements are inputs; placeholders (head 22", ease −1",
crown 7", 6 gores, cuff 2.5", hem 1/2", SA 9.5 mm) are flagged starting
points, not a size chart. No 3D: no head form.

**Order for the rest of item 10:** 10b gathered-end hammock and 10c top quilt (done above), then 10d bivy (done above; bug net a follow-up) (curved long zipper,
mesh cut sheet), 10e apparel beyond the skirt (gaiters first; a garment
drafting engine before anything with sleeves). Each builds the same way as
the tarp, with placeholders flagged `mock-derived`, sewn fabrics only, until
the vault is available.

## Pouch styles beyond the mag pouch

Not needed yet. The two mag-pouch constructions (folded-T single, SOE pleated
card) cover every mag-pouch build the vault has reconciled; the three stub
strategies in the pouch engine (`boxed_gusset`, `center_gusset`, `taco`) have
no mag-pouch evidence behind them and stay stubs until a build needs one.

Where multiple styles do pay off is a **general-purpose pouch line** built on
the same engine and components (PALS field, interior loop, lids, hems). Order
by evidence:

1. **Boxed rifle pouch (Rallyman / CQB)** — implements the `boxed_gusset`
   stub. 2 or 3 mags in one box, box mark 2" / fold 1", detached Velcro lid
   with a 6" liner loop field (= 2" min contact + 3–4" lid travel), buckle
   strap channel left open at the bottom. Build datum: two pouches ≈ 45 min.
   `rigs/lbv-rallyman-pouch.md`, `bags/zip-pouch-boxed-corners.md`.
2. **Placard triple (covert rig)** — one 9" open-top cell for three M4 mags,
   hook-backed for a Velcro field; face 11" cut with ~2" bow allowance. Back
   height is Open. Fits the pleated card with `cell_count 1`, span 9", face
   11" once a `placard` mount exists. `rigs/covert-triple-mag-pouch.md`.
3. **Pistol / utility pouch with faux-webbing lid** — lid stock = 2 × finished
   width (3" → 1.5"), mirror-part designation as step 1. Body dims Open until
   pistol mags are measured (same blocker as the pistol presets).
   `rigs/lbv-pistol-mag-pouch.md`, `reference/technique-faux-webbing.md`.
4. **Admin / organizer pouch** — the flat Velcro-backed organizer is already
   item 5 in the pattern list; pen slots, notebook pocket and split Velcro
   strips generalize into an "admin face" for the modular back panel.
   `bags/soe-tactical-organizer.md`, `bags/velcro-partial-coverage.md`.
5. **Hook-backed mesh pocket modules** (medpack interior) — sized to a loop
   wall, pod-to-wall interface rule. `packs/medpack-pouch-system.md`,
   `packs/toolpod-velcro-pod-interface.md`.
6. **Gross-motor details as options, not pieces** — two-strip lid Velcro with
   a 1" dead channel, open cord channel in every lid, rows opening away from
   each other. `rigs/microrig-gross-motor-details.md`.

Architecture note: the vault argues (`mag-pouches/mag-pouch-modular-velcro-back.md`)
for **back primitive × face primitive**. The pleated card already separates
back and face; the general pouch line should keep that split so a mag face,
an admin face, a mesh face or a blank loop face can sit on the same
PALS / hook-backed / belt back.

## 3D preview and fit checking

Worth doing, in stages; the engine already emits fold and stitch lines with
roles, which is most of what a folder needs.

**Status (2026-09-11):** Stage 1 is built — `src/lib/fold-engine/` splits a
piece by its full-span fold lines, hinges the regions in a tree rooted at the
label point, and folds them by per-fold angles; `FoldPreview3D` renders it
with Three.js (lazy chunk, WebGL-gated) with a fold slider, per-fold angle
overrides and a "flat" toggle. Stage 2 is started: the Mag Pouch page drops
the magazine solid into the folded pouch at a generator-supplied base
(`FoldObject.base`), so exposed height, lid reach and cell fit are visible.
Verified in headless Chromium on every page. Stage 2 now reports the cavity
by ray-casting from the object against the folded panels (across, depth,
floor, lid-over) with lid-hung panels excluded from the across/depth rays;
the card face is placed folded over its back. A sweep test folds every
generator's default output (seven patterns plus both strap families) and
checks tiling, rigidity and tree completeness. Findings the folder surfaced:
the folded-T body was missing its bottom-to-back fold line (fixed), and
grid-cut pieces need the hinge tree to expand from the largest panel first
or wings hang off corner squares (fixed). Still open: object bases for Tri-Zip.

**Stage 3 status (2026-09-11):** `src/lib/cloth-engine/` — position-based
dynamics on a rectilinear grid mesh per piece: stretch constraints hold flat
edge lengths, bending constraints remember the rigid creases analytically
(fold angle at each fold segment; flat everywhere else, and flat wherever the
rigid start is torn at a three-way corner), seams pull matched stitch lines
together with a ramped rest length and a per-iteration cap, and the magazine
is a box collider with continuous push-out so cloth slides over its edges
instead of tunnelling. The viewer's "simulate seams" mode starts from the
rigid fold and relaxes; generators declare seams in flat coordinates
(`FoldPreview3D.seams`). Tests pin: two panels seamed edge to edge (0.5 mm
gap, < 2 % stretch); the folded-T body seamed round a magazine (< 10 %,
the residual at the band/wing corner where SA turns under a seam); the lid
closure holding over the magazine; the card face puckering 38 mm at
mid-cell against 3" divisions with < 8 % stretch.

Three pattern faults the cloth surfaced and that are now fixed in the
generators: the folded-T lid was 2 × exposed height short (it must climb
behind the magazine, cross the top, come back down to the mouth, then
overlap — 8.25" not 6" on a 30-round AR mag); the folded-T outline needed
its corner squares notched (a true cross) because they cannot fold two
ways; and a lid that wraps a proud magazine takes two creases in use, which
both constructions now emit as fold lines with explicit default angles.

Not modelled yet: gathered seams (the face bottom "alligator lips" —
needs a finer mesh or a pleat solver), self-collision between the face's
two layers and between overlapping wings, friction, and gravity draping.

**Sweep of the other generators (2026-09-11, later):** every pattern that
can be assembled was run through the cloth check with a block of its
finished size inside (`src/lib/cloth-engine/__tests__/patterns.test.ts`).
It found that the Zip Pouch (boxed) and Roll-Top cut their panels at the
finished length and then boxed the corners, which takes the depth back off
the width (and half the depth off the height): both now add it. The Book
Cover's `width_ease` / `spine_bulge` were resolved but never drawn; a single
`coverPanelDims` now feeds every cover-width site. The Zip Pouch, Roll-Top
and Book Cover pages carry object, placements and seams, so their previews
run the same check (zip: 9 % stretch at the boxed corners, seams closed;
roll-top: 11 %; book cover: 6 mm across-spine clearance on the hardcover
default). Two-panel bags pin only the host panel under the contents
(`FoldObject.pin: 'footprint'`).

**Tri-Zip and Book Cover flaps (2026-09-11, later still):** placements can
now rotate a piece and attach it to the folded region it is sewn to, and a
mirrored piece becomes two instances (`mirrorPieceX`). The Book Cover's
flaps ride inside their covers and seam at the outer edge and hems; the
Tri-Zip body (`assembly3d.ts`) assembles wings, zip strips, centre, back
and a gusset turned into its U round the finished block. That found the
gusseted front 50 mm wider than the back (wings now give up the zip strip
width) and one design gap: nothing closed the top of the pack. Decision
(2026-09-11): a **top panel**, finished width × depth, sewn to the back top
edge and both gusset ends before the final front seam, with the top handle
on it. The assembly now encloses the block completely. Still approximate:
the rounded/tactical back panel's shaped top corners are seamed as if
square.

Still outside the check: Tool Roll (not on the pattern engine), Tri-Zip
with `split_gusset` or the direct zipper method (assembly returns null and
the page falls back to the plain preview), the Zip Pouch's cross-bottom /
gusset / multi-panel styles, and Circle Skirt.

**Round two (2026-09-11, later):** body forms (torso = rounded chest +
shoulder capsule + neck), draped placements and pins, so the padded strap
pair and the H-harness are checked on a medium torso with a written fit
verdict; vertex–triangle self-collision so layers stack; finished-envelope
measurement (`clothBounds`) with the vault's pleated-card wrap and the zip,
roll-top and Tri-Zip envelopes asserted in tests; stretch counts elongation
only and is measured inside the stitch lines.

**Round three (2026-09-11, later):** gathered seams (sample by the shorter
side; the pleated face bottom is now sewn and the magazine rides 1" up on
the gathers, matching the vault), material stiffness (isometric plate
constraint for foam and webbing), gravity, and coverage: Zip Pouch
gusset-strip / multi-panel / cross-bottom, Tri-Zip split gusset and direct
zips, and the Circle Skirt (cone-wrapped panels hung over a hip form).
Left: gusset-strip with a front zipper, torso sizes beyond medium, the
Tri-Zip's shaped top corners, and a finer mesh for gathers.

- **Stage 1 — fold preview (done, see status).** Every piece is flat panels
  joined at `fold` edges. Treat each region between fold lines as a rigid
  panel, hinge them at the fold angles the construction implies (a folded-T is
  four hinges; the card face is one mouth fold), and render with Three.js. Cheap,
  deterministic, and it catches the class of bug that bit this session
  (wrong lid length, wings that do not reach). Also renders the strap
  J-curve on a torso silhouette. Vault-derived checks become visual:
  cell span against a magazine box, lid reach, exposed mag height.
- **Stage 2 — object fit.** Drop a parametric magazine / phone / tool solid
  into the folded pouch and report clearance and coverage. The pouch engine's
  `CarriedObject` already carries the dimensions.
- **Stage 3 — cloth simulation (built, first pass; see status below).** Pucker and pleats are what a
  rigid folder cannot show. Options: a position-based-dynamics cloth in the
  browser (Three.js + a PBD solver, or a WASM build of ARCSim / Bullet soft
  body) seaming pieces along `stitch` edges. Cordura is stiff enough that a
  coarse cloth with high bending stiffness is plausible; foam and webbing
  would be rigid bodies. Expect this to need a dedicated worker and days of
  tuning per construction; it earns its keep only for the pleated face and for
  padded straps on a body.
- **Validation loop.** Whichever stage: compare the simulated finished
  dimensions against the vault's on-camera measurements (12 × 5.5 card, 1.5"
  vs 3" ride height for cradle vs pleat). Where they disagree, the vault says
  which number to trust.

Prerequisites already on the list: draw annotations and notches in exports,
per-material cut sheets, and a `Pattern`-level record of which edge seams to
which (the tri-zip `seam:` path convention is the seed).

## Engine work that unlocks several patterns

- DONE 2026-09-12 (`src/lib/pattern-engine/primitives/palsField.ts`) — **PALS field primitive** on any panel: rows × columns, bartack map, laser-cut
  variant, edge margin ≥ 0.25". Needed by 2, 5, 7, 8, 9.
  `plate-carriers/pals-spec-1in-spacing.md`, `plate-carriers/pals-laser-cut-laminate.md`.
- DONE 2026-11-16 (`src/lib/pattern-engine/primitives/hem.ts`) — **Hem primitive**: per-edge hem depth, mark-at-double line, cut = finished +
  hems, `production_mode` forcing ≥ 0.5". Needed everywhere SOE-style.
  `resolveHem` (single fold per the vault rule, or a double/rolled fold at
  2 × depth), `hemmedCut`, and `hemLines`, which draws the raw edge, the
  creases (labelled so the 3D preview folds them 180°) and the mark on a
  straight or shallow curved edge. The organizer and the mag-pouch card still
  compute their hems inline; moving them onto the primitive is a follow-up.
- DONE 2026-11-16 (`src/lib/pattern-engine/geometry/catenary.ts`) — **Catenary
  edge curve** for cat cuts: `catenary(span, sag)` solves the curve through
  both ends with the given mid-span sag (depth, slope, arc length), and
  `catenaryPoints` samples it on any chord. Tests pin it against the
  parabola and the shallow-curve arc-length estimate. Needed by 10a and any
  tensioned edge.
- DONE 2026-11-21 (`src/lib/pattern-engine/primitives/chambers.ts`) — **Baffle-chamber
  primitive and fill weight**: chamber walls at an even pitch, volume and
  fill per chamber (baffled box or sewn-through lens), fill in grams from
  fill power and overstuff. Needed by 10c and an underquilt.
- DONE 2026-11-22 (`src/lib/pattern-engine/geometry/chordArc.ts`) — **Arc on a
  chord**: a panel of one width sewn to a narrower base, as an arch (bivy
  end gussets; any gusseted arch).
- DONE 2026-11-22 (`src/lib/pattern-engine/geometry/frustum.ts`) — **Tapered
  tube development**: a cone frustum laid flat (gaiters; cuffs, tapered
  sacks).
- DONE 2026-11-22 (`src/lib/pattern-engine/geometry/gore.ts`) — **Dome gores**: N
  panels of a half-ellipsoid crown (beanie; hood tops, caps).
- **Layer budget per seam**: emit max stack per seam and a machine-class
  requirement; annotate "sew forward only" above ~8 layers.
  `reference/technique-sewing-through-bulk.md`, `rigs/splitfront-technique-layer-budgeting.md`.
- DONE 2026-11-22 (`Piece.assembly`, `patternToSvgByAssembly`) — **Cut sheets grouped by assembly**:
  a piece may name its sub-assembly; the export panel offers "Cut sheets by
  assembly" (one printable sheet per kit, untagged pieces under Other) when
  the adapter sets `groupByAssembly`. The plate carrier tags Front, Back,
  Shoulders and Cummerbund; other generators can opt in. The material ×
  width × length summary on SOE's drawer lengths was already in the cut
  list (2026-09-12). `reference/soe-production-principles.md`.
- DONE 2026-11-22 (`exports/cutList.ts`, `shrinkageFor`) — **Stitch-shrinkage compensation**:
  every strip-stock line in the cut list (table and CSV) carries the rule —
  Velcro cut 2" long and trimmed after sewing; webbing trimmed after sewing
  on a run longer than the 10" drawer; binding and tape the 1/4" pucker per
  taped edge. Generators keep their own over-cuts; the tag says what to do.
  `reference/technique-stitch-shrinkage.md`.
  `reference/technique-stitch-shrinkage.md`.
- DONE 2026-09-12 (`maxRowWidth`, default 1400 mm) — **Exporter layout**: pieces currently lay out in one row; a multi-cell card
  with twelve strips is very wide. Row-wrap by a page width.
- DONE 2026-09-12 (grain arrows, notch ticks, wrapped notes in SVG) — **Annotations in exports**: `PieceAnnotation` labels are not drawn by the SVG
  exporter (only the piece name). Draw grain arrows and notch marks.
- DONE 2026-09-12 (`9100d20`; verified 2026-11-21) — **Foam / mesh on separate cut sheets** (different blade): `patternToSvgByMaterial`
  (`src/lib/pattern-engine/exports/svg.ts`) gives one SVG per `materialId`, the
  shared `PatternExportPanel` exports them, and the export sweep checks every
  generator's per-material sheets (`exports-sweep.test.ts`).

## Vault items deliberately not encoded

- Pistol cell width, Kydex wedge dimensions, H-harness pad dimensions, sling
  lengths, LBV strap lengths: Open in the vault. Inputs with warnings, not
  defaults.
- The 30" adjustment figure in `rigs/micro-rig-common-platform.md` belongs to
  the standard webbing straps, not the H-harness (flagged in
  `rigs/harness-h-geometry.md`).
- Cradle length is "shortest that keeps primers covered", not derived from
  magazine depth — kept at 3" with a mock-first warning when the mag is
  thicker than 1".
