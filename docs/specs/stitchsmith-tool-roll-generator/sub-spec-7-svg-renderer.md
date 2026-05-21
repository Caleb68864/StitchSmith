---
sub_spec_id: SS-07
phase: run
depends_on: ['SS-03', 'SS-05']
dispatch: factory
---

# Sub-Spec 7 — SVG renderer (FullPatternSvg + layer components)

## Scope

Render the `ToolRollLayout` as SVG with correct layer ordering (design §28). Use mm dimensions and matching viewBox. Respect every `show*` toggle from settings. Render labels (§30) and dimension lines (§31).

## Files (new)

- `src/components/svg/FullPatternSvg.tsx`
- `src/components/svg/SvgGrid.tsx`
- `src/components/svg/SvgTileGrid.tsx`
- `src/components/svg/SvgLabels.tsx`
- `src/components/svg/SvgDimensionLines.tsx`
- `src/components/svg/FullPatternSvg.test.tsx`

## Files (modify)

None.

## Interface Contracts

**Provides (consumed by SS-08/09):**
- `<FullPatternSvg layout: ToolRollLayout settings: ToolRollSettings />` — emits a complete SVG element.
- Sub-components are also exported in case TileSvg (SS-09) wants to reuse the inner `<g>` content.

**Requires (from SS-03/05):** `ToolRollLayout` type, `pattern-svg.css` classes loaded at app root.

## Implementation Steps

### Step 1. Test the SVG output shape

`FullPatternSvg.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FullPatternSvg } from './FullPatternSvg';
import { calculateToolRollLayout } from '@/generators/tool-roll/calculateToolRollLayout';
import { defaultToolRollSettings, sampleTools } from '@/generators/tool-roll/defaults';

describe('FullPatternSvg', () => {
  const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');

  it('renders svg with mm dimensions and viewBox', () => {
    const { container } = render(<FullPatternSvg layout={layout} settings={defaultToolRollSettings} />);
    const svg = container.querySelector('svg')!;
    expect(svg.getAttribute('width')).toMatch(/mm$/);
    expect(svg.getAttribute('height')).toMatch(/mm$/);
    expect(svg.getAttribute('viewBox')).toMatch(/^0 0 /);
  });

  it('renders back panel and pocket panel paths', () => {
    const { container } = render(<FullPatternSvg layout={layout} settings={defaultToolRollSettings} />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2);
  });

  it('omits stitch lines when showStitchLines is false', () => {
    const settings = { ...defaultToolRollSettings, showStitchLines: false };
    const { container } = render(<FullPatternSvg layout={layout} settings={settings} />);
    expect(container.querySelectorAll('.pattern-stitch-line').length).toBe(0);
  });

  it('omits flap fold line when flapEnabled is false', () => {
    const settings = { ...defaultToolRollSettings, flapEnabled: false };
    const layoutNoFlap = calculateToolRollLayout(sampleTools, settings, 'mm');
    const { container } = render(<FullPatternSvg layout={layoutNoFlap} settings={settings} />);
    expect(container.querySelector('[data-role="flap-fold"]')).toBeNull();
  });
});
```

### Step 2. Implement FullPatternSvg

Layer order matches design §28 (top to bottom = bottom layer to top layer in render):

```tsx
import type { ToolRollLayout, ToolRollSettings } from '@/generators/tool-roll/types';
import { SvgGrid } from './SvgGrid';
import { SvgTileGrid } from './SvgTileGrid';
import { SvgLabels } from './SvgLabels';
import { SvgDimensionLines } from './SvgDimensionLines';

type Props = { layout: ToolRollLayout; settings: ToolRollSettings };

export function FullPatternSvg({ layout, settings }: Props) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={`${layout.patternWidth}mm`}
      height={`${layout.patternHeight}mm`}
      viewBox={`0 0 ${layout.patternWidth} ${layout.patternHeight}`}
    >
      {/* 1. Background grid */}
      {settings.showGrid && <SvgGrid width={layout.patternWidth} height={layout.patternHeight} />}
      {/* 2. Tile grid */}
      {settings.showTileGrid && <SvgTileGrid printLayout={layout.printLayout} />}
      {/* 3. Finished lines */}
      {settings.showFinishedLines && layout.backPanel.finishedPath && (
        <path className="pattern-stitch-line" d={layout.backPanel.finishedPath} />
      )}
      {/* 4. Seam allowance / hem lines */}
      {settings.showSeamAllowanceLines && layout.seamAllowanceLines.map(l => (
        <polyline key={l.id} className="pattern-seam-line" points={l.points.map(p => `${p.x},${p.y}`).join(' ')} />
      ))}
      {settings.showHemLines && layout.hemLines.map(l => (
        <polyline key={l.id} className="pattern-hem-line" points={l.points.map(p => `${p.x},${p.y}`).join(' ')} />
      ))}
      {/* 5. Cut lines */}
      {settings.showCutLines && <>
        <path className="pattern-cut-line" d={layout.backPanel.cutPath} />
        <path className="pattern-cut-line" d={layout.pocketPanel.cutPath} />
      </>}
      {/* 6. Stitch lines */}
      {settings.showStitchLines && layout.stitchLines.map(l => (
        <polyline key={l.id} className="pattern-stitch-line" points={l.points.map(p => `${p.x},${p.y}`).join(' ')} />
      ))}
      {/* 7. Fold lines */}
      {layout.foldLines.map(l => (
        <polyline key={l.id} data-role={l.id} className="pattern-fold-line" points={l.points.map(p => `${p.x},${p.y}`).join(' ')} />
      ))}
      {/* 8. Tie marks */}
      {layout.tieMarks.map(t => (
        <rect key={t.id} className="pattern-stitch-line" x={t.position.x} y={t.position.y} width={t.width} height={t.height} fill="none" />
      ))}
      {/* 9. Notches */}
      {layout.notches.map(n => (
        <circle key={n.id} className="pattern-cut-line" cx={n.position.x} cy={n.position.y} r={n.size / 2} fill="none" />
      ))}
      {/* 10. Labels */}
      <SvgLabels labels={layout.labels} labelMode={settings.labelMode} />
      {/* 11. Dimension lines */}
      {settings.showDimensionLines && <SvgDimensionLines lines={layout.dimensionLines} />}
    </svg>
  );
}
```

### Step 3. Implement SvgGrid, SvgTileGrid, SvgLabels, SvgDimensionLines

- `SvgGrid` — light gray 10 mm grid lines covering the pattern area.
- `SvgTileGrid` — dashed rectangles outlining each tile from `printLayout.pages` with page labels.
- `SvgLabels` — renders `PatternLabel[]` as `<text>` with `class="pattern-label"`, respecting `labelMode` and `rotate`.
- `SvgDimensionLines` — renders `DimensionLine[]` with tick marks at endpoints and a centered label.

### Step 4. Verify + commit

```bash
npm test -- --run
npm run build
git add src/components/svg
git commit -m "factory(SS-07): SVG renderer with layered components [factory-managed]"
```

## Verification Commands

| Verifier | Command |
|----------|---------|
| SVG render tests pass | `npm test src/components/svg -- --run` |
| Build clean | `npm run build` |

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| FullPatternSvg exists | [STRUCTURAL] | `grep -q "export function FullPatternSvg" src/components/svg/FullPatternSvg.tsx \|\| (echo "FAIL: FullPatternSvg missing" && exit 1)` |
| mm dimensions in JSX | [STRUCTURAL] | `grep -q "mm" src/components/svg/FullPatternSvg.tsx \|\| (echo "FAIL: mm dimensions missing in SVG output" && exit 1)` |
| All 4 sub-components exist | [STRUCTURAL] | `test -f src/components/svg/SvgGrid.tsx && test -f src/components/svg/SvgTileGrid.tsx && test -f src/components/svg/SvgLabels.tsx && test -f src/components/svg/SvgDimensionLines.tsx \|\| (echo "FAIL: missing svg sub-components" && exit 1)` |
| Tests pass | [MECHANICAL] | `npm test -- --run` |
