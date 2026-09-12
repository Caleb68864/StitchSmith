# StitchSmith

A browser-based **parametric sewing pattern generator**. Pick a project, type in your dimensions, check the result in 3D, and export a print-ready pattern with every cut line, fold, hem and seam drawn to scale.

Everything runs locally in your browser. No accounts, no servers, no telemetry, and it works offline after the first load.

---

## What it makes

Fifteen generators, grouped the way the app groups them.

**Pouches**

| Generator | What it produces |
| --- | --- |
| Mag Pouch | Folded-T single pouch or the SOE pleated card, 1–8 cells, PALS-grid spans, lids with a pull channel, cradle or pleated bottoms |
| Zip Pouch | Boxed corners, cross-bottom, gusset strip or multi-panel construction |
| Tactical Organizer | Pen and notebook organizer: hems marked at double, bellows side folds, split hook Velcro |

**Packs and bags**

| Generator | What it produces |
| --- | --- |
| Tool Roll | A pocket sized to each tool, with flap, ties and tiled print sheets |
| Tri-Zip Backpack | Modular tri-zip pack with padded straps, top panel, hip belt and a hardware BOM |
| Roll-Top Stuff Sack | Ultralight roll-top with french seams and boxed corners |
| Book Cover | Fabric cover with presets, flaps, closures, card slots and a tactical variant |
| Fanny Pack | Lid-drop tuning, drawbridge cord limiter, drainage grommets, dual-mode belt |
| Clamshell Pack | Fat clamshell medpack or tool pod: zipper frame hoop, alligator-mouth bottom, PALS fields, bowed handle |

**Rigs and carriers**

| Generator | What it produces |
| --- | --- |
| Micro Rig | Panel-as-pocket chest rig with pleated or stacked mag cells, side PALS, dangler field |
| Plate Carrier | Panels cut from the plate outline (SAPI, shooter, swimmer), cummerbund, shoulder straps, loop or PALS face |
| Modular LBV | Three zippered panel pockets, 1.5" PALS rows, 24" verticals, snap belt loops, drag handle |

**Straps and slings**

| Generator | What it produces |
| --- | --- |
| Padded Strap | Pack strap pair or the H-harness, checked on a torso form |
| Padded Sling | Padded two-point rifle sling: turned tube, foam setback, webbing tuck rule |

**Apparel**

| Generator | What it produces |
| --- | --- |
| Circle Skirt | Quarter to double circle, waistband and closure options |

---

## Where the numbers come from

Most of the tactical patterns are reconciled from a research vault of build videos and notes rather than invented. The rules that survive in code carry the note that justifies them, and the conventions are written down in `CLAUDE.md`:

- Seam allowance is either added by the engine to finished-size pieces, or baked into cut sizes with an explicit zero on every edge. One convention per generator, never mixed.
- Hems are single-fold and marked at double the depth, so a cut size already includes them.
- The PALS column pitch of 1.5" is immutable; an off-grid span earns a warning, because it is a tested failure rather than a style choice.
- A number the source marks as unknown becomes an input with a "measure and confirm" warning, never a hard default presented as fact.

---

## The 3D check

Every generator ships an assembly definition, so the app can fold the flat pattern and sew it up before you cut fabric.

- The **fold engine** splits each piece at its fold lines and hinges the regions at the angles the construction implies.
- The **cloth engine** is a position-based dynamics solver: seams pull matched stitch lines together, creases remember the rigid fold, foam and webbing stay stiff, layers collide, and gravity hangs the result. Bodies and contents are solids the cloth wraps around, including a torso form for straps and carriers.
- The check has caught real pattern faults: a lid two exposed-heights too short, boxed corners that ate the panel width, a gusseted front wider than its back, and a pack with nothing closing the top.

Open the **3D assembly** tab on any generator page to see it.

---

## Exports

SVG (whole pattern, or one cut sheet per material), PDF, DXF, tiled printable HTML with crop marks and a scale-check square, a cut list with strip-stock lengths as CSV, step-by-step instructions, and the project itself as JSON for backup or sharing.

> **Print at 100%.** Never "fit to page". Every tile carries a 50 mm scale-check square. Measure it before you cut.

---

## Getting started

Node 18+ (20 LTS recommended) and npm 9+.

```bash
npm install
npm run dev          # http://localhost:5273
```

| Script | What it does |
| --- | --- |
| `npm run dev` | Dev server on port 5273 |
| `npm run build` | Type-check and build a static bundle into `dist/` |
| `npm run preview` | Serve the built bundle |
| `npm run typecheck` | TypeScript, no emit |
| `npm run test` | Vitest in watch mode |
| `npm run test:run` | Vitest once, the way CI runs it |
| `npm run test:e2e` | Playwright: every generator's 3D assembly in a real browser |

---

## Project structure

```
src/
├── app/                    Shell, routing, the pattern registry
├── components/
│   ├── landing/            Landing page, categories, search
│   ├── shared/             Page shell, export panel, warnings, fields, 3D viewer
│   ├── ui/                 shadcn/ui primitives
│   └── <generator>/        One page and settings panel per generator
├── generators/<name>/      types, defaults, inputs, buildPattern, bom, assembly3d
├── lib/
│   ├── pattern-engine/     Graph types, geometry, primitives, exporters
│   ├── pouch-engine/       Pouch constructions and components
│   ├── strap-engine/       Padded straps and harnesses
│   ├── fold-engine/        Flat pattern to folded 3D
│   └── cloth-engine/       Seams, creases, collisions, materials, gravity
├── state/                  One project hook per generator, plus the registry
├── export/                 Project JSON envelope
└── storage/                localStorage persistence
```

Tests live in `__tests__` folders beside the code they cover. End-to-end tests are in `e2e/`.

A new generator supplies the seven files under `src/generators/<name>/`, a state hook, a page, a registry entry and an end-to-end target. `CLAUDE.md` has the conventions it must follow.

---

## Deployment

The build is plain static assets, so any static host works.

- **Cloudflare Pages**: build `npm run build`, output `dist`, no environment variables.
- **GitHub Pages**: publish `dist/` to `gh-pages`. If you serve from a sub-path, set `base` in `vite.config.ts` to match.
- **Anything else**: Netlify, Vercel, S3 with CloudFront, nginx, Caddy.

A service worker caches the app for offline use and updates itself on the next load.

---

## Browsers

Chrome and Edge 100+, Firefox 100+, Safari 16+. The 3D tab needs WebGL and says so when it is unavailable.

---

## Licence

See `LICENSE`.
