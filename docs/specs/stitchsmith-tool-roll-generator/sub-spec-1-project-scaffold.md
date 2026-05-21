---
sub_spec_id: SS-01
phase: run
depends_on: []
dispatch: factory
---

# Sub-Spec 1 — Project scaffold (Vite + React + TS + Tailwind + shadcn)

## Scope

Scaffold the StitchSmith project. Vite + React + TypeScript template, Tailwind v3 + PostCSS, shadcn init, dev tooling (Vitest, @testing-library/react, jsdom), npm scripts. No app code beyond a placeholder `<App />`.

## Files (new)

- `package.json`
- `tsconfig.json`
- `tsconfig.node.json`
- `vite.config.ts`
- `tailwind.config.js`
- `postcss.config.js`
- `components.json`
- `index.html`
- `src/main.tsx`
- `src/App.tsx` (placeholder)
- `src/index.css`
- `src/vite-env.d.ts`
- `.gitignore`
- `README.md`

## Files (modify)

None.

## Interface Contracts

**Provides:** scaffolded project shell (importable React 18 runtime, Tailwind processing, Vitest harness, shadcn `components.json`).
**Requires:** Node 18+ and npm 9+ on host (verified by `forge-init` prerequisites).

## Implementation Steps (TDD-flavored)

### Step 1. Initialize Vite template

```bash
cd C:/Users/CalebBennett/Documents/GitHub/StitchSmith
npm create vite@latest . -- --template react-ts
```

When prompted "Current directory is not empty", choose "Ignore files and continue". Verify `package.json`, `index.html`, `src/main.tsx`, `tsconfig.json` exist after.

### Step 2. Install runtime + dev dependencies

```bash
npm install
npm install lucide-react class-variance-authority clsx tailwind-merge
npm install -D tailwindcss@^3 postcss autoprefixer
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom @vitest/ui
```

Pin `tailwindcss@^3` explicitly — shadcn currently targets v3.

### Step 3. Initialize Tailwind v3

```bash
npx tailwindcss init -p
```

Then edit `tailwind.config.js` to set `content: ['./index.html', './src/**/*.{ts,tsx}']` and add a `darkMode: 'class'` line for future-proofing.

Edit `src/index.css` so it begins with the three Tailwind directives:

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Step 4. Configure Vitest

In `vite.config.ts`, add the `test` block:

```ts
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: './src/test-setup.ts',
  },
});
```

Create `src/test-setup.ts` with:

```ts
import '@testing-library/jest-dom/vitest';
```

Add npm scripts to `package.json`: `"dev": "vite"`, `"build": "tsc -b && vite build"`, `"preview": "vite preview"`, `"test": "vitest"`.

### Step 5. Initialize shadcn

```bash
npx shadcn@latest init -d
```

Use `-d` (default) so the CLI doesn't prompt. Verify `components.json` is created with `tailwind.cssVariables: true` and `aliases.components: 'src/components'`. If `tsconfig.json` doesn't have a `"paths"` entry pointing `"@/*"` at `"./src/*"`, add one and add the same alias to `vite.config.ts`'s `resolve.alias`.

### Step 6. Wire up placeholder App

Replace `src/App.tsx` body with:

```tsx
export default function App() {
  return <div className="p-8 text-2xl font-semibold">StitchSmith — scaffold ready</div>;
}
```

Confirm `src/main.tsx` mounts `<App />` and imports `./index.css`.

### Step 7. Verify build + test harness

```bash
npm run build
npm test -- --run
```

Both must exit 0. `dist/index.html` must exist after build.

### Step 8. Commit

```bash
git init
git add .
git commit -m "factory(SS-01): scaffold Vite + React + TS + Tailwind + shadcn [factory-managed]"
```

## Verification Commands

| Verifier | Command |
|----------|---------|
| Build clean | `npm run build` (exit 0) |
| Test harness works | `npm test -- --run` (exit 0) |
| Dev server starts | `npm run dev` then `curl -sf http://localhost:5173 > /dev/null` (exit 0) |

## Checks

| Criterion | Type | Command |
|-----------|------|---------|
| `npm install` exits 0 | [MECHANICAL] | `test -d node_modules \|\| (echo "FAIL: node_modules missing" && exit 1)` |
| `npm run build` exits 0 | [MECHANICAL] | `npm run build` |
| `npm test -- --run` exits 0 | [MECHANICAL] | `npm test -- --run` |
| package.json includes required deps | [STRUCTURAL] | `grep -q '"react":' package.json && grep -q '"vite":' package.json && grep -q '"tailwindcss":' package.json && grep -q '"vitest":' package.json \|\| (echo "FAIL: required deps missing in package.json" && exit 1)` |
| components.json exists | [STRUCTURAL] | `test -f components.json \|\| (echo "FAIL: components.json missing" && exit 1)` |
| Tailwind config has correct content glob | [STRUCTURAL] | `grep -q "src/\*\*/\*.{ts,tsx}" tailwind.config.js \|\| (echo "FAIL: tailwind.config.js content glob missing" && exit 1)` |
| main.tsx mounts App | [STRUCTURAL] | `grep -q "import App" src/main.tsx \|\| (echo "FAIL: src/main.tsx does not import App" && exit 1)` |
