---
sub_spec_id: SS-06
phase: run
depends_on: ['SS-03', 'SS-04', 'SS-05']
dispatch: factory
---

# Sub-Spec 6 — Tool table + settings panel + summary + warnings + construction notes

## Scope

Build the controls column and side panels. Tool table with inline validation, settings accordion (all sections from §23), live pattern summary, warnings panel, construction notes. Wired to `useToolRollProject`. No SVG preview yet (SS-08).

## Files (new)

- `src/components/tool-roll/ToolRollPage.tsx`
- `src/components/tool-roll/ToolTable.tsx`
- `src/components/tool-roll/ToolEditorRow.tsx`
- `src/components/tool-roll/ToolRollSettingsPanel.tsx`
- `src/components/tool-roll/PatternSummary.tsx`
- `src/components/tool-roll/WarningsPanel.tsx`
- `src/components/tool-roll/ConstructionNotes.tsx`
- `src/components/tool-roll/ToolTable.test.tsx`

## Files (modify)

- `src/App.tsx` (mount `<ToolRollPage />` inside `<PageShell />`)

## Interface Contracts

**Requires (from SS-03/04/05):** `calculateToolRollLayout`, `validateTool`, `validateSettings`, all types, `useToolRollProject`, all shadcn UI primitives, `cn`.

**Provides:** `<ToolRollPage />` mounting point for the entire controls column.

## Implementation Steps

### Step 1. ToolRollPage shell

Two-column desktop grid using Tailwind: left column = controls (table + settings), right column will be preview in SS-08 (use a placeholder). Stack on mobile (`md:grid-cols-2`).

```tsx
import { useMemo } from 'react';
import { useToolRollProject } from '@/state/useToolRollProject';
import { calculateToolRollLayout } from '@/generators/tool-roll/calculateToolRollLayout';
import { ToolTable } from './ToolTable';
import { ToolRollSettingsPanel } from './ToolRollSettingsPanel';
import { PatternSummary } from './PatternSummary';
import { WarningsPanel } from './WarningsPanel';
import { ConstructionNotes } from './ConstructionNotes';

export function ToolRollPage() {
  const state = useToolRollProject();
  const layout = useMemo(
    () => calculateToolRollLayout(state.project.tools, state.project.settings, state.project.units),
    [state.project.tools, state.project.settings, state.project.units]
  );
  return (
    <section className="grid gap-6 p-4 md:grid-cols-2">
      <div className="space-y-4">
        <ToolTable state={state} />
        <ToolRollSettingsPanel state={state} />
      </div>
      <div className="space-y-4">
        <PatternSummary layout={layout} units={state.project.units} />
        <WarningsPanel warnings={layout.warnings} />
        <ConstructionNotes notes={layout.constructionNotes} />
        {/* PatternPreview will mount here in SS-08 */}
      </div>
    </section>
  );
}
```

### Step 2. ToolTable + ToolEditorRow

Use shadcn `Table`. Columns: Order, Name, Width, Thickness, Height, Visible, Pocket W, Pocket D, Actions. Each row is a `ToolEditorRow` that calls `state.updateTool(id, patch)` on field blur. Validation per row uses `validateTool(tool)` and shows red border + warning text for `error`-severity warnings.

Actions: Add (top), Duplicate (row), Delete (row), Up/Down (row).

### Step 3. ToolRollSettingsPanel

shadcn `Accordion` with sections from design §23.1–§23.7. Each numeric setting is an `Input type="number"` with `step` matching the unit system (0.1 mm or 0.01 in). Toggles use `Switch`. Enums use `Select`. Reads `state.project.settings` and `state.project.units`; calls `state.updateSettings(patch)` on blur/change.

### Step 4. PatternSummary

Render from the `ToolRollLayout`: pattern W×H (mm/in via `formatDimension`), fabric cut size (= pattern dimensions), tool count, pocket count, tallest tool, widest tool, deepest pocket, total pocket width, print page count, paper size, orientation.

### Step 5. WarningsPanel

Group `layout.warnings` by `severity` (`error` red, `warning` amber, `info` blue). Show count chip + collapsible list.

### Step 6. ConstructionNotes

Render `layout.constructionNotes` as an ordered list inside a shadcn `Card`.

### Step 7. Component tests

`ToolTable.test.tsx`:

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolTable } from './ToolTable';
import { useToolRollProject } from '@/state/useToolRollProject';

function Harness() {
  const state = useToolRollProject();
  return <ToolTable state={state} />;
}

describe('ToolTable', () => {
  it('renders sample tools', () => {
    render(<Harness />);
    expect(screen.getByText(/8mm wrench/)).toBeInTheDocument();
  });
  it('Add tool increments row count', () => {
    render(<Harness />);
    const before = screen.getAllByRole('row').length;
    fireEvent.click(screen.getByRole('button', { name: /add/i }));
    expect(screen.getAllByRole('row').length).toBe(before + 1);
  });
});
```

### Step 8. Verify + commit

```bash
npm test -- --run
npm run build
git add src/components/tool-roll src/App.tsx
git commit -m "factory(SS-06): tool table + settings panel + summary + warnings + notes [factory-managed]"
```

## Verification Commands

| Verifier | Command |
|----------|---------|
| Tests pass | `npm test -- --run` |
| Build clean | `npm run build` |

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| ToolRollPage exported | [STRUCTURAL] | `grep -q "export function ToolRollPage" src/components/tool-roll/ToolRollPage.tsx \|\| (echo "FAIL: ToolRollPage missing" && exit 1)` |
| ToolTable columns | [STRUCTURAL] | `grep -q "Width" src/components/tool-roll/ToolTable.tsx && grep -q "Thickness" src/components/tool-roll/ToolTable.tsx && grep -q "Visible" src/components/tool-roll/ToolTable.tsx \|\| (echo "FAIL: ToolTable columns incomplete" && exit 1)` |
| Settings accordion has all sections | [STRUCTURAL] | `grep -q "Pocket" src/components/tool-roll/ToolRollSettingsPanel.tsx && grep -q "Flap" src/components/tool-roll/ToolRollSettingsPanel.tsx && grep -q "Print" src/components/tool-roll/ToolRollSettingsPanel.tsx \|\| (echo "FAIL: settings panel missing sections" && exit 1)` |
| WarningsPanel + ConstructionNotes exist | [STRUCTURAL] | `test -f src/components/tool-roll/WarningsPanel.tsx && test -f src/components/tool-roll/ConstructionNotes.tsx \|\| (echo "FAIL: panels missing" && exit 1)` |
| Tests pass | [MECHANICAL] | `npm test -- --run` |
