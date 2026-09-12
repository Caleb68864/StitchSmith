import { test, expect, type Page } from '@playwright/test';

/**
 * Every pattern page opens its "3D assembly" tab, the viewer renders through
 * WebGL, the cloth simulation runs to the end with sane numbers, and the
 * rigid fold with its fit report is reachable by unticking "simulate".
 */

interface Target {
  open: RegExp;
  /** Seed the project in localStorage before the app loads (a construction style, a variant). */
  seed?: { key: string; project: Record<string, unknown> };
  /** The page declares seams, so the seam gap must close. */
  seams: boolean;
  /** The page has a contents object, so the rigid fold shows a fit report. */
  fitReport: boolean;
  /** Upper bound on the viewer's global stretch figure (%), which includes allowance flaps and gathered rows. */
  maxStretch?: number;
}

const stamp = { createdAt: '2026-09-11T00:00:00.000Z', updatedAt: '2026-09-11T00:00:00.000Z' };

const TARGETS: Record<string, Target> = {
  'mag pouch (folded-T)': { open: /Open Mag Pouch/i, seams: true, fitReport: true },
  'mag pouch (pleated card)': {
    // The gathered face bottom shears its last mesh row (see CLAUDE.md), which the global figure includes.
    open: /Open Mag Pouch/i, seams: true, fitReport: true, maxStretch: 150,
    seed: { key: 'stitchsmith.mag-pouch.project', project: { schemaVersion: 3, generatorId: 'mag-pouch', projectName: 'E2E', ...stamp, inputs: { magazine: { mode: 'predefined', presetId: 'ar15_30_round', units: 'in' }, construction: 'pleated_card', cell_count: 2, retention: 'velcro_dot', attachment: 'pals', drainage: 'open_corner', seamAllowance: 0.375 } } },
  },
  'zip pouch (boxed)': { open: /Open Zip Pouch/i, seams: true, fitReport: true },
  'zip pouch (cross-bottom)': {
    open: /Open Zip Pouch/i, seams: true, fitReport: false,
    seed: { key: 'stitchsmith.zip-pouch.project', project: { schemaVersion: 5, generatorId: 'zip-pouch', projectName: 'E2E', ...stamp, inputs: { units: 'mm', preset: 'edc', construction_style: 'cross-bottom' } } },
  },
  'zip pouch (gusset strip)': {
    open: /Open Zip Pouch/i, seams: true, fitReport: true,
    seed: { key: 'stitchsmith.zip-pouch.project', project: { schemaVersion: 5, generatorId: 'zip-pouch', projectName: 'E2E', ...stamp, inputs: { units: 'mm', preset: 'edc', construction_style: 'gusset-strip' } } },
  },
  'zip pouch (multi-panel)': {
    open: /Open Zip Pouch/i, seams: true, fitReport: true,
    seed: { key: 'stitchsmith.zip-pouch.project', project: { schemaVersion: 5, generatorId: 'zip-pouch', projectName: 'E2E', ...stamp, inputs: { units: 'mm', preset: 'edc', construction_style: 'multi-panel' } } },
  },
  'roll-top sack': { open: /Open Roll-Top Stuff Sack/i, seams: true, fitReport: true },
  'book cover': { open: /Open Book Cover/i, seams: true, fitReport: true },
  'tri-zip backpack': { open: /Open Tri-Zip Backpack/i, seams: true, fitReport: true },
  'tri-zip (split gusset, direct zips)': {
    open: /Open Tri-Zip Backpack/i, seams: true, fitReport: true,
    seed: { key: 'stitchsmith.tri-zip-backpack.project', project: { schemaVersion: 2, generatorId: 'tri-zip-backpack', projectName: 'E2E', ...stamp, inputs: { height: 450, width: 300, depth: 150, units: 'mm', stylePreset: 'urban_assault', split_gusset: true, zipper_method: 'direct' } } },
  },
  'padded strap pair': { open: /Open Padded Strap/i, seams: false, fitReport: false },
  'H-harness': {
    open: /Open Padded Strap/i, seams: true, fitReport: false,
    seed: { key: 'stitchsmith.padded-strap.project', project: { schemaVersion: 7, generatorId: 'padded-strap', projectName: 'E2E', ...stamp, inputs: { units: 'mm', mode: 'h_harness', pad_length: 400, pad_width: 63.5, cross_strap_height: 150, pad_spread: 150, drop_leg_length: 300, foam_thickness: 10 } } },
  },
  'circle skirt': { open: /Open Circle Skirt/i, seams: true, fitReport: false },
  'micro rig': { open: /Open Micro Rig/i, seams: true, fitReport: true, maxStretch: 150 },
  'padded sling': { open: /Open Padded Sling/i, seams: false, fitReport: false },
  'tactical organizer': { open: /Open Tactical Organizer/i, seams: true, fitReport: true },
  'fanny pack': { open: /Open Fanny Pack/i, seams: true, fitReport: true },
  'fanny pack (closed lid, grommets, drawbridge)': {
    open: /Open Fanny Pack/i, seams: true, fitReport: true,
    seed: { key: 'stitchsmith.fanny-pack.project', project: { schemaVersion: 11, generatorId: 'fanny-pack', projectName: 'E2E', ...stamp, inputs: { units: 'in', width: 9, height: 5, depth: 2.5, seam_allowance: 0.5, lid_drop_target: 'partial', lid_angle_deg: 90, zipper_edge_finish: 'tape', drawbridge_limiter: true, bottom_grommets: 2, belt_webbing: 1, belt_min: 30, belt_max: 48 } } },
  },
  'clamshell pack': { open: /Open Clamshell Pack/i, seams: true, fitReport: true },
  'plate carrier': { open: /Open Plate Carrier/i, seams: true, fitReport: false },
  'modular lbv': { open: /Open Modular LBV/i, seams: true, fitReport: false },
  'micro rig (.308 stacked)': {
    open: /Open Micro Rig/i, seams: true, fitReport: true, maxStretch: 150,
    seed: { key: 'stitchsmith.micro-rig.project', project: { schemaVersion: 8, generatorId: 'micro-rig', projectName: 'E2E', ...stamp, inputs: { units: 'in', panel_width_preset: 'r308_14', pocket_set: 'stacked_cells', magazine_preset_id: 'pmag_308_20', cell_count: 2, cells_deep: 2 } } },
  },
};

async function openAssemblyTab(page: Page, target: Target) {
  await page.addInitScript(({ seed }) => {
    // Fresh state for each run, then the seeded project (if any).
    try {
      for (const k of Object.keys(localStorage)) if (k.startsWith('stitchsmith.')) localStorage.removeItem(k);
      if (seed) localStorage.setItem(seed.key, JSON.stringify(seed.project));
    } catch { /* ignore */ }
  }, { seed: target.seed ?? null });
  await page.goto('/');
  await page.getByRole('button', { name: target.open }).click();
  const tab = page.getByRole('tab', { name: '3D assembly' });
  await expect(tab).toBeEnabled();
  await tab.click();
  const preview = page.getByTestId('fold-preview-3d');
  await expect(preview).toBeVisible();
  await expect(preview.locator('canvas')).toHaveCount(1, { timeout: 30_000 });
  return preview;
}

/** Run the cloth to its last step through the viewer's debug hook and return the parsed stats. */
async function finishCloth(page: Page) {
  await page.waitForFunction(() => typeof (window as unknown as { __stitchsmithFoldViewer?: unknown }).__stitchsmithFoldViewer === 'object', null, { timeout: 30_000 });
  await page.evaluate(() => (window as unknown as { __stitchsmithFoldViewer: { finish: () => void } }).__stitchsmithFoldViewer.finish());
  const text = await page.getByTestId('sim-stats').innerText();
  const num = (label: string) => {
    const m = text.match(new RegExp(`${label}\\s*([-\\d.]+)`));
    return m ? parseFloat(m[1]) : NaN;
  };
  return { text, steps: num('Cloth:'), stretch: num('max stretch'), seam: num('seam gap'), pen: num('penetration') };
}

for (const [name, target] of Object.entries(TARGETS)) {
  test(`${name}: 3D assembly renders, the cloth closes, and the rigid fold is reachable`, async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(String(e)));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    const preview = await openAssemblyTab(page, target);
    // WebGL is up: the viewer did not fall back to its "needs WebGL" note.
    await expect(preview).not.toContainText('needs WebGL');
    await expect(preview).toContainText('sewn and relaxed');

    const stats = await finishCloth(page);
    expect(stats.steps, stats.text).toBe(360);
    expect(stats.pen, stats.text).toBeLessThan(1.2);
    expect(stats.stretch, stats.text).toBeLessThan(target.maxStretch ?? 60);
    if (target.seams) expect(stats.seam, stats.text).toBeLessThan(3);

    // The canvas is actually drawing: its pixels change when the view changes.
    const canvas = preview.locator('canvas');
    const sewn = await canvas.screenshot();
    await preview.getByLabel('flat').check();
    await page.waitForTimeout(600);
    const flat = await canvas.screenshot();
    expect(Buffer.compare(sewn, flat), 'canvas should repaint when switching to the flat layout').not.toBe(0);
    await preview.getByLabel('flat').uncheck();

    // Untick simulate: the rigid fold, and (with contents) the Stage 2 fit report.
    const simulate = preview.getByLabel(/simulate/i);
    await simulate.uncheck();
    await expect(page.getByTestId('sim-stats')).toHaveCount(0);
    if (target.fitReport) {
      await expect(page.getByTestId('fit-report')).toBeVisible();
      await expect(page.getByTestId('fit-report')).toContainText('clearance');
    }
    expect(errors, 'no page errors while assembling').toEqual([]);
  });
}

test('the chosen tab is remembered across pages', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Open Zip Pouch/i }).click();
  await page.getByRole('tab', { name: '3D assembly' }).click();
  await page.getByRole('button', { name: /Back to home/i }).click();
  await page.getByRole('button', { name: /Open Roll-Top Stuff Sack/i }).click();
  await expect(page.getByRole('tab', { name: '3D assembly' })).toHaveAttribute('aria-selected', 'true');
  await expect(page.getByTestId('fold-preview-3d')).toBeVisible();
});

test('Tool Roll shows the 3D tab disabled with a reason', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: /Open Tool Roll/i }).click();
  const tab = page.getByRole('tab', { name: '3D assembly' });
  await expect(tab).toBeDisabled();
  await expect(tab).toHaveAttribute('title', /not on the pattern engine/);
});
