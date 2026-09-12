// @vitest-environment node
/**
 * H4 — fold/cloth sweep. Every generator with an `assembly3d` (plus the e2e
 * variants) is assembled with the shared harness and relaxed; the fold models
 * are checked for orphans and tiling. Mag pouch, roll-top and book cover build
 * their assemblies inside their pages; `src/lib/cloth-engine/__tests__/patterns.test.ts`
 * reproduces those and is the sweep for them.
 */
import { describe, it, expect } from 'vitest';
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import { assemble, type AssemblyObject } from '../../lib/cloth-engine/__tests__/harness.js';
import { relax, seamResidual, maxStretch, maxPenetration, type SeamSpec, type Solid, type Vec3, type PinSpec } from '../../lib/cloth-engine/index.js';
import { buildFoldModel, pathToPolygon, area } from '../../lib/fold-engine/index.js';
import type { PiecePlacement } from '../../lib/fold-engine/index.js';

import { makeDefaultTriZipProject } from '../../state/useTriZipProject.js';
import { makeDefaultZipPouchProject } from '../../state/useZipPouchProject.js';
import { makeDefaultCircleSkirtProject } from '../../state/useCircleSkirtProject.js';
import { makeDefaultPaddedStrapProject } from '../../state/usePaddedStrapProject.js';
import { makeDefaultMicroRigProject } from '../../state/useMicroRigProject.js';
import { makeDefaultSlingProject } from '../../state/useSlingProject.js';
import { makeDefaultOrganizerProject } from '../../state/useOrganizerProject.js';
import { makeDefaultFannyPackProject } from '../../state/useFannyPackProject.js';
import { makeDefaultClamshellPackProject } from '../../state/useClamshellPackProject.js';
import { makeDefaultPlateCarrierProject } from '../../state/usePlateCarrierProject.js';
import { makeDefaultLbvProject } from '../../state/useLbvProject.js';

import { buildPattern as buildTriZip, getPreset, resolveInputs as resolveTriZip } from '../tri-zip-backpack/index.js';
import { triZipAssembly } from '../tri-zip-backpack/assembly3d.js';
import { buildPattern as buildZip, resolveInputs as resolveZip } from '../zip-pouch/index.js';
import { zipPouchAssembly } from '../zip-pouch/assembly3d.js';
import { buildPattern as buildSkirt, resolveInputs as resolveSkirt } from '../circle-skirt/index.js';
import { circleSkirtAssembly } from '../circle-skirt/assembly3d.js';
import { buildPattern as buildStrap, resolveInputs as resolveStrap } from '../padded-strap/index.js';
import { paddedStrapAssembly } from '../padded-strap/assembly3d.js';
import { buildPattern as buildRig, microRigAssembly } from '../micro-rig/index.js';
import { buildPattern as buildSling, slingAssembly } from '../sling/index.js';
import { buildPattern as buildOrg, organizerAssembly } from '../organizer/index.js';
import { buildPattern as buildFanny, fannyPackAssembly } from '../fanny-pack/index.js';
import { buildPattern as buildClam, clamshellAssembly } from '../clamshell-pack/index.js';
import { buildPattern as buildPlate, plateCarrierAssembly } from '../plate-carrier/index.js';
import { buildPattern as buildLbv, lbvAssembly } from '../lbv/index.js';

interface Asm {
  pieces: Piece[];
  object?: AssemblyObject | null;
  placements: Record<string, PiecePlacement>;
  seams: SeamSpec[];
  pins?: PinSpec[];
  solids?: Solid[];
  gravity?: Vec3;
  selfCollision?: boolean;
}
interface Case { name: string; spacing?: number; maxStretch: number; maxSeamMean: number; build: () => Asm | null }

function ok<T>(r: { ok: true; value: T } | { ok: false }): T { if (!r.ok) throw new Error('build failed'); return r.value; }

const tz = makeDefaultTriZipProject().inputs;
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
const hh = { units: 'mm' as const, mode: 'h_harness' as const, pad_length: 400, pad_width: 63.5, cross_strap_height: 150, pad_spread: 150, drop_leg_length: 300, foam_thickness: 10 };
const r308 = { units: 'in' as const, panel_width_preset: 'r308_14' as const, pocket_set: 'stacked_cells' as const, magazine_preset_id: 'pmag_308_20', cell_count: 2, cells_deep: 2 };
const fannyVar = { units: 'in', width: 9, height: 5, depth: 2.5, seam_allowance: 0.5, lid_drop_target: 'partial', lid_angle_deg: 90, zipper_edge_finish: 'tape', drawbridge_limiter: true, bottom_grommets: 2, belt_webbing: 1, belt_min: 30, belt_max: 48 } as Parameters<typeof buildFanny>[0];

const triZip = (i: typeof tz) => { const p = getPreset(i.stylePreset); const v = ok(buildTriZip(i, p)); return triZipAssembly(v.pieces, resolveTriZip(i, p)); };
const zipCase = (i: typeof zip) => zipPouchAssembly(ok(buildZip(i)).pieces, resolveZip(i));

// Ceilings are the measured values rounded up, so a regression shows.
const CASES: Case[] = [
  { name: 'tri-zip backpack', maxStretch: 0.30, maxSeamMean: 3, build: () => triZip(tz) },
  { name: 'tri-zip (split gusset, direct zips)', maxStretch: 0.30, maxSeamMean: 3, build: () => triZip({ ...tz, split_gusset: true, zipper_method: 'direct' }) },
  { name: 'zip pouch (boxed)', maxStretch: 0.30, maxSeamMean: 3, build: () => zipCase(zip) },
  { name: 'zip pouch (cross-bottom)', maxStretch: 0.35, maxSeamMean: 3, build: () => zipCase({ ...zip, construction_style: 'cross-bottom' }) },
  { name: 'zip pouch (gusset strip)', maxStretch: 0.30, maxSeamMean: 3, build: () => zipCase({ ...zip, construction_style: 'gusset-strip' }) },
  { name: 'zip pouch (multi-panel)', maxStretch: 0.30, maxSeamMean: 3, build: () => zipCase({ ...zip, construction_style: 'multi-panel' }) },
  { name: 'circle skirt', spacing: 16, maxStretch: 0.15, maxSeamMean: 3, build: () => { const b = buildSkirt(skirt); return circleSkirtAssembly(b.pieces, resolveSkirt(skirt)); } },
  { name: 'padded strap pair', maxStretch: 0.15, maxSeamMean: 3, build: () => paddedStrapAssembly(ok(buildStrap(strap)).pieces, resolveStrap(strap)) },
  { name: 'H-harness', spacing: 10, maxStretch: 0.15, maxSeamMean: 3, build: () => paddedStrapAssembly(ok(buildStrap(hh)).pieces, resolveStrap(hh)) },
  { name: 'micro rig', maxStretch: 1.5, maxSeamMean: 3, build: () => { const v = ok(buildRig(rig)); return microRigAssembly(v.pieces, v.resolved); } },
  { name: 'micro rig (.308 stacked)', maxStretch: 1.5, maxSeamMean: 3, build: () => { const v = ok(buildRig(r308)); return microRigAssembly(v.pieces, v.resolved); } },
  { name: 'padded sling', maxStretch: 0.15, maxSeamMean: 3, build: () => slingAssembly(ok(buildSling(sling)).resolved) },
  { name: 'tactical organizer', maxStretch: 0.50, maxSeamMean: 3, build: () => { const v = ok(buildOrg(org)); return organizerAssembly(v.pieces, v.resolved); } },
  { name: 'fanny pack', maxStretch: 0.15, maxSeamMean: 3, build: () => { const v = ok(buildFanny(fanny)); return fannyPackAssembly(v.pieces, v.resolved); } },
  { name: 'fanny pack (closed lid, grommets, drawbridge)', maxStretch: 0.25, maxSeamMean: 3, build: () => { const v = ok(buildFanny(fannyVar)); return fannyPackAssembly(v.pieces, v.resolved); } },
  { name: 'clamshell pack', maxStretch: 0.30, maxSeamMean: 3, build: () => { const v = ok(buildClam(clam)); return clamshellAssembly(v.pieces, v.resolved); } },
  { name: 'plate carrier', maxStretch: 0.30, maxSeamMean: 3, build: () => { const v = ok(buildPlate(plate)); return plateCarrierAssembly(v.pieces, v.resolved); } },
  { name: 'modular lbv', maxStretch: 0.15, maxSeamMean: 3, build: () => { const v = ok(buildLbv(lbv)); return lbvAssembly(v.pieces, v.resolved); } },
];

/** The pieces the viewer simulates in an assembled scene: placed pieces and the object's host. */
function scenePieces(asm: Asm): Piece[] {
  const host = asm.object?.base?.pieceId;
  const placed = asm.pieces.filter((p) => p.id in asm.placements || p.id === host);
  return placed.length ? placed : asm.pieces;
}

const results: Record<string, { stretch: number; seam: number; pen: number }> = {};

describe('assembly sweep — every generator with a 3D assembly', () => {
  for (const c of CASES) {
    it(`${c.name}: fold models tile without orphans; the cloth closes with finite positions`, () => {
      const asm = c.build();
      expect(asm).not.toBeNull();
      if (!asm) return;
      const pieces = scenePieces(asm);
      for (const piece of pieces) {
        const model = buildFoldModel(piece, { rootPoint: asm.placements[piece.id]?.rootPoint });
        if (!model) continue;
        expect(model.orphans, `${c.name}/${piece.id} orphans`).toEqual([]);
        const outline = piece.paths.find((p) => p.closed && p.edges.length > 0)!;
        const total = model.regions.reduce((s, r) => s + r.area, 0);
        expect(total, `${c.name}/${piece.id} tiling`).toBeCloseTo(area(pathToPolygon(outline)), 0);
      }
      const { world } = assemble(pieces, asm.placements, asm.seams, asm.object ?? null, c.spacing ?? 8, asm.pins ?? [], asm.gravity, asm.solids ?? [], asm.selfCollision ?? true);
      relax(world, 400);
      for (let i = 0; i < world.pos.length; i++) if (!Number.isFinite(world.pos[i])) throw new Error(`${c.name}: non-finite position at ${i}`);
      const stretch = maxStretch(world), seam = asm.seams.length ? seamResidual(world).mean : 0, pen = maxPenetration(world);
      results[c.name] = { stretch, seam, pen };
      expect(pen, `${c.name} penetration`).toBeLessThan(world.params.thickness);
      expect(seam, `${c.name} seam mean`).toBeLessThan(c.maxSeamMean);
      expect(stretch, `${c.name} stretch`).toBeLessThan(c.maxStretch);
    });
  }
  it('prints the sweep table', () => {
    console.log(Object.entries(results).map(([n, r]) => `${n}: stretch ${(r.stretch * 100).toFixed(1)}% seam ${r.seam.toFixed(2)} mm pen ${r.pen.toFixed(2)} mm`).join('\n'));
  });
});
