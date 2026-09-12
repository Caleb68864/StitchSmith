# Review — project state, units and import/export (2026-09-12)

Scope: `src/state`, `src/export`, `src/storage`, `src/utils`, every generator's
`inputs.ts` / `defaults.ts`, and the validation fuzz. The hardening pass had
already stopped this layer crashing; this pass asks whether it is predictable
and pleasant to use.

## Findings

| # | Sev | What | Where | Fixed |
|---|-----|------|-------|-------|
| 1 | High | Four hooks told the user the wrong generator on a bad import: importing any file into the Fanny Pack, Clamshell, LBV or Plate Carrier page said "into organizer". Copy-paste from the organizer's hook. | `src/state/use{FannyPack,ClamshellPack,Lbv,PlateCarrier}Project.ts` | Yes — all 14 hooks now share `assertGeneratorMatch` |
| 2 | High | Plate carrier foam thickness was labelled "(mm)" in the panel but resolved through the inch converter: typing 6 into that box built 152.4 mm of foam. `comfort_foam_thickness` had the same bug and no visible field at all. | `src/generators/plate-carrier/inputs.ts` | Yes — both are millimetres, as on the sling and LBV |
| 3 | High | `resolveInputs` threw on a scalar where a list belongs (`slot_widths`, `front_strap_positions`) and on an unknown preset/cut/side-plate. Pages resolve on every keystroke for their derived numbers, before validation has anything to say, so a hand-edited file took the page down. | organizer, lbv, plate-carrier `inputs.ts` | Yes — all fall back instead of throwing |
| 4 | High | `resolveInputs` allocated `Array.from({length: 1e9})` for the grommet count. Validation caps it at 4; resolve did not, and resolve runs first. The tab dies while the user is still typing. | `src/generators/fanny-pack/inputs.ts` | Yes — clamped in resolve |
| 5 | High | Nearly every validation message named the internal key: "pouch_width must be a finite number". Only 16 of ~370 guard rules carried a label. | `src/utils/inputGuards.ts` | Yes — labels are derived, explicit ones still win |
| 6 | Med | The Padded Sling opened with 11 of 12 boxes blank and 11 warnings, 8 of them "[mock-derived] X defaults to Y" for fields that were merely unset. The LBV, Plate Carrier and Micro Rig had the same shape. | state hooks + `defaults.ts` | Yes — see the audit below |
| 7 | Med | The Zip Pouch warned on its own defaults: `zipperLength > cutWidth` is true for every pouch that can be generated (the zip is rounded up to the next 50 mm by design), so it fired on 100% of projects and told the user to fix the generator's own choice. | `src/generators/zip-pouch/inputs.ts` | Yes — fires only when the tail exceeds a quarter of the panel |
| 8 | Med | A damaged or foreign autosave was discarded in silence: the generator opened at its defaults, which is indistinguishable from "the app lost my work", and the user cannot inspect localStorage. | `src/storage/genericProjectStorage.ts` | Yes — one toast naming the cause and pointing at Import |
| 9 | Low | "Unknown magazine preset" — no value, no full stop, no guidance. | `src/generators/micro-rig/inputs.ts` | Yes |
| 10 | Low | A project named only in punctuation exported as `___.organizer.json`. | `src/export/projectEnvelopeIO.ts` | Yes — falls back to the generator id |
| 11 | Med | Fields whose default comes from a **preset** (Zip Pouch dimensions, Book Cover book size, Micro Rig panel width, plate cut clip) are blank because seeding them would freeze the preset. | settings panels | No — panel fix, see "Handed on" |
| 12 | Low | The Organizer's default Velcro strip length equals the clear width, which trips its own "cut it 4.25" warning. | `src/generators/organizer/inputs.ts` | No — the generators fork is editing this file; fix is to default to `clear_width − 0.25"` |
| 13 | Med | The mag pouch's lid-purchase warning compares `closure_overlap` (2.5", how far the lid reaches down the face) against the vault's `min_purchase` 3", which constrains **hook** length (`hook_length`, default 3.0"). It warns on its own defaults for the wrong reason. | `src/generators/mag-pouch/buildPattern.ts` | No — not owned; compare `hookLengthIn` instead |

## Default-project audit

`valid` is `validateInputs` on the generator's own default project. `unset` counts
documented keys absent from the default. `warn` counts warning/error severity
(informational vault provenance excluded).

| Generator | valid | keys set | unset | warnings | warn-severity | note |
|---|---|---|---|---|---|---|
| book-cover | ok | 8/22 | 14 | 0 | 0 | unset are preset-derived and optional features |
| circle-skirt | ok | 10/14 | 4 | 0 | 0 | |
| clamshell-pack | ok | 28/29 | 1 | 6 | 1 | |
| fanny-pack | ok | 11/16 | 5 | 3 | 0 | unset are optional features |
| lbv | ok | 41/42 | 1 | 6 | 0 | was 26/42 and 4 mock warnings |
| mag-pouch | ok | 12/25 | 13 | 1 | 0 | unset are construction-specific |
| micro-rig | ok | 16/28 | 12 | 2 | 0 | unset are magazine/preset-derived |
| organizer | ok | 13/20 | 7 | 2 | 0 | unset are optional features |
| padded-strap | ok | 13/22 | 9 | 2 | 1 | |
| plate-carrier | ok | 31/35 | 4 | 3 | 0 | was 25/35 and 4 mock warnings |
| roll-top-sack | ok | 5/6 | 1 | 0 | 0 | |
| sling | ok | 16/16 | 0 | 3 | 1 | was 5/16 and 11 warnings |
| tri-zip-backpack | ok | 5/27 | 22 | 1 | 0 | unset are preset-derived |
| zip-pouch | ok | 6/12 | 6 | 0 | 0 | was 1 warning; unset are preset dimensions (finding 11) |

No generator fails its own validation. The vault-open numbers now ship as values,
and the caveat lives on the field in the settings panel. For the plate carrier,
whose panel does not yet mark fields, `mockD` was changed to report a field while
it is **still at the shipped guess** rather than while it is merely unset, so
seeding the defaults did not silently drop the warning.

## Units

A new behavioural test derives, per generator, which inputs are display-unit by
resolving the same number under `in` and under `mm` and seeing whether the answer
moves. It then converts exactly those fields, flips the label, and asserts the
resolved millimetres are identical. Lists of lengths (pen slots, strap positions)
convert entry by entry.

All 12 generators that expose `resolveInputs` round-trip within 0.01 mm. The 4-decimal
rounding in `convertLengthValues` is what makes 1.25 in → 31.75 mm → 1.25 in exact;
inch-first values (the ones the vault speaks in) come back unchanged.

Finding 2 was the only field where the display unit and the resolver disagreed.
`convertLengthValues` correctly skips counts, ratios, angles and booleans.

## Message rewrites

| Before | After |
|---|---|
| `pouch_width must be a finite number (got NaN).` | `Pouch width needs a number in millimetres, and that is not one. Clear the box to go back to the default.` |
| `pals_rows_side must be at most 200 in (got 1000000000).` | `PALS rows side must be at most 200 in, not 1.00 × 10^9 in.` |
| `lid_drop_target must be one of closed, partial, fully_open (got "garbage").` | `Lid drop target must be closed, partial or fully open, and "garbage" is not one of those.` |
| `production_mode must be true or false (got "yes").` | `Production mode is a yes/no setting, so "yes" will not do.` |
| `magazine must be an object (got a list).` | `Magazine is missing or malformed in this project file.` |
| `Unknown magazine preset` | `"xyz" is not a magazine this build knows. Pick one from the magazine list, or enter the cell sizes by hand.` |
| `This file is a "zip-pouch" project, not a mag-pouch project.` | `This is a Zip Pouch project file, so it cannot be opened on the Mag Pouch page. Open the Zip Pouch generator and import it there.` |

Labels are derived from the key (`pals_rows_side` → "PALS rows side"), acronyms are
preserved, and a trailing unit in the key is dropped because the message states the
unit itself (`sweep_angle_deg` → "Sweep angle ... at most 360°").

## Import and export

- **Filenames** are `<name>.<generatorId>.json`, so two generators never collide even
  when both projects are called "My Project". An all-punctuation name now falls back
  to the generator id.
- **Wrong file into the wrong page** names both pages by their user-facing titles.
- **A partially valid file** loads: `importProject` stays permissive (a well-formed
  envelope is stored and the page's banner reports the bad fields) so a user never
  loses a file over one field. `parseProjectJson` still rejects broken JSON, a foreign
  generator, a future schema version and a missing `inputs` object.
- **Storage limits** were already handled: unavailable storage and mid-session quota
  failures fall back to memory and toast. The gap was an unreadable *existing* entry,
  now covered.

## Handed on

1. **Preset-derived blanks (finding 11)** — for the Zip Pouch, Book Cover, Micro Rig
   and the plate cut fields, the panel should show the resolved value as the input's
   `placeholder`: `resolveInputs(inputs)` already returns it. Seeding these into the
   project would freeze the preset, so do not.
2. **Plate Carrier and Micro Rig panels** should mark their vault-open fields
   `mockDerived`, as the sling and LBV panels do. Their values are now seeded, so the
   field is the only place that caveat can live.
3. **Panels should import a canonical display-unit field list** rather than keeping a
   hand-written `DISPLAY_UNIT_FIELDS`. The behavioural test in
   `src/generators/__tests__/inputs-review.test.ts` derives the true list.
4. **Findings 12 and 13** are one-line fixes in files owned by the generators fork.
5. `assembly-sweep` for the tactical organizer now measures 50.2% stretch against a
   50% ceiling, from another fork's organizer geometry changes, not from this pass.

## Tests added

- `src/generators/__tests__/inputs-review.test.ts` (40) — message quality per
  generator, `humaniseField`, the units round-trip, and a `resolveInputs` fuzz that
  found findings 3 and 4.
- `src/generators/__tests__/generators.table.ts` — the generator table extracted from
  the fuzz so the fuzz, the audit and the units check share one source.
- `src/storage/genericProjectStorage.test.ts` (+3) — the unreadable-autosave toast.
- `src/export/projectEnvelopeIO.test.ts` (+3) — filenames, unknown generator ids.
- `src/state/__tests__/persistence.test.ts` — the import message now asserts both
  page titles, which is what caught finding 1.
