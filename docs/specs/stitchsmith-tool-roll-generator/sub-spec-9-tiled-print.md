---
sub_spec_id: SS-09
phase: run
depends_on: ['SS-07', 'SS-08']
dispatch: factory
---

# Sub-Spec 9 — Tiled printable HTML export

## Scope

Generate `tool-roll-pattern-printable.html` with one `.page` div per tile, page-sized SVG cropped via translate transforms (no scaling), scale-check square per page, registration crosshairs, page label + neighbor hints, and prominent on-screen "Print at 100%" warning hidden in `@media print`.

## Files (new)

- `src/components/svg/TileSvg.tsx`
- `src/components/svg/TileOverlay.tsx`
- `src/export/exportPrintableHtml.ts`
- `src/export/exportPrintableHtml.test.ts`

## Files (modify)

- `src/components/tool-roll/ExportPanel.tsx` — add "Export Tiled Printable HTML" button.

## Interface Contracts

**Provides (consumed by SS-10):** `exportPrintableHtml(layout, project): void` triggers download of `tool-roll-pattern-printable.html`.

**Requires (from SS-07/08):** `<FullPatternSvg>` inner content for cropping, `PrintLayout` + `PrintTile` types, `downloadTextFile`.

## Implementation Steps

### Step 1. TileSvg + TileOverlay

`TileSvg.tsx`:

```tsx
import { renderToStaticMarkup } from 'react-dom/server';
import type { ToolRollLayout, ToolRollSettings, PrintTile, UnitSystem } from '@/generators/tool-roll/types';
import { FullPatternSvg } from './FullPatternSvg';
import { TileOverlay } from './TileOverlay';

type Props = { layout: ToolRollLayout; settings: ToolRollSettings; tile: PrintTile; units: UnitSystem };

export function TileSvg({ layout, settings, tile, units }: Props) {
  const { printMargin } = settings;
  const paperW = tile.width;   // already paper width in mm
  const paperH = tile.height;
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={`${paperW}mm`} height={`${paperH}mm`} viewBox={`0 0 ${paperW} ${paperH}`}>
      <g transform={`translate(${printMargin}, ${printMargin})`}>
        <g transform={`translate(${-tile.x}, ${-tile.y})`}>
          <FullPatternSvg layout={layout} settings={settings} />
        </g>
        <TileOverlay tile={tile} printLayout={layout.printLayout} units={units} />
      </g>
    </svg>
  );
}
```

Note: nested SVG inside the translated group is OK; alternatively, refactor `FullPatternSvg` to export a `<FullPatternSvgContent />` that emits the inner `<g>` only — preferred. Use whichever lands cleanly; both work at print time as long as the outer `<svg>` carries the mm dimensions and viewBox.

`TileOverlay.tsx` — renders, INSIDE the printable area (already translated by `printMargin`):

- Scale-check square: 50 mm when `units === 'mm'`, 25.4 mm when `units === 'in'`. Place at top-left of printable area with a `<text>` label "Scale check: 50 mm" or "Scale check: 1 in".
- Registration crosshairs: 10 mm vertical + 10 mm horizontal lines near each of the 4 printable-area corners.
- Page label: `<text>` at top right: `Tool Roll — Page {pageNumber} of {printLayout.pages.length} — Row {row} Col {column}`.
- Overlap line: `<text>` below page label: `Print at 100%, do not scale. Overlap: {tileOverlap} mm`.
- Neighbor hints: if `column < printLayout.columns - 1`: text on right edge: "Tape to Page N on right". If `row < printLayout.rows - 1`: text on bottom edge: "Tape to Page M below". Compute target page numbers from `(row * columns + col + 1)` arithmetic.

### Step 2. exportPrintableHtml tests + impl

```ts
import { describe, it, expect } from 'vitest';
import { buildPrintableHtml } from './exportPrintableHtml';
import { calculateToolRollLayout } from '@/generators/tool-roll/calculateToolRollLayout';
import { defaultToolRollSettings, sampleTools } from '@/generators/tool-roll/defaults';

const project = { schemaVersion: 1 as const, projectName: 'p', generatorId: 'tool-roll' as const, units: 'mm' as const, settings: defaultToolRollSettings, tools: sampleTools, createdAt: '', updatedAt: '' };
const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');

describe('buildPrintableHtml', () => {
  it('contains one .page div per tile', () => {
    const html = buildPrintableHtml(layout, project);
    const pageDivs = html.match(/<div class="page">/g) || [];
    expect(pageDivs.length).toBe(layout.printLayout.pages.length);
  });
  it('contains @page CSS rule', () => {
    const html = buildPrintableHtml(layout, project);
    expect(html).toMatch(/@page\s*\{\s*size:/);
  });
  it('print warning visible on screen, hidden in print', () => {
    const html = buildPrintableHtml(layout, project);
    expect(html).toContain('print-warning');
    expect(html).toMatch(/@media print[^}]*\{[^}]*\.print-warning[^}]*display:\s*none/);
    // No global rule hiding .print-warning outside @media print:
    const rules = html.match(/\.print-warning\s*\{[^}]*display:\s*none[^}]*\}/g) || [];
    // The only display:none for print-warning must be inside @media print
    expect(rules.length).toBe(0); // outside-of-media count must be 0
  });
  it('contains construction notes after last page', () => {
    const html = buildPrintableHtml(layout, project);
    expect(html).toContain('Construction notes');
  });
});
```

`exportPrintableHtml.ts`:

```ts
import { renderToStaticMarkup } from 'react-dom/server';
import { TileSvg } from '@/components/svg/TileSvg';
import { downloadTextFile } from '@/utils/download';
import type { ToolRollLayout, ToolRollProject } from '@/generators/tool-roll/types';

const PATTERN_CSS = `
.pattern-cut-line { fill: none; stroke: black; stroke-width: 0.4; }
.pattern-stitch-line { fill: none; stroke: black; stroke-width: 0.25; stroke-dasharray: 2 2; }
.pattern-fold-line { fill: none; stroke: black; stroke-width: 0.25; stroke-dasharray: 6 3; }
.pattern-hem-line { fill: none; stroke: black; stroke-width: 0.25; stroke-dasharray: 4 2 1 2; }
.pattern-seam-line { fill: none; stroke: black; stroke-width: 0.25; stroke-dasharray: 1 2; }
.pattern-label { font-family: Arial, sans-serif; font-size: 3px; fill: black; }
`;

export function buildPrintableHtml(layout: ToolRollLayout, project: ToolRollProject): string {
  const pl = layout.printLayout;
  const pageCss = `@page { size: ${pl.paperSize} ${pl.orientation}; margin: 0; }`;
  const pageDimCss = `.page { width: ${pl.paperWidth}mm; height: ${pl.paperHeight}mm; page-break-after: always; break-after: page; overflow: hidden; }`;
  const warningCss = `.print-warning { background: #fef3c7; border: 1px solid #d97706; color: #92400e; padding: 12px; font-family: Arial, sans-serif; }`;
  const printHideCss = `@media print { .print-warning { display: none; } .meta { display: none; } }`;
  const css = [pageCss, 'html,body{margin:0;padding:0}', pageDimCss, warningCss, printHideCss, PATTERN_CSS].join('\n');

  const pagesHtml = pl.pages.map(tile => {
    const svgString = renderToStaticMarkup(<TileSvg layout={layout} settings={project.settings} tile={tile} units={project.units} />);
    return `<div class="page">${svgString}</div>`;
  }).join('\n');

  const notesHtml = `<section class="meta"><h2>Construction notes</h2><ol>${layout.constructionNotes.map(n => `<li>${n}</li>`).join('')}</ol></section>`;

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><title>StitchSmith — Tool Roll Pattern</title><style>${css}</style></head>
<body>
<div class="print-warning"><strong>Print at 100% — do not scale to fit.</strong> Verify the scale-check square on each page measures exactly ${project.units === 'in' ? '1 in' : '50 mm'} on the printed page before cutting fabric.</div>
${pagesHtml}
${notesHtml}
</body></html>`;
}

export function exportPrintableHtml(layout: ToolRollLayout, project: ToolRollProject): void {
  downloadTextFile('tool-roll-pattern-printable.html', buildPrintableHtml(layout, project), 'text/html');
}
```

### Step 3. Add button to ExportPanel

```tsx
<Button disabled={hasErrors} onClick={() => exportPrintableHtml(layout, project)}>Export Tiled Printable HTML</Button>
```

### Step 4. Verify + commit

```bash
npm test -- --run
npm run build
git add src/components/svg/TileSvg.tsx src/components/svg/TileOverlay.tsx src/export/exportPrintableHtml.ts src/export/exportPrintableHtml.test.ts src/components/tool-roll/ExportPanel.tsx
git commit -m "factory(SS-09): tiled printable HTML export [factory-managed]"
```

## Verification Commands

| Verifier | Command |
|----------|---------|
| Tile export tests pass | `npm test src/export/exportPrintableHtml -- --run` |
| Build clean | `npm run build` |

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| exportPrintableHtml exported | [STRUCTURAL] | `grep -q "export function exportPrintableHtml" src/export/exportPrintableHtml.ts \|\| (echo "FAIL: exportPrintableHtml missing" && exit 1)` |
| TileSvg + TileOverlay exist | [STRUCTURAL] | `test -f src/components/svg/TileSvg.tsx && test -f src/components/svg/TileOverlay.tsx \|\| (echo "FAIL: tile components missing" && exit 1)` |
| @page CSS rule present | [STRUCTURAL] | `grep -q "@page" src/export/exportPrintableHtml.ts \|\| (echo "FAIL: @page CSS missing" && exit 1)` |
| print-warning class defined | [STRUCTURAL] | `grep -q "print-warning" src/export/exportPrintableHtml.ts \|\| (echo "FAIL: print-warning class missing" && exit 1)` |
| Tests pass | [MECHANICAL] | `npm test -- --run` |
