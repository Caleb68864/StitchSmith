// @vitest-environment node
/**
 * H3 — export robustness sweep. Every pattern-engine generator's default
 * project and its documented variants go through every exporter. Tool Roll
 * is not on the pattern engine (no Pattern to export) and is not swept here.
 */
import { describe, it, expect } from 'vitest';
import type { Pattern } from '../graph/Pattern.js';
import { patternToSvg, patternToSvgByMaterial, patternMaterials } from '../exports/svg.js';
import { exportPatternToDxf } from '../exports/dxf.js';
import { exportCutList, exportCutListCsv } from '../exports/cutList.js';
import { exportPatternToPdf } from '../exports/pdf.js';

import { makeDefaultMagPouchProject } from '../../../state/useMagPouchProject.js';
import { makeDefaultTriZipProject } from '../../../state/useTriZipProject.js';
import { makeDefaultRollTopSackProject } from '../../../state/useRollTopSackProject.js';
import { makeDefaultBookCoverProject } from '../../../state/useBookCoverProject.js';
import { makeDefaultZipPouchProject } from '../../../state/useZipPouchProject.js';
import { makeDefaultCircleSkirtProject } from '../../../state/useCircleSkirtProject.js';
import { makeDefaultPaddedStrapProject } from '../../../state/usePaddedStrapProject.js';
import { makeDefaultMicroRigProject } from '../../../state/useMicroRigProject.js';
import { makeDefaultSlingProject } from '../../../state/useSlingProject.js';
import { makeDefaultOrganizerProject } from '../../../state/useOrganizerProject.js';
import { makeDefaultFannyPackProject } from '../../../state/useFannyPackProject.js';
import { makeDefaultClamshellPackProject } from '../../../state/useClamshellPackProject.js';
import { makeDefaultPlateCarrierProject } from '../../../state/usePlateCarrierProject.js';
import { makeDefaultLbvProject } from '../../../state/useLbvProject.js';

import { buildPattern as buildMag } from '../../../generators/mag-pouch/index.js';
import { buildPattern as buildTriZip, getPreset } from '../../../generators/tri-zip-backpack/index.js';
import { buildPattern as buildRoll } from '../../../generators/roll-top-sack/index.js';
import { buildPattern as buildBook } from '../../../generators/book-cover/index.js';
import { buildPattern as buildZip } from '../../../generators/zip-pouch/index.js';
import { buildPattern as buildSkirt } from '../../../generators/circle-skirt/index.js';
import { buildPattern as buildStrap } from '../../../generators/padded-strap/index.js';
import { buildPattern as buildRig } from '../../../generators/micro-rig/index.js';
import { buildPattern as buildSling } from '../../../generators/sling/index.js';
import { buildPattern as buildOrg } from '../../../generators/organizer/index.js';
import { buildPattern as buildFanny } from '../../../generators/fanny-pack/index.js';
import { buildPattern as buildClam } from '../../../generators/clamshell-pack/index.js';
import { buildPattern as buildPlate } from '../../../generators/plate-carrier/index.js';
import { buildPattern as buildLbv } from '../../../generators/lbv/index.js';

type Case = { name: string; convention: 'A' | 'B' | 'mixed'; build: () => Pattern };

function pieces(id: string, r: { ok: true; value: { pieces: Pattern['pieces'] } } | { ok: false; errors?: unknown; error?: unknown }): Pattern {
  if (!r.ok) throw new Error(`${id}: build failed ${JSON.stringify('errors' in r ? r.errors : r.error)}`);
  return { id, name: id, pieces: r.value.pieces };
}

const mag = makeDefaultMagPouchProject().inputs;
const tz = makeDefaultTriZipProject().inputs;
const roll = makeDefaultRollTopSackProject().inputs;
const book = makeDefaultBookCoverProject().inputs;
const zip = makeDefaultZipPouchProject().inputs;
const skirt = makeDefaultCircleSkirtProject().inputs;
const strap = makeDefaultPaddedStrapProject().inputs;
const rig = makeDefaultMicroRigProject().inputs;
const sling = makeDefaultSlingProject().inputs;
const org = makeDefaultOrganizerProject().inputs;
const fanny = makeDefaultFannyPackProject().inputs;
const clam = makeDefaultClamshellPackProject().inputs;
const plate = makeDefaultPlateCarrierProject().inputs;
const lbv = makeDefaultLbvProject().inputs;

const CASES: Case[] = [
  { name: 'mag pouch (folded-T)', convention: 'A', build: () => buildMag(mag).pattern },
  { name: 'mag pouch (pleated card, 2 cells, velcro dot)', convention: 'B', build: () => buildMag({ ...mag, construction: 'pleated_card', cell_count: 2, retention: 'velcro_dot' }).pattern },
  { name: 'mag pouch (card, 4 cells, bungee, malice, hourglass)', convention: 'B', build: () => buildMag({ ...mag, construction: 'pleated_card', cell_count: 4, retention: 'open_top_bungee', attachment: 'malice', hourglass_aesthetic: true }).pattern },
  { name: 'tri-zip (default)', convention: 'A', build: () => { const r = buildTriZip(tz, getPreset(tz.stylePreset)); if (!r.ok) throw new Error(r.error.message); return r.value; } },
  { name: 'tri-zip (split gusset, direct zips)', convention: 'A', build: () => { const i = { ...tz, split_gusset: true, zipper_method: 'direct' as const }; const r = buildTriZip(i, getPreset(i.stylePreset)); if (!r.ok) throw new Error(r.error.message); return r.value; } },
  { name: 'tri-zip (tactical, padded hip belt, all straps)', convention: 'A', build: () => { const i = { ...tz, stylePreset: 'tactical' as const, hip_belt: 'padded' as const, compression_straps: 'side_and_bottom' as const, sternum_strap: true }; const r = buildTriZip(i, getPreset(i.stylePreset)); if (!r.ok) throw new Error(r.error.message); return r.value; } },
  { name: 'roll-top sack', convention: 'A', build: () => pieces('roll', buildRoll(roll)) },
  { name: 'book cover', convention: 'A', build: () => pieces('book', buildBook(book)) },
  { name: 'zip pouch (boxed)', convention: 'B', build: () => pieces('zip', buildZip(zip)) },
  { name: 'zip pouch (cross-bottom)', convention: 'B', build: () => pieces('zip', buildZip({ ...zip, construction_style: 'cross-bottom' })) },
  { name: 'zip pouch (gusset strip)', convention: 'B', build: () => pieces('zip', buildZip({ ...zip, construction_style: 'gusset-strip' })) },
  { name: 'zip pouch (multi-panel)', convention: 'B', build: () => pieces('zip', buildZip({ ...zip, construction_style: 'multi-panel' })) },
  { name: 'circle skirt', convention: 'A', build: () => ({ id: 'skirt', name: 'skirt', pieces: buildSkirt(skirt).pieces }) },
  { name: 'padded strap pair', convention: 'A', build: () => pieces('strap', buildStrap(strap)) },
  { name: 'H-harness', convention: 'A', build: () => pieces('strap', buildStrap({ units: 'mm', mode: 'h_harness', pad_length: 400, pad_width: 63.5, cross_strap_height: 150, pad_spread: 150, drop_leg_length: 300, foam_thickness: 10 })) },
  { name: 'micro rig', convention: 'mixed', build: () => pieces('rig', buildRig(rig)) },
  { name: 'micro rig (.308 stacked)', convention: 'mixed', build: () => pieces('rig', buildRig({ units: 'in', panel_width_preset: 'r308_14', pocket_set: 'stacked_cells', magazine_preset_id: 'pmag_308_20', cell_count: 2, cells_deep: 2 })) },
  { name: 'padded sling', convention: 'B', build: () => pieces('sling', buildSling(sling)) },
  { name: 'tactical organizer', convention: 'B', build: () => pieces('org', buildOrg(org)) },
  { name: 'tactical organizer (bifold, PALS, grommets)', convention: 'B', build: () => pieces('org', buildOrg({ ...org, bifold: true, pals_back: true, grommets: true, name_tape_loop: true })) },
  { name: 'fanny pack', convention: 'B', build: () => pieces('fanny', buildFanny(fanny)) },
  { name: 'fanny pack (closed lid, grommets, drawbridge)', convention: 'B', build: () => pieces('fanny', buildFanny({ units: 'in', width: 9, height: 5, depth: 2.5, seam_allowance: 0.5, lid_drop_target: 'partial', lid_angle_deg: 90, zipper_edge_finish: 'tape', drawbridge_limiter: true, bottom_grommets: 2, belt_webbing: 1, belt_min: 30, belt_max: 48 } as Parameters<typeof buildFanny>[0])) },
  { name: 'clamshell pack', convention: 'A', build: () => pieces('clam', buildClam(clam)) },
  { name: 'plate carrier', convention: 'A', build: () => pieces('plate', buildPlate(plate)) },
  { name: 'modular lbv', convention: 'A', build: () => pieces('lbv', buildLbv(lbv)) },
];

describe('export sweep — every generator through every exporter', () => {
  for (const c of CASES) {
    it(`${c.name}: SVG (plain, annotated, wrapped, per material), DXF, cut list, CSV, PDF`, async () => {
      const pattern = c.build();
      expect(pattern.pieces.length).toBeGreaterThan(0);
      const svg = patternToSvg(pattern);
      expect(svg.length).toBeGreaterThan(200);
      expect(Number.isFinite(svg.length)).toBe(true);
      for (const p of pattern.pieces) expect(svg).toContain(`id="piece-${p.id.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')}"`);
      const annotated = patternToSvg(pattern, { showAnnotations: true, showLabels: true, defaultSeamAllowance: 10 });
      expect(annotated).toContain('<svg');
      const wrapped = patternToSvg(pattern, { maxRowWidth: 300 });
      const vb = wrapped.match(/viewBox="0 0 ([\d.]+) ([\d.]+)"/)!;
      expect(Number.isFinite(parseFloat(vb[1])) && Number.isFinite(parseFloat(vb[2]))).toBe(true);
      const sheets = patternToSvgByMaterial(pattern, { maxRowWidth: 600 });
      expect(Object.keys(sheets)).toEqual(patternMaterials(pattern));
      for (const m of patternMaterials(pattern)) expect(patternToSvg(pattern, { materialFilter: m })).toContain('<svg');
      if (c.convention === 'B') {
        // Convention B: every cut edge carries an explicit 0, so no SA line even with a default SA.
        const withDefault = patternToSvg({ ...pattern, pieces: pattern.pieces.filter((p) => p.seamAllowances && Object.values(p.seamAllowances).every((v) => v === 0)) }, { defaultSeamAllowance: 10 });
        expect(withDefault).not.toContain('stroke="#2e7d32"');
      }
      const dxf = exportPatternToDxf(pattern);
      expect(dxf).toContain('ENTITIES');
      expect(dxf.length).toBeGreaterThan(100);
      const cl = exportCutList(pattern, [], [], { defaultSeamAllowance: 5 });
      expect(cl.byMaterial.length).toBeGreaterThan(0);
      for (const e of cl.byMaterial) expect(Number.isFinite(e.totalAreaMm2) && e.totalAreaMm2 > 0).toBe(true);
      const csv = exportCutListCsv(cl, []);
      expect(csv.split('\n').length).toBeGreaterThan(2);
      const pdf = await exportPatternToPdf(pattern);
      expect(pdf.size).toBeGreaterThan(500);
    });
  }
});
