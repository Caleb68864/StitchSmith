/**
 * Circle Skirt Generator — Bill of Materials
 */

import type { CircleSkirtInputs, BomRow } from './types.js';
import { resolveInputs } from './inputs.js';

/**
 * Returns the BOM rows for a circle skirt: fabric, closure hardware, and any
 * additional notions. All quantities are calculated from resolved inputs.
 */
export function buildBom(inputs: CircleSkirtInputs): BomRow[] {
  const r = resolveInputs(inputs);
  const rows: BomRow[] = [];

  // ── Main fabric ─────────────────────────────────────────────────────────────
  // Each panel fits in a square of cut_outer_r × cut_outer_r (conservative).
  // Estimate linear yardage assuming panels are tiled across fabric_width.
  const panelBoxMm = r.cut_outer_r * 2; // bounding square side for one panel
  const panelsPerRow = Math.max(1, Math.floor(r.fabric_width / panelBoxMm));
  const panelRows = Math.ceil(r.num_panels / panelsPerRow);
  const fabricLengthMm = panelRows * panelBoxMm;
  const fabricLengthM = Math.ceil(fabricLengthMm / 100) / 10; // round up to nearest 0.1 m

  rows.push({
    id: 'fabric-main',
    description: 'Main skirt fabric',
    quantity: fabricLengthM,
    unit: 'm',
    notes: `${r.num_panels} panels × approx ${Math.round(panelBoxMm)}mm square. Width ≥ ${Math.round(r.fabric_width)}mm (${Math.round(r.fabric_width / 25.4)}")`,
  });

  // ── Waistband fabric ────────────────────────────────────────────────────────
  const bandH =
    r.waistband_type === 'elastic-casing' ? r.elastic_width : r.band_height;
  const wbWidthMm = r.effective_waist + 2 * r.seam_allowance;
  const wbHeightMm = 2 * bandH + 2 * r.seam_allowance;
  const wbLengthM = Math.ceil(wbWidthMm / 100) / 10;

  rows.push({
    id: 'fabric-waistband',
    description: 'Waistband fabric',
    quantity: wbLengthM,
    unit: 'm',
    notes: `Cut 1 piece ${Math.round(wbWidthMm)}mm × ${Math.round(wbHeightMm)}mm. May be cut from main fabric if sufficient width remains.`,
  });

  // ── Interfacing for straight waistband ──────────────────────────────────────
  if (r.waistband_type === 'straight') {
    rows.push({
      id: 'interfacing',
      description: 'Woven fusible interfacing for waistband',
      quantity: wbLengthM,
      unit: 'm',
      notes: `Same dimensions as waistband cut piece: ${Math.round(wbWidthMm)}mm × ${Math.round(wbHeightMm / 2)}mm (half height, applied before folding).`,
    });
  }

  // ── Closure hardware ────────────────────────────────────────────────────────
  if (r.closure === 'elastic') {
    const elasticLengthMm = r.effective_waist + 50; // 50mm ease for overlap
    const elasticLengthM = Math.ceil(elasticLengthMm / 100) / 10;
    rows.push({
      id: 'elastic',
      description: `${Math.round(r.elastic_width)}mm wide elastic`,
      quantity: elasticLengthM,
      unit: 'm',
      notes: `Cut to fit waist (approx ${Math.round(elasticLengthMm)}mm including 50mm overlap).`,
    });
  } else {
    // side-zip or back-zip
    const zipperLengthMm = r.skirt_length + r.band_height + 50;
    const zipperLengthCm = Math.ceil(zipperLengthMm / 10);
    rows.push({
      id: 'zipper',
      description: `Invisible or separating zipper — ${r.closure === 'back-zip' ? 'center back' : 'left side'}`,
      quantity: 1,
      unit: 'ea',
      notes: `Minimum length ${zipperLengthCm}cm. Choose colour to match fabric.`,
    });
  }

  // ── Thread ──────────────────────────────────────────────────────────────────
  rows.push({
    id: 'thread',
    description: 'All-purpose polyester thread',
    quantity: 1,
    unit: 'spool',
    notes: 'Match to fabric colour.',
  });

  return rows;
}
