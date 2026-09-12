# Review — the five newest generators (2026-09-12)

Critical read of `organizer`, `fanny-pack`, `clamshell-pack`, `plate-carrier`
and `lbv`, each built by a different fork in a single pass and never reviewed.
Fixes are in the generator files only; every fix carries a test.

## The warning rule this pass applied

Four of the five sat at the top of the "warnings on an untouched project"
sweep. The rule used to cut them, reusable for any generator (the padded sling
at 11 is the worst case and is not in this scope):

A generator's warnings list carries only statements **contingent on these
inputs** that the user can act on by changing a number. Three kinds of text do
not belong in it:

1. **Standing construction facts**, true of every build of the pattern (the
   Velcro runs horizontally; long seams draw in; a non-locking slider is fine).
   These belong in the step text, where the sewer meets them.
2. **Restatements of a value the user just typed** or simple arithmetic on it
   (belt range, adjustment sums, derived spans). These belong in Derived
   Numbers.
3. **Per-field "the vault never measured this" notes.** The settings panel
   marks those fields itself; one consolidated note naming them is enough.

Severity follows the same line: `warning` only when something should change
before cutting, otherwise `info`.

| Generator | Warnings on a fresh default, before | After |
|---|---|---|
| Tactical Organizer | 6 (1 a false alarm) | 2, both notes |
| Fanny Pack | 5 | 3, all notes |
| Clamshell Pack | 6 | 6, one a real warning |
| Plate Carrier | 6 (4 duplicated a field hint) | 2, both notes |
| Modular LBV | 10 (banner read "4 warnings, 6 infos") | 6, no warnings |

The clamshell keeps six because five of them are genuine reconciliation notes
about numbers the medpack videos never state (lid depth, underwrap, compression
extra) plus the real `depth-wrap` warning, which is the on-camera failure. The
LBV's remaining six are field divergence notes and derived-figure notes; the
two derived ones (`belt-usable`, `adjustment`) would be better in Derived
Numbers, which is a page change and out of scope here.

## Findings

### Tactical Organizer

| Severity | Finding | Where | Fixed |
|---|---|---|---|
| broken | The bifold body drew a hem at both ends of **each** half: four hems on a continuous panel, two of them in the middle where there is no raw edge, and a cut length counting two hems that are never folded. | `buildPattern.buildBody`, `inputs.body_cut_length` | yes — the body is now hem, pocket, fold, pocket, spine, pocket, fold, pocket, hem; two hems, two bottom folds, one spine fold; cut length 4 × pocket + 2 × hem (22" on the defaults, not 24"). The vault's "twice as long" is a loose remark, so the variation now also carries a mock-derived note. |
| confusing | The default project warned that its own default Velcro length "fights the side seam". The test was `> clear_width - 1e-6`, so the recommended value tripped it. | `buildWarnings` | yes — fires only above the clear width. |
| confusing | Three of the six default warnings were standing notes, two of which were already in the step text verbatim. | `buildWarnings` | yes — moved to the Velcro and side-seam steps. |

The bellows algebra, divider positions and the 12 × 5 / 6¼ × 5¼ cut list all
reconcile with `bags/soe-tactical-organizer.md`; the existing tests pin them.

### Fanny Pack

| Severity | Finding | Where | Fixed |
|---|---|---|---|
| wrong-number | The belt and its tabs were hardcoded to `webbing-38`, so choosing the 1" belt still put 1.5" webbing on the cut list and in the strip-stock total. | `buildPattern` | yes — the id follows the chosen width. |
| confusing | Two of five default notes were standing advice (`slider`, `shrink`); both were already said in the hardware note and the steps. | `buildWarnings` | yes — removed; the shrink rule moved into the hoop step. |

Hoop arithmetic checks out: zipper panel + rising gusset = 2 × (width + height)
for any lid extension, which is the invariant the lid-drop rule depends on.

### Clamshell Pack

| Severity | Finding | Where | Fixed |
|---|---|---|---|
| wrong-number | Every PALS row on the bag — face, both side runs, bottom — was emitted as one cut-list entry at the **longest** length: 22 rows at 10" where the real consumption is 5 at 10", 3 at 7" and 14 at 5.5". A cutter working from the list would cut about 40% too much webbing. | `buildPattern` | yes — one entry per distinct length, each naming the surface it serves. |
| confusing | Six strap tabs but four buckles, with no explanation, reading as a miscount. | tab piece label | yes — the label now says four take buckles and the pair anchors the stow pocket. |
| cosmetic | The BOM added `2 × max(sa)` by hand to every piece. | `bom.ts` | yes — replaced by the engine's SA-inclusive bbox (below). |

The lip / PALS / seam width budget on the gusset face and the alligator-mouth
bottom both match `medpack-zipper-lip-math.md` and
`medpack-technique-alligator-mouth.md`, including cutting the bottom last.

### Plate Carrier

| Severity | Finding | Where | Fixed |
|---|---|---|---|
| wrong-number | The back comfort panel used `mesh-spacer`; every other piece of spacer mesh in the codebase is `spacer-mesh`. The cloth engine keys bending stiffness on that exact string, so the panel simulated as plain cloth instead of mesh, and the cut list carried two lines for one material. | `buildPattern.comfortPieces` | yes |
| wrong-number | 2" webbing was `webbing-51` here and `webbing-50` in the clamshell. The engines derive the id as `Math.round(mm)`, so 51 is canonical and the clamshell was the outlier. | both generators | yes — all 2" webbing is `webbing-51`. |
| confusing | Four identical yellow warnings, one per unmeasured wearer field, on an untouched project; the settings panel already marks those fields. | `buildWarnings` | yes — one consolidated note naming all of them. |
| cosmetic | The pocket flap's hook patch had a 0.5" margin on one side and 1" on the other. | `pocketFlap` | yes |

### Modular LBV

| Severity | Finding | Where | Fixed |
|---|---|---|---|
| confusing | Up to fourteen per-field mock-derived **warnings**, the single largest source of noise in the app. | `mockDerived` | yes — one consolidated note listing each field and its default value. |
| cosmetic | `webbing-51` normalisation (see above). | — | yes |

### Cross-cutting

| Severity | Finding | Where | Fixed |
|---|---|---|---|
| wrong-number | All five BOMs printed the **drawn** box as the piece size. Under Convention A the drawing is the finished size and the allowance is per edge, so the plate carrier and LBV cut lists understated every turned piece. | all five `bom.ts` | yes — they now use `bboxFromPieceWithSa`, the same helper the SVG and PDF exporters use for layout and yardage, so the cut list, the drawing and the exports agree. |

## Least trustworthy to sew from

**The Modular LBV.** Not because its code is worse — it is the most carefully
written of the five — but because so much of its geometry is unmeasured. The
panel outline, row pitch, pad size, cross-piece angle and front strap positions
are all defaults someone chose, and the vault's own note says the front column
count does not reconcile ("6 1/2" strips read as 4, but 24 mags needs more").
It will produce a coherent pattern that may not fit a person. The consolidated
note now says so in one place instead of fourteen.

The **plate carrier** is second for the same reason, and its own
`reference-grade` note is honest about it. The **organizer** is the one I would
cut fabric for today: every number traces to a video with the reconciliation
recorded.

## Not fixed, for the parent

- `belt_webbing` on the fanny pack is guarded as a length but is a unitless
  inch enum (1 or 1.5). Harmless today because validation checks the two
  values, but the guard is the wrong kind. The guard blocks belong to the
  validation pass.
- The LBV's `belt-usable` and `adjustment` notes are derived figures, not
  warnings; they belong in the page's Derived Numbers block. Page files were
  out of scope.
- The plate carrier's settings panel does not mark its mock-derived fields
  (`mockDerived` appears 15 times in the LBV panel and 0 times here), so the
  consolidated note is currently the only signal for those four fields.

## Tests

Added `review.test.ts` to each generator (organizer 4, fanny pack 2, clamshell
2, plate carrier 3, LBV 3 cases). Three existing tests encoded behaviour this
pass changed and were updated, each with a comment saying why: the organizer's
24" bifold body, the plate carrier's four mock-derived warnings, and the LBV's
per-field mock-derived ids. Two clamshell tests that named the single
`clamshell-pals-row` piece now sum the grouped entries. All five suites pass
(56 tests, 14 files).
