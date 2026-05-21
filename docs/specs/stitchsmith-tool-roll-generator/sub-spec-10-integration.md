---
sub_spec_id: SS-10
phase: run
depends_on: ['SS-08', 'SS-09']
dispatch: factory
---

# Sub-Spec 10 — Generator registry + responsive polish + integration

## Scope

Define the `PatternGenerator` interface and register `toolRollGenerator`. Wire `App.tsx` end-to-end. Apply responsive Tailwind classes. Add an integration test that mounts `<App />` and exercises the primary flow. Verify Phase 1–6 acceptance criteria pass. Capture evidence in `INTEGRATION-evidence.md`. Document deployment in README.

## Files (new)

- `src/app/App.tsx` (moved from `src/App.tsx`, or keep `src/App.tsx` and treat this path as alias — pick one consistently with SS-01/05)
- `src/app/providers.tsx`
- `src/app/App.test.tsx`
- `src/generators/index.ts`
- `INTEGRATION-evidence.md`

## Files (modify)

- `src/main.tsx` (mount `<App />` from the chosen path)
- `src/components/tool-roll/ToolRollPage.tsx` (confirm responsive grid: `md:grid-cols-2`, stacked below)
- `README.md` (deployment + tested browsers + print-at-100% reminder)

## Interface Contracts

**Provides:**
- `PatternGenerator<TSettings, TInput, TLayout>` interface — foundation for future modules.
- `toolRollGenerator: PatternGenerator<ToolRollSettings, ToolItem[], ToolRollLayout>` — registered instance.

**Requires (from all earlier sub-specs):** entire stack.

## Implementation Steps

### Step 1. Generator registry

`src/generators/index.ts`:

```ts
import type { ReactNode } from 'react';
import type { UnitSystem } from '@/utils/units';

export type PatternGenerator<TSettings, TInput, TLayout> = {
  id: string;
  name: string;
  description: string;
  defaultSettings: TSettings;
  calculate: (input: TInput, settings: TSettings, units: UnitSystem) => TLayout;
  renderSvg: (layout: TLayout) => ReactNode;
};

import { calculateToolRollLayout } from './tool-roll/calculateToolRollLayout';
import { defaultToolRollSettings } from './tool-roll/defaults';
import { FullPatternSvg } from '@/components/svg/FullPatternSvg';
import type { ToolItem, ToolRollLayout, ToolRollSettings } from './tool-roll/types';

export const toolRollGenerator: PatternGenerator<ToolRollSettings, ToolItem[], ToolRollLayout> = {
  id: 'tool-roll',
  name: 'Tool Roll Generator',
  description: 'Generate a custom tool roll pattern from measured tools.',
  defaultSettings: defaultToolRollSettings,
  calculate: calculateToolRollLayout,
  renderSvg: (layout) => <FullPatternSvg layout={layout} settings={defaultToolRollSettings} />,
};
```

### Step 2. App composition

`src/app/App.tsx` (the canonical App):

```tsx
import { AppHeader } from '@/components/layout/AppHeader';
import { PageShell } from '@/components/layout/PageShell';
import { ToolRollPage } from '@/components/tool-roll/ToolRollPage';
import { useToolRollProject } from '@/state/useToolRollProject';
import { useRef } from 'react';
import { parseProjectJson } from '@/export/importProjectJson';
import { exportProjectJson } from '@/export/exportProjectJson';

export default function App() {
  const state = useToolRollProject();
  const fileInput = useRef<HTMLInputElement>(null);

  const handleImport = () => fileInput.current?.click();
  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (!f) return;
    try {
      const text = await f.text();
      const project = parseProjectJson(text);
      state.importProject(project);
    } catch (err) {
      // shadcn Dialog or simple alert — wired in SS-08; ensure it surfaces here
      alert(`Import failed: ${(err as Error).message}`);
    } finally {
      e.target.value = '';
    }
  };

  return (
    <PageShell>
      <AppHeader
        onImport={handleImport}
        onExport={() => exportProjectJson(state.project)}
        onReset={() => state.resetProject()}
        storageWarning={state.storageWarning}
      />
      <input ref={fileInput} type="file" accept="application/json" className="hidden" onChange={onFileChange} />
      <ToolRollPage />
    </PageShell>
  );
}
```

Update `src/main.tsx` to import from `./app/App`.

### Step 3. Responsive layout pass

In `ToolRollPage.tsx`, confirm grid is `grid grid-cols-1 gap-6 p-4 md:grid-cols-2`. Audit each panel for mobile-friendliness: tables become horizontally scrollable (`overflow-x-auto`), settings accordion stays full-width, preview gets a fixed aspect ratio container.

### Step 4. Integration test

`src/app/App.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import App from './App';

describe('App integration', () => {
  it('mounts and shows starter project', () => {
    localStorage.clear();
    render(<App />);
    expect(screen.getByText(/StitchSmith/)).toBeInTheDocument();
    expect(screen.getByText(/8mm wrench/)).toBeInTheDocument();
  });

  it('Add tool increments summary count', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /add tool/i }));
    // summary should show 5 tools (4 starter + 1)
    expect(screen.getByText(/Tools:\s*5/i)).toBeInTheDocument();
  });

  it('Reset restores starter project', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.getByText(/8mm wrench/)).toBeInTheDocument();
  });
});
```

### Step 5. INTEGRATION-evidence.md

Run the app (`npm run dev`) and walk through every Phase 1–6 acceptance criterion from design §39. Record results:

```markdown
# Integration Evidence — StitchSmith Tool Roll Generator v1

Date: <today>
Browsers tested: Chrome <version>, Firefox <version>

## Phase 1 — Core calculator and UI
- Add/edit/duplicate/delete tools: PASS — verified manually
- Unit toggle (mm/in): PASS
- Pocket gap / seam allowance / hems / visible amount inputs: PASS
- Sort modes (all 7): PASS
- Calculated pocket W/D update live: PASS
- Pattern summary updates live: PASS
- LocalStorage persists across refresh: PASS

## Phase 2 — SVG preview
[...]

## Phase 3 — Seam allowance and hem detail
[...]

## Phase 4 — Export full SVG and project JSON
- SVG opens in Inkscape with correct mm dimensions: PASS — measured back panel = 600 mm wide
- JSON export/import round-trip: PASS
[...]

## Phase 5 — Tiled printable export
- Letter portrait, sample tools: 6 pages
- Print preview at 100% in Chrome: scale-check square measures 50.0 mm on printed page: PASS
[...]

## Phase 6 — Polish
[...]

## Notes
- Browsers in scope: Chrome, Firefox (desktop). Mobile Safari noted as untested for print precision.
- Pattern-svg.css embedded in exported SVG: confirmed via Inkscape XML editor.
```

### Step 6. README

Add sections:

- **Quick start:** `npm install && npm run dev`.
- **Build for production:** `npm run build`; deploy `dist/` to Cloudflare Pages or GitHub Pages.
- **Deployment (Cloudflare Pages):** project settings → build command `npm run build`, output directory `dist`.
- **Deployment (GitHub Pages):** include `vite.config.ts` `base` if hosting under a subpath; provide GitHub Actions workflow snippet.
- **Tested browsers:** Chrome 120+, Firefox 120+ (desktop). Mobile is functional but print precision not verified.
- **Print reminder:** "When printing the tiled HTML, set browser scaling to 100% / Actual Size. Verify the per-page scale-check square measures the indicated size before cutting fabric."

### Step 7. Final verify + commit

```bash
npm test -- --run
npm run build
git add src/app src/generators/index.ts src/main.tsx src/components/tool-roll/ToolRollPage.tsx README.md INTEGRATION-evidence.md
git commit -m "factory(SS-10): generator registry + responsive polish + integration evidence [factory-managed]"
```

## Verification Commands

| Verifier | Command |
|----------|---------|
| All tests pass | `npm test -- --run` |
| Build clean | `npm run build` |
| Dist deployable | `test -f dist/index.html && test -d dist/assets` |
| App integration tests pass | `npm test src/app -- --run` |

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| PatternGenerator interface + toolRollGenerator | [STRUCTURAL] | `grep -q "export type PatternGenerator" src/generators/index.ts && grep -q "toolRollGenerator" src/generators/index.ts \|\| (echo "FAIL: PatternGenerator registry missing" && exit 1)` |
| App.tsx mounts AppHeader and ToolRollPage | [STRUCTURAL] | `grep -q "AppHeader" src/app/App.tsx && grep -q "ToolRollPage" src/app/App.tsx \|\| (echo "FAIL: App composition incomplete" && exit 1)` |
| Responsive grid in ToolRollPage | [STRUCTURAL] | `grep -q "md:grid-cols-2" src/components/tool-roll/ToolRollPage.tsx \|\| (echo "FAIL: responsive grid class missing" && exit 1)` |
| INTEGRATION-evidence.md exists | [STRUCTURAL] | `test -f INTEGRATION-evidence.md \|\| (echo "FAIL: INTEGRATION-evidence.md missing" && exit 1)` |
| Production build deploys | [MECHANICAL] | `npm run build && test -f dist/index.html` |
| Full test suite passes | [MECHANICAL] | `npm test -- --run` |
