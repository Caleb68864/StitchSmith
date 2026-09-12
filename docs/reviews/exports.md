# Review — printed and exported output (2026-09-12)

Reviewed by the coordinator, because no fork owned `src/lib/pattern-engine/exports`
or the repository's own front matter. The question asked of every artefact was
the only one that matters here: could someone cut fabric from this?

## Findings

| # | Severity | Finding | Where | Fixed |
| --- | --- | --- | --- | --- |
| 1 | Broken | **Tiled print sheets were blank.** Each page computed its tile viewport and then emitted `<svg …><!-- tile n of m --></svg>`. The pattern was rendered into a variable and never used, so "Tiled printable HTML" downloaded a document of empty pages. No test asserted that any geometry reached the page. | `exports/tiledHtml.ts` | Yes |
| 2 | Broken | **The PDF truncated every piece larger than one page.** One page per piece, no tiling and no scaling, so a 305 mm organizer body on A4 was cut off mid-piece with nothing to say so. | `exports/pdf.ts` | Yes |
| 3 | Broken | **The PDF carried no text at all**: no piece names, no cut counts, no fold or stitch labels, no notes. A printed pattern of anonymous outlines. | `exports/pdf.ts` | Yes |
| 4 | Broken | **SVG labels overflowed their pieces and collided.** A long fold label ran across neighbouring pieces and off the sheet; on a dense cut sheet the piece names overlapped into unreadable mush (the LBV's 25 pieces). | `exports/svg.ts` | Yes |
| 5 | Confusing | Copies of a multi-quantity piece were drawn unlabelled, so a cut sheet showed anonymous rectangles beside the named original. | `exports/svg.ts` | Yes |
| 6 | Confusing | The PDF's 50 mm scale-check square was drawn over the pattern area, covering geometry it was meant to sit beside. | `exports/pdf.ts` | Yes |
| 7 | Broken | The Tri-Zip discarded its modules' warnings in `collect()`, so the strap engine's findings never reached the user and the page had nothing to show. | `generators/tri-zip-backpack/buildPattern.ts`, `components/tri-zip-backpack/TriZipPage.tsx` | Yes |
| 8 | Wrong | The README described the app as a tool roll generator with a mag pouch bolted on, listed a source tree that no longer exists, and said AK magazines were unsupported when a preset and its hemmed-face variant shipped. | `README.md` | Yes |
| 9 | Cosmetic | The page description and PWA manifest listed five of the fifteen generators. | `index.html`, `vite.config.ts` | Yes |

## What changed

**Label layout** now lives in `exports/labels.ts` and is shared by the SVG and
PDF exporters, so both place text the same way: wrap to the piece that owns the
label, shrink the type until the piece name fits along its own rectangle, clamp
every block inside the outline, and nudge blocks down a line at a time until
they clear the text already placed. The piece name reserves the middle of the
piece before the line labels are laid out around it.

**Tiling** is shared too. `computeTiles` moved to the tiled-HTML module and the
PDF uses it, so both split a piece the same way: print area less a 10 mm
overlap, stepping across and down, never scaling. PDF pages past the first carry
a "row r of R, column c of C" label; HTML pages carry the same label plus crop
marks at the trim line, dashed overlap guides, and the 50 mm rule.

**The 50 mm scale check** moved into the bottom margin in both formats, where it
cannot cover the pattern, with the caption saying what a short rule means.

**PDF text is sanitised to WinAnsi** (`toWinAnsi`). The standard PDF fonts
cannot encode the arrows, approximately-equals and fraction glyphs the vault
notes use freely, and a single such character threw the whole export. Glyphs
that carry meaning are mapped to ASCII; the rest are dropped.

## Handed on and picked up

The state review handed back three items in files it did not own. Two are done
here: the mag pouch's lid-purchase warning compared how far the lid reaches down
the face against a rule about hook length, so it now checks the hook strip
itself and adds a companion warning when the loop field leaves no adjustment;
and the Zip Pouch's blank dimension boxes now show the preset's numbers as
placeholders, converted to the display unit, so a user can see what they are
about to change. The Book Cover and Micro Rig have the same preset-derived
blanks and want the same treatment.

## Left open

- **Dark mode stays off for now.** The palette and the Tailwind class strategy
  exist and nothing sets the class. The shell review wired it to the system
  preference and reverted, because the pattern preview rendered black on black;
  the page review has since given the preview a white canvas in either theme,
  which unblocks it. The 3D viewer wants the same treatment before the class is
  switched on, so enabling it is a deliberate next step rather than a loose end
  to tidy: the exported file's stroke colours are correct as they are, and only
  the on-screen surfaces need a theme.
- The DXF exporter still carries no text. AutoCAD text entities are a different
  shape of work, and DXF consumers are cutting machines rather than people.
- `downloadProjectJson` duplicates the shared download helper.
