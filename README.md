# StitchSmith

A tool roll pattern generator for sewists and crafters. Enter your tools, configure layout settings, and generate a print-ready pattern.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```

Produces a `dist/` directory of static assets ready for deployment.

## Test

```bash
npm test -- --run
```

## Deployment

### Cloudflare Pages

1. Connect your GitHub repository in the Cloudflare Pages dashboard.
2. Set **Build command**: `npm run build`
3. Set **Build output directory**: `dist`
4. No environment variables required. Deploy.

### GitHub Pages

1. Build locally or via CI: `npm run build`
2. Deploy the `dist/` directory to your `gh-pages` branch (e.g. with `gh-pages` npm package or GitHub Actions).
3. Set **Source** to `gh-pages` branch / `/ (root)` in repository Settings → Pages.
4. If the site is served from a sub-path (e.g. `username.github.io/StitchSmith/`), set `base` in `vite.config.ts` to match (e.g. `base: '/StitchSmith/'`).

## Supported Browsers

- Chrome / Edge 100+ (recommended for printing)
- Firefox 100+
- Safari 16+

Internet Explorer and legacy Edge are not supported.

## Printing Patterns

> **Print at 100% — do not scale to fit the page.**

When printing exported tiled HTML pages, set your browser's print scale to **100%** (not "Fit to page" or "Shrink to fit"). Each printed tile includes a 50 mm scale-check square — verify it with a ruler before cutting fabric. The construction notes printed at the end of each tile set also remind you of this.
