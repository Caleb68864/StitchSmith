/**
 * Tri-Zip hardware BOM (roadmap follow-up #8). The strap engine already
 * returns hardware for the shoulder straps; this collects it with the zipper,
 * sternum, hip belt, compression and handle hardware so the cut list can list
 * it instead of folding it into step text.
 *
 * Zipper sliders follow bags/zipper-slider-locking-vs-not.md: a pack's
 * vertical / loaded zippers take locking sliders. Sternum strap lengths are
 * SOE's production 18" and 24" (packs/medpack-shoulder-harness.md).
 */
import type { Hardware } from '../../lib/pattern-engine/materials/Hardware.js';
import type { StrapHardwareItem } from '../../lib/strap-engine/types.js';
import type { ResolvedInputs } from './types.js';

const IN = 25.4;

/** Zipper tape length the Y-zip consumes: the two side runs plus the split-height run, plus 50 mm each end. */
export function triZipZipperLengthMm(r: ResolvedInputs): number {
  const sideRun = r.height;
  const splitRun = r.height * (r.y_split_height_percent / 100);
  return 2 * sideRun + splitRun + 2 * 50;
}

export function buildTriZipBom(r: ResolvedInputs, strapHardware: StrapHardwareItem[] = []): Hardware[] {
  const hw: Hardware[] = [];
  const zipLen = triZipZipperLengthMm(r);
  hw.push({
    id: 'zipper-coil-8', name: '#8 coil zipper tape (continuous)', type: 'zipper', quantity: 1, sizeMm: Math.ceil(zipLen / 10) * 10,
    notes: `${Math.round(zipLen)} mm of tape for the Y-zip (two ${Math.round(r.height)} mm runs and a ${Math.round(r.height * r.y_split_height_percent / 100)} mm split, 50 mm spare each end). ${r.zipper_method === 'direct' ? 'Sewn direct to the wings.' : `On a ${r.zipper_gusset_width} mm zipper gusset.`}`,
  });
  hw.push({ id: 'zipper-slider-locking', name: '#8 locking slider', type: 'zipper', quantity: 3, notes: 'Three sliders (one per arm of the Y); locking — the runs are vertical and loaded. Non-locking only suits a horizontal pouch zipper.' });
  hw.push({ id: 'zipper-stop', name: 'Zipper top/bottom stops', type: 'zipper', quantity: 6, notes: 'Two per run.' });

  // Shoulder straps: the strap engine's hardware (ladderlock / tri-glide / buckle set per pad).
  for (const h of strapHardware) hw.push({ id: `strap-${h.id}`, name: h.name, type: /buckle/i.test(h.name) ? 'buckle' : /ring/i.test(h.name) ? 'dring' : 'webbing-adjuster', quantity: h.quantity, notes: h.notes });

  if (r.sternum_strap) {
    hw.push({ id: 'sternum-buckle', name: '25 mm side-release buckle (sternum)', type: 'buckle', quantity: 1, notes: 'Male on one slider, female on the other.' });
    hw.push({ id: 'sternum-slider', name: '25 mm sternum sliders (on the strap webbing)', type: 'webbing-adjuster', quantity: 2, notes: 'Ride on the shoulder-strap webbing so the sternum strap moves up and down.' });
    hw.push({ id: 'sternum-webbing', name: '25 mm webbing, sternum strap', type: 'other', quantity: 1, sizeMm: 24 * IN, notes: 'SOE production lengths are 18" and 24"; cut the long one and trim to the wearer.' });
  }
  if (r.hip_belt !== 'none') {
    hw.push({ id: 'hip-buckle', name: `${r.hip_belt === 'padded' ? '38' : '50'} mm side-release buckle (hip belt)`, type: 'buckle', quantity: 1 });
    hw.push({ id: 'hip-triglide', name: `${r.hip_belt === 'padded' ? '38' : '50'} mm tri-glide (hip belt adjust)`, type: 'webbing-adjuster', quantity: 2 });
  }
  if (r.compression_straps !== 'none') {
    const count = r.compression_straps === 'side_and_bottom' ? 4 : 2;
    hw.push({ id: 'compression-ladderlock', name: '25 mm ladderlock (compression straps)', type: 'webbing-adjuster', quantity: count, notes: `${count} straps: ${r.compression_straps === 'side_and_bottom' ? 'two side, two bottom' : 'two side'}. Every wrap length grows with the gusset depth — recut the straps if the depth changes.` });
  }
  return hw;
}
