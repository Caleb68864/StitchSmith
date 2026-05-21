---
sub_spec_id: SS-08
phase: run
depends_on: ['SS-04', 'SS-06', 'SS-07']
dispatch: factory
---

# Sub-Spec 8 — Pattern preview + Full SVG export + Project JSON I/O

## Scope

Interactive `PatternPreview` (pan/zoom, fit-to-screen, tile grid toggle). `exportFullSvg` via `renderToStaticMarkup`. `exportProjectJson` / `parseProjectJson` with schema validation and DoS cap (`tools.length > 500` rejected). Wire AppHeader buttons.

## Files (new)

- `src/components/tool-roll/PatternPreview.tsx`
- `src/components/tool-roll/ExportPanel.tsx`
- `src/export/exportSvg.ts`
- `src/export/exportSvg.test.ts`
- `src/export/exportProjectJson.ts`
- `src/export/importProjectJson.ts`
- `src/export/importProjectJson.test.ts`

## Files (modify)

- `src/components/layout/AppHeader.tsx` — wire Import/Export/Reset handlers to project state + exports.
- `src/components/tool-roll/ToolRollPage.tsx` — mount `<PatternPreview />` and `<ExportPanel />` in the right column.

## Interface Contracts

**Provides (consumed by SS-09/10):**
- `exportFullSvg(layout, project): void` — triggers download of `tool-roll-pattern-full.svg`.
- `exportProjectJson(project): void` — triggers download of `tool-roll-project.json`.
- `parseProjectJson(json: string): ToolRollProject` — throws on validation failure.

**Requires (from SS-04/06/07):** `useToolRollProject`, `<FullPatternSvg>`, all types, shadcn `Button`, `Dialog` (for import errors), `downloadTextFile`.

## Implementation Steps

### Step 1. exportSvg tests + impl

```ts
import { describe, it, expect, vi } from 'vitest';
import { exportFullSvg, serializeFullSvg } from './exportSvg';
import { calculateToolRollLayout } from '@/generators/tool-roll/calculateToolRollLayout';
import { defaultToolRollSettings, sampleTools } from '@/generators/tool-roll/defaults';

const project = { schemaVersion: 1 as const, projectName: 'p', generatorId: 'tool-roll' as const, units: 'mm' as const, settings: defaultToolRollSettings, tools: sampleTools, createdAt: '', updatedAt: '' };
const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');

describe('serializeFullSvg', () => {
  it('starts with <svg and contains xmlns + mm dimensions', () => {
    const out = serializeFullSvg(layout, project);
    expect(out.startsWith('<svg')).toBe(true);
    expect(out).toContain('xmlns="http://www.w3.org/2000/svg"');
    expect(out).toMatch(/width="[\d.]+mm"/);
    expect(out).toMatch(/height="[\d.]+mm"/);
  });
  it('embeds the pattern CSS', () => {
    const out = serializeFullSvg(layout, project);
    expect(out).toContain('pattern-cut-line');
  });
});
```

`exportSvg.ts`:

```ts
import { renderToStaticMarkup } from 'react-dom/server';
import { FullPatternSvg } from '@/components/svg/FullPatternSvg';
import { downloadTextFile } from '@/utils/download';
import type { ToolRollLayout, ToolRollProject } from '@/generators/tool-roll/types';

const EMBEDDED_CSS = `<style>
.pattern-cut-line { fill: none; stroke: black; stroke-width: 0.4; }
.pattern-stitch-line { fill: none; stroke: black; stroke-width: 0.25; stroke-dasharray: 2 2; }
.pattern-fold-line { fill: none; stroke: black; stroke-width: 0.25; stroke-dasharray: 6 3; }
.pattern-hem-line { fill: none; stroke: black; stroke-width: 0.25; stroke-dasharray: 4 2 1 2; }
.pattern-seam-line { fill: none; stroke: black; stroke-width: 0.25; stroke-dasharray: 1 2; }
.pattern-label { font-family: Arial, sans-serif; font-size: 3px; fill: black; }
</style>`;

export function serializeFullSvg(layout: ToolRollLayout, project: ToolRollProject): string {
  const inner = renderToStaticMarkup(<FullPatternSvg layout={layout} settings={project.settings} />);
  // Inject CSS as the first child of <svg>
  return inner.replace(/^<svg([^>]*)>/, `<svg$1>${EMBEDDED_CSS}`);
}

export function exportFullSvg(layout: ToolRollLayout, project: ToolRollProject): void {
  downloadTextFile('tool-roll-pattern-full.svg', serializeFullSvg(layout, project), 'image/svg+xml');
}
```

### Step 2. JSON I/O tests + impl

`importProjectJson.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { parseProjectJson } from './importProjectJson';
import { defaultToolRollSettings, sampleTools } from '@/generators/tool-roll/defaults';

const valid = { schemaVersion: 1, projectName: 'p', generatorId: 'tool-roll', units: 'mm', settings: defaultToolRollSettings, tools: sampleTools, createdAt: '', updatedAt: '' };

describe('parseProjectJson', () => {
  it('round-trips valid project', () => { expect(parseProjectJson(JSON.stringify(valid))).toEqual(valid); });
  it('throws on invalid JSON', () => { expect(() => parseProjectJson('{not json')).toThrow(); });
  it('throws on missing schemaVersion', () => { expect(() => parseProjectJson(JSON.stringify({ ...valid, schemaVersion: undefined }))).toThrow(); });
  it('throws on wrong generatorId', () => { expect(() => parseProjectJson(JSON.stringify({ ...valid, generatorId: 'foo' }))).toThrow(); });
  it('throws on tools array > 500', () => {
    const bloated = { ...valid, tools: new Array(501).fill(valid.tools[0]) };
    expect(() => parseProjectJson(JSON.stringify(bloated))).toThrow(/500/);
  });
});
```

`importProjectJson.ts`:

```ts
import type { ToolRollProject } from '@/generators/tool-roll/types';
const MAX_TOOLS = 500;

export function parseProjectJson(json: string): ToolRollProject {
  let parsed: any;
  try { parsed = JSON.parse(json); } catch (err) { throw new Error('File is not valid JSON.'); }
  if (parsed?.schemaVersion !== 1) throw new Error('Unrecognized schemaVersion. Expected 1.');
  if (parsed?.generatorId !== 'tool-roll') throw new Error(`generatorId mismatch: expected 'tool-roll', got '${parsed?.generatorId}'.`);
  if (typeof parsed?.settings !== 'object' || parsed.settings === null) throw new Error('Missing or invalid settings object.');
  if (!Array.isArray(parsed?.tools)) throw new Error('tools must be an array.');
  if (parsed.tools.length > MAX_TOOLS) throw new Error(`Refused to load: tools array exceeds ${MAX_TOOLS} entries.`);
  return parsed as ToolRollProject;
}
```

`exportProjectJson.ts`:

```ts
import { downloadTextFile } from '@/utils/download';
import type { ToolRollProject } from '@/generators/tool-roll/types';

export function exportProjectJson(project: ToolRollProject): void {
  const payload = { ...project, updatedAt: new Date().toISOString() };
  downloadTextFile('tool-roll-project.json', JSON.stringify(payload, null, 2), 'application/json');
}
```

### Step 3. PatternPreview

shadcn `Card` containing a `<div>` with overflow-auto and a child SVG zoom-wrapper. Buttons: zoom in / zoom out / fit to screen / toggle tile grid (passes a temp settings override into `<FullPatternSvg>`). Wheel + drag pan with native handlers.

### Step 4. ExportPanel

```tsx
import { Button } from '@/components/ui/button';
import { exportFullSvg } from '@/export/exportSvg';
import { exportProjectJson } from '@/export/exportProjectJson';

export function ExportPanel({ layout, project }: { layout: ToolRollLayout; project: ToolRollProject }) {
  const hasErrors = layout.warnings.some(w => w.severity === 'error');
  return (
    <div className="flex flex-wrap gap-2">
      <Button disabled={hasErrors} onClick={() => exportFullSvg(layout, project)}>Export Full SVG</Button>
      <Button disabled={hasErrors} onClick={() => exportProjectJson(project)}>Export Project JSON</Button>
      {/* Tiled HTML button added in SS-09 */}
    </div>
  );
}
```

### Step 5. Wire AppHeader

`AppHeader` already has `onImport`/`onExport`/`onReset` props. In `App.tsx`, pass handlers from the project state:

- `onImport` → opens a hidden `<input type="file" accept="application/json">`; on change reads the file, calls `parseProjectJson`, then `state.importProject(...)`. On error, opens a shadcn `Dialog` with the error message.
- `onExport` → `exportProjectJson(state.project)`.
- `onReset` → `state.resetProject()`.

### Step 6. Verify + commit

```bash
npm test -- --run
npm run build
git add src/export src/components/tool-roll/PatternPreview.tsx src/components/tool-roll/ExportPanel.tsx src/components/layout/AppHeader.tsx src/App.tsx
git commit -m "factory(SS-08): pattern preview + Full SVG + JSON I/O [factory-managed]"
```

## Verification Commands

| Verifier | Command |
|----------|---------|
| Export tests pass | `npm test src/export -- --run` |
| Build clean | `npm run build` |

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| exportFullSvg exported | [STRUCTURAL] | `grep -q "export function exportFullSvg" src/export/exportSvg.ts \|\| (echo "FAIL: exportFullSvg missing" && exit 1)` |
| parseProjectJson exported | [STRUCTURAL] | `grep -q "export function parseProjectJson" src/export/importProjectJson.ts \|\| (echo "FAIL: parseProjectJson missing" && exit 1)` |
| DoS cap present | [STRUCTURAL] | `grep -q "500" src/export/importProjectJson.ts \|\| (echo "FAIL: 500-tool cap missing" && exit 1)` |
| ExportPanel exists | [STRUCTURAL] | `test -f src/components/tool-roll/ExportPanel.tsx \|\| (echo "FAIL: ExportPanel missing" && exit 1)` |
| Tests pass | [MECHANICAL] | `npm test -- --run` |
