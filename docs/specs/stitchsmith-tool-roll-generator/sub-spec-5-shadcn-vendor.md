---
sub_spec_id: SS-05
phase: run
depends_on: ['SS-01', 'SS-02']
dispatch: factory
---

# Sub-Spec 5 — shadcn vendor pass + base UI primitives

## Scope

Vendor in every shadcn/ui primitive used by SS-06/08. Add `src/styles/pattern-svg.css` with the SVG classes from design §29. Build `AppHeader` and `PageShell` (header buttons stubbed; wired in SS-08).

## Files (new)

- `src/components/ui/button.tsx`
- `src/components/ui/input.tsx`
- `src/components/ui/label.tsx`
- `src/components/ui/select.tsx`
- `src/components/ui/switch.tsx`
- `src/components/ui/tabs.tsx`
- `src/components/ui/accordion.tsx`
- `src/components/ui/dialog.tsx`
- `src/components/ui/tooltip.tsx`
- `src/components/ui/card.tsx`
- `src/components/ui/table.tsx`
- `src/components/ui/textarea.tsx`
- `src/components/layout/AppHeader.tsx`
- `src/components/layout/PageShell.tsx`
- `src/styles/pattern-svg.css`
- `src/lib/utils.ts`

## Files (modify)

- `src/App.tsx` (mount `<AppHeader />` + `<PageShell />` skeleton)
- `src/index.css` (`@import "./styles/pattern-svg.css";`)

## Interface Contracts

**Provides (consumed by SS-06/08):** all shadcn primitives, `cn` helper, AppHeader (props: `onImport`, `onExport`, `onReset` — stub handlers), PageShell (children-rendering layout container).

**Requires (from SS-01):** scaffolded shadcn (components.json present), Tailwind compiled.

## Implementation Steps

### Step 1. Vendor in shadcn primitives

Run each `npx shadcn@latest add` invocation (sequentially — the CLI sometimes prompts for overwrite):

```bash
npx shadcn@latest add button input label select switch tabs accordion dialog tooltip card table textarea
```

If the CLI fails mid-batch, run remaining components individually. After: confirm all 12 files exist under `src/components/ui/`.

### Step 2. Add `src/lib/utils.ts`

shadcn's `init -d` should have generated it. If not:

```ts
import { type ClassValue, clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';
export function cn(...inputs: ClassValue[]) { return twMerge(clsx(inputs)); }
```

### Step 3. Add `src/styles/pattern-svg.css`

Verbatim from design §29 — `.pattern-cut-line`, `.pattern-stitch-line`, `.pattern-fold-line`, `.pattern-hem-line`, `.pattern-seam-line`, `.pattern-label`. Edit `src/index.css` to add `@import './styles/pattern-svg.css';` at the top (above the `@tailwind` directives if Tailwind v3 supports that, otherwise below).

### Step 4. Build `AppHeader.tsx`

```tsx
import { Button } from '@/components/ui/button';
import { Upload, Download, RotateCcw } from 'lucide-react';

type Props = { onImport?: () => void; onExport?: () => void; onReset?: () => void; storageWarning?: boolean };

export function AppHeader({ onImport, onExport, onReset, storageWarning }: Props) {
  return (
    <header className="flex flex-col gap-2 border-b p-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold">StitchSmith</h1>
          <p className="text-sm text-muted-foreground">Tool Roll Generator — Measure your tools. Forge a printable roll pattern.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={onImport}><Upload className="mr-2 h-4 w-4" />Import JSON</Button>
          <Button variant="outline" size="sm" onClick={onExport}><Download className="mr-2 h-4 w-4" />Export JSON</Button>
          <Button variant="ghost" size="sm" onClick={onReset}><RotateCcw className="mr-2 h-4 w-4" />Reset</Button>
        </div>
      </div>
      {storageWarning && (
        <div className="rounded border border-amber-300 bg-amber-50 p-2 text-sm text-amber-800">
          Session won't persist — browser storage is disabled. Use Export JSON to save your work.
        </div>
      )}
    </header>
  );
}
```

### Step 5. Build `PageShell.tsx`

```tsx
import type { ReactNode } from 'react';
export function PageShell({ children }: { children: ReactNode }) {
  return <main className="min-h-screen bg-background">{children}</main>;
}
```

### Step 6. Wire skeleton in App.tsx

```tsx
import { AppHeader } from '@/components/layout/AppHeader';
import { PageShell } from '@/components/layout/PageShell';

export default function App() {
  return (
    <PageShell>
      <AppHeader />
      <section className="p-4">Tool roll page mounts here in SS-06.</section>
    </PageShell>
  );
}
```

### Step 7. Verify + commit

```bash
npm run build
npm run dev    # smoke test, visit http://localhost:5173
git add src
git commit -m "factory(SS-05): shadcn vendor pass + AppHeader + PageShell [factory-managed]"
```

## Verification Commands

| Verifier | Command |
|----------|---------|
| Build clean | `npm run build` |
| All 12 shadcn files present | `ls src/components/ui/{button,input,label,select,switch,tabs,accordion,dialog,tooltip,card,table,textarea}.tsx` |

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| All 12 shadcn components exist | [MECHANICAL] | `ls src/components/ui/button.tsx src/components/ui/input.tsx src/components/ui/label.tsx src/components/ui/select.tsx src/components/ui/switch.tsx src/components/ui/tabs.tsx src/components/ui/accordion.tsx src/components/ui/dialog.tsx src/components/ui/tooltip.tsx src/components/ui/card.tsx src/components/ui/table.tsx src/components/ui/textarea.tsx \|\| (echo "FAIL: shadcn vendor incomplete" && exit 1)` |
| cn helper exists | [STRUCTURAL] | `grep -q "export function cn" src/lib/utils.ts \|\| (echo "FAIL: cn missing in src/lib/utils.ts" && exit 1)` |
| pattern-svg.css defines required classes | [STRUCTURAL] | `grep -q "pattern-cut-line" src/styles/pattern-svg.css && grep -q "pattern-stitch-line" src/styles/pattern-svg.css && grep -q "pattern-fold-line" src/styles/pattern-svg.css && grep -q "pattern-hem-line" src/styles/pattern-svg.css \|\| (echo "FAIL: pattern-svg.css missing classes" && exit 1)` |
| AppHeader exports component | [STRUCTURAL] | `grep -q "export function AppHeader" src/components/layout/AppHeader.tsx \|\| (echo "FAIL: AppHeader not exported" && exit 1)` |
| Build clean | [MECHANICAL] | `npm run build` |
