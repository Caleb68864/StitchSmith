# StitchSmith

A browser-based **tool roll pattern generator** for sewists and crafters. Enter the tools you want to carry, configure pocket layout and seam settings, and StitchSmith produces a print-ready, dimensioned sewing pattern — laid out across as many letter or A4 pages as needed and verified with a built-in scale check.

Everything runs locally in your browser. No accounts, no servers, no telemetry.

---

## Why StitchSmith?

A roll-up tool wrap (think wrenches, chisels, knitting needles, paint brushes, makeup) is one of the easiest sewing projects to design *poorly*: pockets that are too tight, flaps that don't cover the longest tool, seam allowances that vanish into the binding. StitchSmith does the math:

- Sizes each pocket to the tool that lives in it, with configurable ease.
- Stacks and spaces pockets across the roll so nothing crowds the binding.
- Adds seam allowances, flap heights, and tie placements.
- Tiles the finished pattern across printer pages with crop marks and a scale-check square so you can verify your printer didn't shrink it.

---

## Features

- **Tool list editor** — name, width, height, and quantity per tool. Validation flags duplicates, missing fields, and tools that exceed the roll's usable width.
- **Layout engine** — `src/generators/tool-roll/calculateToolRollLayout.ts` computes pocket geometry, row grouping, and overall pattern dimensions from your inputs.
- **Configurable settings** — roll dimensions, pocket ease, flap height, seam allowance, binding width, units (mm / in).
- **Live SVG preview** — pan/zoom of the full pattern with a legend for cut lines, fold lines, stitch lines, and seam allowances.
- **Construction notes** — auto-generated, step-ordered instructions that match your specific configuration.
- **Warnings panel** — surfaces issues (oversized tools, sub-zero margins, etc.) before you waste fabric.
- **Print export** — tiled, paginated HTML print sheets with a **50 mm scale-check square** on every page.
- **SVG export** — single-file SVG of the full pattern for use in vector tools or cutting machines.
- **Project save / load** — round-trip your design as a `.json` file, or auto-save to browser `localStorage`.
- **Offline-first** — no network calls after the initial page load.

---

## Tech Stack

| Layer        | Choice                                                        |
| ------------ | ------------------------------------------------------------- |
| Framework    | React 18 + TypeScript                                         |
| Build / Dev  | Vite 5                                                        |
| Styling      | Tailwind CSS 3 + shadcn/ui (Radix primitives)                 |
| Icons        | lucide-react                                                  |
| Testing      | Vitest + @testing-library/react + jsdom                       |
| Persistence  | Browser `localStorage` + JSON import/export                   |

---

## Getting Started

### Prerequisites

- **Node.js 18+** (20 LTS recommended)
- **npm 9+** (or pnpm/yarn — lockfile is npm)

### Install & run

```bash
npm install
npm run dev
```

The dev server prints a local URL (typically `http://localhost:5173`). Open it in Chrome, Edge, Firefox, or Safari.

### Production build

```bash
npm run build
```

Outputs a static bundle to `dist/`. Preview it locally with `npm run preview`.

### Tests

```bash
npm test -- --run
```

Watch mode: `npm test`.

---

## Project Structure

```
src/
├── app/                       App shell + routing
├── components/
│   ├── layout/                Page chrome
│   ├── svg/                   Reusable SVG primitives (labels, scale square)
│   ├── tool-roll/             Tool roll generator UI
│   │   ├── ToolRollPage.tsx          Top-level page
│   │   ├── ToolRollSettingsPanel.tsx Settings form
│   │   ├── ToolTable.tsx             Tool list editor
│   │   ├── PatternPreview.tsx        Live SVG preview
│   │   ├── Legend.tsx                Line-type legend
│   │   ├── ConstructionNotes.tsx     Generated sewing steps
│   │   ├── WarningsPanel.tsx         Validation surface
│   │   └── ExportPanel.tsx           Print / SVG / JSON export buttons
│   └── ui/                    shadcn/ui components
├── export/
│   ├── exportPrintableHtml.ts        Tiled print-sheet generator
│   ├── exportSvg.ts                  Full-pattern SVG export
│   ├── exportProjectJson.ts          Save project to .json
│   └── importProjectJson.ts          Load project from .json
├── generators/tool-roll/
│   ├── calculateToolRollLayout.ts    Master layout function
│   ├── geometry.ts                   Geometric helpers
│   ├── grouping.ts                   Row / column grouping logic
│   ├── validation.ts                 Input validation rules
│   ├── constructionNotes.ts          Step-by-step note generator
│   ├── defaults.ts                   Default settings
│   └── types.ts                      Shared types
├── state/
│   └── useToolRollProject.ts         Project state hook
├── storage/
│   └── localStorage.ts               Auto-save / restore
├── lib/, utils/, styles/             Shared helpers and styles
└── main.tsx                          Entry point
```

Test files live next to the modules they cover (`*.test.ts`).

---

## Using the App

1. **Add your tools.** Each row needs a name, width, height, and quantity. Units follow the global setting (mm or in).
2. **Adjust roll settings.** Roll width/height, pocket ease, flap height, seam allowance, binding width.
3. **Watch the preview.** The SVG updates as you type. Red warnings in the Warnings panel block export until resolved.
4. **Read the construction notes.** They are generated from your current settings — they will change when you change inputs.
5. **Export.**
   - **Print** → opens a print-ready HTML window with tiled pages.
   - **SVG** → downloads a single-file SVG of the whole pattern.
   - **Save Project** → downloads a `.json` you can re-import later.

### Printing patterns

> **Print at 100% — do not scale to fit the page.**

In the browser print dialog, set scale to **100%** (not *Fit to page* / *Shrink to fit*). Every printed tile includes a **50 mm scale-check square** — verify it with a ruler before you cut fabric. The construction notes printed at the end of each tile set restate this.

Use a printer that supports borderless or minimal-margin printing for the cleanest tile joins. Trim along the printed crop marks and align the registration triangles when taping tiles together.

---

## Deployment

### Cloudflare Pages

1. Connect this repo in the Cloudflare Pages dashboard.
2. **Build command:** `npm run build`
3. **Build output directory:** `dist`
4. No environment variables needed.

### GitHub Pages

1. `npm run build`
2. Push the `dist/` directory to a `gh-pages` branch (the `gh-pages` npm package or a GitHub Action both work).
3. In **Settings → Pages**, set the source to `gh-pages` / `/ (root)`.
4. If serving from a sub-path (e.g. `username.github.io/StitchSmith/`), set `base` in `vite.config.ts` to match — e.g. `base: '/StitchSmith/'`.

### Any static host

`dist/` is plain static assets. Drop it on Netlify, Vercel, S3+CloudFront, or any nginx/Caddy server.

---

## Supported Browsers

- Chrome / Edge 100+ (recommended for printing)
- Firefox 100+
- Safari 16+

Internet Explorer and legacy Edge are not supported.

---

## Mag Pouch

The Mag Pouch generator produces flat-pattern sewing templates for MOLLE-compatible rifle magazine pouches. Enter your magazine type (or custom width × thickness × height dimensions), choose a retention style, attachment method, and drainage option, and StitchSmith computes a folded-T construction pattern with seam-allowance cut lines, fold lines, grommet placements, and PALS/MOLLE webbing strip counts — then exports to SVG, PDF, DXF, tiled print sheet, cut-list CSV, and step-by-step assembly instructions.

**Supported magazines** (all measured width × thickness × height, floorplate to feed-lip ridge):

- AR-15 / M4 30-round USGI aluminum (2.55 × 1.00 × 7.50 in)
- AR-15 20-round USGI aluminum (2.55 × 1.00 × 5.50 in)
- Magpul PMAG 30 Gen M2 MOE (2.60 × 1.05 × 7.50 in)
- Magpul PMAG 30 Gen M3 (2.60 × 1.05 × 7.50 in)
- Lancer Systems L5AWM 30-round hybrid (2.55 × 1.05 × 7.50 in)
- M4/STANAG-pattern 30-round steel (2.55 × 1.00 × 7.50 in)

> **AK-pattern magazines are not supported in v1.** AK-47 / AK-74 magazines have a
> pronounced rear-locking-lug curve and body taper that does not fit a straight
> folded-T construction without distortion. If you enter custom dimensions that match
> an AK profile (height ≥ 8.5 in AND thickness ≥ 1.05 in), the generator surfaces a
> non-blocking warning and recommends verifying fit with a physical mock-up. A
> `boxed_gusset` construction strategy that can accommodate curved bodies is planned
> for a future release.

> **Screenshot placeholder** — add a `docs/screenshots/mag-pouch-preview.png` showing
> the settings panel and folded-T SVG preview for an AR-15 30-round mag.

---

## Roadmap / Ideas

- Additional generator templates (knife rolls, bit organizers, gardening rolls)
- Metric ↔ imperial display toggle without re-entry
- Multi-tool grouping by category
- PDF export (alongside print and SVG)
- Cutting-machine-ready DXF export

Open an issue if you'd like to weigh in or contribute.

---

## Contributing

PRs welcome. Before opening one:

```bash
npm test -- --run
npm run build
```

Both should pass. Add tests next to any new module under `src/generators/`, `src/export/`, `src/state/`, or `src/storage/`.

---

## License

MIT — see [LICENSE](LICENSE).
