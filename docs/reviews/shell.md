# Shell review — landing page, navigation and the fifteen settings panels

Fork review, 2026-09-12. Method: a probe test mounted every panel with its
default inputs and again with an error on every field, counting controls,
duplicate ids, group semantics, `aria-invalid` / `aria-describedby` coverage and
visible error text; plus headless screenshots at 1440 and 420 px, light and
dark. Every fix below carries a test.

## Findings

| Sev | What | Where | Status |
|---|---|---|---|
| High | No URL for the open generator: refresh returned to the landing page, Back left the site, a generator could not be linked or bookmarked | `src/app/App.tsx` | Fixed — hash routing (`#/mag-pouch`), Back/Forward, deep links, unknown hash falls back to landing |
| High | Tool Roll numbers committed on blur only and could show a value the pattern was not using (typed rubbish stayed in the box while state kept the old number); the control was a text input, so no stepper and no numeric keyboard | `ToolRollSettingsPanel.tsx` `NumInput` | Fixed — `type="number"`, commits on every valid keystroke, draft dropped on blur |
| High | Tri-Zip stored the raw string in a numeric field when a box was cleared (`isNaN(n) ? raw as unknown as number : n`) | `sections/StyleAndDimensionsSection.tsx`, `TriZipGeometrySection.tsx` | Fixed — required dimensions report NaN, optional fields report undefined |
| High | Float noise from unit conversion shown to the user: `0.7499999999999999` in a box, `23.999999999999996 in` in a summary | shared `NumericField` | Fixed — `displayNumber` rounds display to 1e-4; keystrokes untouched |
| Med | Tri-Zip: 13 number inputs with no `step`, no `aria-invalid`, no `aria-describedby`; only 5 of 16 error keys reached a field | 10 section files | Fixed for every numeric field |
| Med | Mag Pouch: 14 error messages rendered but none were associated with their control | 7 section files | Fixed — 15 inputs now carry `aria-invalid` and `aria-describedby`, error and help paragraphs carry ids |
| Med | Tri-Zip body dimensions gave no unit: the unit select sits in another block, so "Height" could mean mm or inches | `StyleAndDimensionsSection.tsx` | Fixed — the chosen unit is in the label |
| Med | Cleared Tri-Zip fields snapped back to a hard-coded default on every keystroke, so the box could not be retyped | geometry, zipper, handle sections | Fixed |
| Med | The LBV settings column ran the full 3780 px page: 37 inputs, no grouping, everything equally prominent | LBV, Clamshell, Plate Carrier panels | Fixed — `CollapsibleSection`, first group open, collapsed groups summarise their value |
| Med | "Vault-open number — measure and confirm." repeated under twelve LBV fields | shared `NumericField` | Fixed — compact `measure` chip with the sentence as tooltip and screen-reader description, one `VaultOpenNote` per open group |
| Med | Unit toggle sat at the bottom of the long panels, below every number it governs | LBV, Clamshell, Plate Carrier | Fixed — moved to the top with the group note |
| Med | Search results were not announced to screen readers | `LandingPage.tsx` | Fixed — `role="status"` count |
| Low | Header at 420 px squeezed the subtitle to a single letter | `App.tsx` | Fixed — subtitle hidden below `md`, "All generators" below `sm`; the logo stays the way home |
| Low | Landing category title and blurb collided on narrow screens | `LandingPage.tsx` | Fixed — stacked below `sm` |
| Low | The autosave note sat at the very bottom, below fifteen cards | `LandingPage.tsx` | Fixed — moved under the hero, and it now says nothing is uploaded |
| **Open** | **Dark mode is dead code.** `tailwind.config.js` sets `darkMode: ['class']` and `index.css` defines a full `.dark` palette, but nothing ever adds the class, so every `dark:` utility in the app never applies | app-wide | **Not fixed, deliberately** — see below |
| Open | At 420 px the project title truncates to "M…" over a "Mod…" subtitle | `shared/PatternPageShell.tsx` (another fork) | Reported |
| Open | Tri-Zip seam and hem allowances are always millimetres while the body dimensions follow the unit toggle | generator behaviour, labelled honestly as "(mm)" | Reported |

### Dark mode: why it is still off

Wiring the `dark` class to `prefers-color-scheme` is four lines and makes the
existing palette work — I tried it. It also makes the pattern preview
unreadable: the SVG strokes are hard-coded (`#000000` for cut lines) and render
black on a near-black surface, so the main content of every generator page
disappears. Screenshot: `scratchpad/shell-org-dark.png`. Enabling dark mode is a
regression until the preview surface stays light (correct anyway for a cut
sheet) or the strokes become theme-aware. Both live in files this fork does not
own (`shared/export/PatternPreview.tsx`, `lib/pattern-engine/exports/svg.ts`).

## Per-panel verdict

| Panel | Verdict |
|---|---|
| Tool Roll | Not migrated to the shared fields, deliberately. Its rows are label-left / control-right with hover tips inside an accordion, a different shape from the stacked layout everywhere else, and its validation surfaces in its own warnings panel keyed by tool, so the shared field's error and help slots would sit empty. Swapping would restyle 22 rows for no user-visible gain. Its real defect (blur-only commit) is fixed. |
| Tri-Zip | Numeric fields migrated; Radix selects kept. The selects are already labelled and match the Tool Roll's; replacing them would change the look of ten sections without fixing anything the probe found. |
| Mag Pouch | Error association added to all 15 numeric inputs; markup otherwise kept for the same reason. Its accordion grouping is the model the long panels now follow. |
| Book Cover | Already on the shared field via a local alias. The eight error keys it reads are exactly the eight its generator emits; the probe's "eleven fields ignore errors" was an artifact of feeding errors for keys that cannot occur. No change. |
| Roll-Top, Zip Pouch, Circle Skirt, Padded Strap, Micro Rig, Sling, Organizer, Fanny Pack | Clean: full `aria-invalid` and `aria-describedby` coverage, groups, sane lengths. No change. |
| Clamshell, Plate Carrier, LBV | Grouped and collapsed; unit toggle hoisted; open numbers marked with the chip instead of the repeated sentence. |

## Accessibility, before and after

| Panel | aria-invalid before → after | described-by before → after |
|---|---|---|
| Tri-Zip | 0 / 16 → every numeric field | 0 → every numeric field |
| Mag Pouch | 0 / 17 → 15 numeric inputs | 0 → 15 |
| Tool Roll | n/a (no inline errors) | n/a |
| Others | already complete | already complete |

No duplicate ids and no positive `tabindex` anywhere, so tab order follows the
visual order. Collapsible groups are buttons with `aria-expanded` and a
controlled region, not `<details>`, so state is announced and tests can find
collapsed groups by role.

## Responsive

At 420 px the landing page is a single column with no horizontal scroll, and the
generator pages stack. The LBV settings column went from 3780 px to roughly 900
with five groups closed. Screenshots: `scratchpad/shell-landing-420.png`,
`shell-lbv-420.png` (before), `shell-lbv-420b.png` (after).

## Search

Verified with a test over the words a user would actually type: molle,
backpack, belt, rifle, notebook, armor. All six land on the right generator.

## Tests added

`src/components/shared/__tests__/settingsPanels.behaviour.test.tsx` (12) covers
grouping and collapse, the compact marker, Tri-Zip units and error wiring,
cleared-box semantics, the Tool Roll commit and unit round-trip, mag pouch error
association and display rounding. `src/app/App.test.tsx` gains 6 hash-routing
and search cases. Existing suites unchanged and green: `src/components` and
`src/app`, 37 files, 325 tests.
