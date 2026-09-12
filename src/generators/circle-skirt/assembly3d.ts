/**
 * 3D assembly of the circle skirt: each sector panel wrapped onto a cone that
 * hangs from the waist, radial seams joining neighbours, the waist pinned, and
 * gravity draping the hem over a hip form. A full circle unrolls to a flat
 * disc, so its cone half-angle is 90° and gravity does all the draping.
 */
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import type { Point } from '../../lib/pattern-engine/graph/Point.js';
import type { PiecePlacement } from '../../lib/fold-engine/index.js';
import type { SeamSpec, Solid, Vec3 } from '../../lib/cloth-engine/index.js';
import type { ResolvedInputs } from './types.js';

export interface CircleSkirtAssembly {
  pieces: Piece[];
  placements: Record<string, PiecePlacement>;
  pins: { pieceId: string; point: Point; radius: number }[];
  seams: SeamSpec[];
  /** Hip form (a vertical capsule) the skirt hangs over. */
  solids: Solid[];
  gravity: Vec3;
  apex3: Vec3;
}

export function circleSkirtAssembly(pieces: Piece[], r: ResolvedInputs): CircleSkirtAssembly | null {
  const panels = pieces.filter((p) => /^panel-\d+$/.test(p.id));
  if (panels.length === 0) return null;
  const sweepRad = (r.sweep_angle_deg * Math.PI) / 180;
  const panelRad = (r.panel_sweep_deg * Math.PI) / 180;
  // Rolling a sector of angle Φ into a cone: circumference r·Φ = 2π·(r sin α).
  const halfAngle = Math.asin(Math.min(1, sweepRad / (2 * Math.PI)));
  const angleScale = (2 * Math.PI) / Math.max(sweepRad, 1e-6);
  const apex3: Vec3 = [0, 0, 0];
  const placements: Record<string, PiecePlacement> = {};
  const pins: CircleSkirtAssembly['pins'] = [];
  const seams: SeamSpec[] = [];
  panels.forEach((p, k) => {
    placements[p.id] = { keep: true, cone: { apex: { x: 0, y: 0 }, apex3, halfAngle, angleScale, angle0: k * panelRad * angleScale } };
    // Hold the waist edge: every vertex on the inner (cut) arc.
    const steps = Math.max(2, Math.ceil((r.cut_inner_r * panelRad) / 6));
    for (let i = 0; i <= steps; i++) {
      const a = (i / steps) * panelRad;
      pins.push({ pieceId: p.id, point: { x: r.cut_inner_r * Math.cos(a), y: r.cut_inner_r * Math.sin(a) }, radius: 4 });
    }
    if (k > 0) {
      const prev = panels[k - 1];
      // prev's right seam (θ = panel sweep) meets this panel's left seam (θ = 0), waist to hem.
      seams.push({
        label: `${prev.id} ↔ ${p.id}`,
        a: { pieceId: prev.id, from: { x: r.cut_inner_r * Math.cos(panelRad), y: r.cut_inner_r * Math.sin(panelRad) }, to: { x: r.cut_outer_r * Math.cos(panelRad), y: r.cut_outer_r * Math.sin(panelRad) } },
        b: { pieceId: p.id, from: { x: r.cut_inner_r, y: 0 }, to: { x: r.cut_outer_r, y: 0 } },
      });
    }
  });
  // Close the skirt when the sweep is a full circle (the zip closes it in wear).
  if (panels.length > 1 && Math.abs(r.sweep_angle_deg - 360) < 1e-6) {
    const last = panels[panels.length - 1];
    seams.push({
      label: `${last.id} ↔ ${panels[0].id}`,
      a: { pieceId: last.id, from: { x: r.cut_inner_r * Math.cos(panelRad), y: r.cut_inner_r * Math.sin(panelRad) }, to: { x: r.cut_outer_r * Math.cos(panelRad), y: r.cut_outer_r * Math.sin(panelRad) } },
      b: { pieceId: panels[0].id, from: { x: r.cut_inner_r, y: 0 }, to: { x: r.cut_outer_r, y: 0 } },
    });
  }
  // Hips: a capsule below the waist, hip circumference ≈ waist + 25 % (the generator's elastic
  // rule uses waist + 100 mm; a fuller hip shows the drape better).
  const hipR = (r.hip_circumference / (2 * Math.PI)) * 1.05;
  // The capsule's top cap starts 100 mm below the waist (the waist itself is narrower than the hips).
  const solids: Solid[] = [{ kind: 'capsule', a: [0, -(100 + hipR), 0], b: [0, -Math.max(r.skirt_length, 100 + hipR + 200), 0], radius: hipR }];
  // Strong enough to hang a skirt-length of cloth within the viewer's step budget.
  return { pieces: panels, placements, pins, seams, solids, gravity: [0, -0.08, 0], apex3 };
}
