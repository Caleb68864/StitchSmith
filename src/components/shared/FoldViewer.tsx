import { useEffect, useMemo, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import { bboxFromPiece } from '../../lib/pattern-engine/geometry/bbox.js';
import {
  buildFoldModel,
  defaultFoldAngles,
  foldModel,
  measureCavity,
  regionsUnderFolds,
  withoutRegions,
  regionAt,
  onAnyFold,
  makePlacer,
  type FoldModel,
  type FoldedModel,
  type CavityReport,
} from '../../lib/fold-engine/index.js';
import type { FoldPreview3DProps, PiecePlacement, SeamSpec } from './FoldPreview3D.js';
import {
  buildClothMesh,
  createWorld,
  step as clothStep,
  seamResidual,
  maxStretch,
  maxPenetration,
  foldedInitial,
  foldedCreaseRest,
  type ClothWorld,
} from '../../lib/cloth-engine/index.js';

const CLOTH_SPACING = 8;
const CLOTH_STEPS = 360;
const CLOTH_STEPS_PER_FRAME = 8;

const DEG = Math.PI / 180;
const PIECE_GAP = 20;
const PALETTE = [0x4f7cac, 0xc98b4a, 0x6aa36f, 0xa66a9e, 0xd0b04d, 0x5d8f9e, 0xb3675b, 0x8b8b8b];

interface PieceEntry {
  model: FoldModel;
  /** Flat-frame translation applied before folding. */
  offsetX: number;
  offsetY: number;
  offsetZ: number;
  color: number;
  placement?: PiecePlacement;
}

function layoutPieces(pattern: Pattern, allPieces: boolean, placements: Record<string, PiecePlacement>, base?: FoldPreview3DProps['object'] extends infer O ? (O extends { base?: infer B } ? B : never) : never): PieceEntry[] {
  const entries: PieceEntry[] = [];
  let x = 0;
  const models = pattern.pieces.map((piece) => {
    let rootPoint = placements[piece.id]?.rootPoint;
    // The object stands on the root by definition: root the host piece just inside its base edge.
    if (!rootPoint && base && base.pieceId === piece.id) {
      rootPoint = { x: base.point.x + base.direction.x, y: base.point.y + base.direction.y };
    }
    return buildFoldModel(piece, { rootPoint });
  });
  const anyFolds = models.some((m) => m && m.folds.length > 0);
  pattern.pieces.forEach((piece, i) => {
    const model = models[i];
    if (!model) return;
    const pl = placements[piece.id];
    // By default show the pieces that actually fold (or every piece when none do); strips only clutter.
    if (!allPieces && anyFolds && model.folds.length === 0 && !pl?.keep) return;
    const bb = bboxFromPiece(piece);
    if (pl && (pl.dx !== undefined || pl.dy !== undefined || pl.dz !== undefined)) {
      // Placed pieces sit in the first piece's frame instead of the side-by-side row.
      entries.push({ model, offsetX: pl.dx ?? 0, offsetY: pl.dy ?? 0, offsetZ: pl.dz ?? 0, color: PALETTE[i % PALETTE.length], placement: pl });
      return;
    }
    entries.push({ model, offsetX: x - bb.minX, offsetY: 0, offsetZ: 0, color: PALETTE[i % PALETTE.length] });
    x += bb.width + PIECE_GAP;
  });
  return entries;
}

/** Is flat point `f` on the host panel under the object's back face (inset by most of a cloth cell)? */
function underObject(f: { x: number; y: number }, object: NonNullable<FoldPreview3DProps['object']>): boolean {
  const base = object.base!;
  const len = Math.hypot(base.direction.x, base.direction.y) || 1;
  const dx = base.direction.x / len;
  const dy = base.direction.y / len;
  const rx = f.x - base.point.x;
  const ry = f.y - base.point.y;
  const along = rx * dx + ry * dy;
  const across = Math.abs(-rx * dy + ry * dx);
  const margin = CLOTH_SPACING - 2;
  return along > margin && along < object.height - margin && across < object.width / 2 - margin;
}

function fmtMm(v: number | null): string {
  return v === null ? 'open' : `${Math.round(v)} mm`;
}

// Stable defaults: fresh `{}` / `[]` per render would re-run the geometry effect on
// every stats update and restart the cloth simulation from step 0.
const NO_PLACEMENTS: Record<string, PiecePlacement> = {};
const NO_SEAMS: SeamSpec[] = [];

export function FoldViewer({ pattern, object, placements = NO_PLACEMENTS, seams = NO_SEAMS, initialProgress = 1, height = 360 }: FoldPreview3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ scene: THREE.Scene; group: THREE.Group; renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera; controls: OrbitControls } | null>(null);
  const [progress, setProgress] = useState(initialProgress);
  const [showObject, setShowObject] = useState(true);
  const [showFlat, setShowFlat] = useState(false);
  const [angleOverrides, setAngleOverrides] = useState<Record<string, number>>({});
  const [allPieces, setAllPieces] = useState(false);
  const [cavity, setCavity] = useState<(CavityReport & { floor: number | null; above: number | null }) | null>(null);
  const [simulate, setSimulate] = useState(false);
  const [simStats, setSimStats] = useState<{ steps: number; stretch: number; seam: number; pen: number } | null>(null);
  const clothRef = useRef<{ world: ClothWorld; geoms: THREE.BufferGeometry[]; raf: number } | null>(null);

  const entries = useMemo(() => layoutPieces(pattern, allPieces, placements, object?.base), [pattern, allPieces, placements, object?.base]);
  const first = entries[0];

  // Scene setup once per mount.
  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const width = mount.clientWidth || 600;
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(width, height);
    mount.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 1, 20000);
    camera.position.set(0, -600, 700);
    camera.up.set(0, 0, 1);
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    scene.add(new THREE.AmbientLight(0xffffff, 0.7));
    const key = new THREE.DirectionalLight(0xffffff, 0.8);
    key.position.set(300, -400, 800);
    scene.add(key);
    const fill = new THREE.DirectionalLight(0xffffff, 0.35);
    fill.position.set(-400, 300, -200);
    scene.add(fill);
    const group = new THREE.Group();
    scene.add(group);
    sceneRef.current = { scene, group, renderer, camera, controls };
    let raf = 0;
    const tick = () => { controls.update(); renderer.render(scene, camera); raf = requestAnimationFrame(tick); };
    tick();
    const onResize = () => {
      const w = mount.clientWidth || 600;
      renderer.setSize(w, height);
      camera.aspect = w / height;
      camera.updateProjectionMatrix();
    };
    window.addEventListener('resize', onResize);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      controls.dispose();
      renderer.dispose();
      mount.removeChild(renderer.domElement);
      sceneRef.current = null;
    };
  }, [height]);

  // Rebuild geometry whenever inputs change.
  useEffect(() => {
    const s = sceneRef.current;
    if (!s) return;
    const { group } = s;
    while (group.children.length) {
      const c = group.children.pop()!;
      c.traverse((o) => {
        const m = o as THREE.Mesh;
        m.geometry?.dispose?.();
        const mat = m.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach((x) => x.dispose()); else mat?.dispose?.();
      });
    }
    const bounds = new THREE.Box3();
    const foldedModels: FoldedModel[] = [];

    // Object placement (used by both the box and the cloth solids).
    let objectBox: { center: [number, number, number]; half: [number, number, number]; dir3: THREE.Vector3 } | null = null;
    if (object && first) {
      const host = object.base ? entries.find((e) => e.model.pieceId === object.base!.pieceId) ?? first : first;
      const root = host.model.regions[host.model.root];
      const dirFlat = object.base?.direction ?? { x: 0, y: -1 };
      const dir3 = new THREE.Vector3(dirFlat.x, -dirFlat.y, 0).normalize();
      const base = object.base?.point ?? { x: root.centroid.x, y: Math.max(...root.poly.map((p) => p.y)) };
      // Lift the object one fabric thickness off its base seam so cloth can pass under it.
      const centre = new THREE.Vector3(base.x + host.offsetX, -base.y - host.offsetY, host.offsetZ + object.depth / 2 + 0.6).add(dir3.clone().multiplyScalar(object.height / 2 + 1.5));
      const vertical = Math.abs(dir3.y) > Math.abs(dir3.x);
      objectBox = { center: [centre.x, centre.y, centre.z], half: vertical ? [object.width / 2, object.height / 2, object.depth / 2] : [object.height / 2, object.width / 2, object.depth / 2], dir3 };
    }

    const anglesOf = (entry: PieceEntry) => defaultFoldAngles(entry.model).map((a, i) => {
      const key = `${entry.model.pieceId}:${i}`;
      return key in angleOverrides ? angleOverrides[key] * DEG : a;
    });
    const t = showFlat ? 0 : progress;
    const placer = makePlacer(entries, (e) => anglesOf(e as PieceEntry), t);

    for (const entry of entries) {
      const angles = anglesOf(entry);
      const raw = foldModel(entry.model, angles, t);
      const shift = placer(entry);
      const folded: FoldedModel = {
        pieceId: raw.pieceId,
        panels: raw.panels.map((p) => ({ ...p, vertices: p.vertices.map(shift) })),
        hinges: raw.hinges.map((h) => ({ ...h, a: shift(h.a), b: shift(h.b) })),
      };
      foldedModels.push(folded);
      const mat = new THREE.MeshStandardMaterial({ color: entry.color, side: THREE.DoubleSide, roughness: 0.85, metalness: 0 });
      for (const panel of folded.panels) {
        const geom = new THREE.BufferGeometry();
        const pos = new Float32Array(panel.vertices.length * 3);
        panel.vertices.forEach((v, i) => { pos[i * 3] = v[0]; pos[i * 3 + 1] = v[1]; pos[i * 3 + 2] = v[2]; });
        geom.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        geom.setIndex(panel.triangles.flat());
        geom.computeVertexNormals();
        const mesh = new THREE.Mesh(geom, mat);
        group.add(mesh);
        bounds.expandByObject(mesh);
        const edges = new THREE.LineSegments(new THREE.EdgesGeometry(geom, 1), new THREE.LineBasicMaterial({ color: 0x222222 }));
        group.add(edges);
      }
      const hingeMat = new THREE.LineBasicMaterial({ color: 0x0066cc });
      for (const h of folded.hinges) {
        const g = new THREE.BufferGeometry().setFromPoints([
          new THREE.Vector3(h.a[0], h.a[1], h.a[2] + 0.3),
          new THREE.Vector3(h.b[0], h.b[1], h.b[2] + 0.3),
        ]);
        group.add(new THREE.Line(g, hingeMat));
      }
    }

    // Stage 3: cloth simulation replaces the rigid panels with a seamed, relaxed mesh.
    if (clothRef.current) { cancelAnimationFrame(clothRef.current.raf); clothRef.current = null; }
    if (simulate && !showFlat) {
      // Drop the rigid panel meshes; keep hinge lines for orientation.
      for (const c of [...group.children]) if ((c as THREE.Mesh).isMesh) { group.remove(c); }
      const clothMeshes = entries.map((e) => {
        const piece = pattern.pieces.find((p) => p.id === e.model.pieceId)!;
        const seamXs = seams.flatMap((sm) => [sm.a, sm.b].filter((sd) => sd.pieceId === piece.id).flatMap((sd) => [sd.from.x, sd.to.x]));
        const seamYs = seams.flatMap((sm) => [sm.a, sm.b].filter((sd) => sd.pieceId === piece.id).flatMap((sd) => [sd.from.y, sd.to.y]));
        return buildClothMesh(piece, { spacing: CLOTH_SPACING, extraX: seamXs, extraY: seamYs });
      });
      const valid = clothMeshes.map((m, i) => (m ? { mesh: m, entry: entries[i] } : null)).filter((x): x is { mesh: NonNullable<typeof clothMeshes[number]>; entry: PieceEntry } => x !== null);
      if (valid.length > 0) {
        const inits = valid.map(({ entry }) => foldedInitial({ model: entry.model, angles: anglesOf(entry), t: progress, transform: placer(entry) }));
        const creases = valid.map(({ entry }) => foldedCreaseRest({ model: entry.model, angles: anglesOf(entry), t: progress }));
        const hostId = object?.base?.pieceId ?? valid[0].entry.model.pieceId;
        const solids = object && showObject && objectBox ? [{ kind: 'box' as const, center: objectBox.center, half: objectBox.half }] : [];
        const world = createWorld({
          meshes: valid.map((v) => v.mesh),
          initial: (mi, _v, f) => inits[mi](f),
          bendRest: (mi, k, l, i, j) => creases[mi](k, l, i, j),
          seams,
          solids,
          // Pin the host panel's interior; its fold-line vertices stay free so the hinges can flex.
          // With `pin: 'footprint'` only the area behind the object is held, leaving the rest of
          // the host free to wrap round to the seams.
          pinned: (mi, _v, f) => valid[mi].entry.model.pieceId === hostId
            && regionAt(valid[mi].entry.model, f) === valid[mi].entry.model.root
            && !onAnyFold(valid[mi].entry.model, f, 1.5)
            && (object?.pin !== 'footprint' || !object.base || underObject(f, object)),
          params: { spacing: CLOTH_SPACING },
        });
        const geoms: THREE.BufferGeometry[] = valid.map(({ mesh, entry }) => {
          const geom = new THREE.BufferGeometry();
          geom.setAttribute('position', new THREE.BufferAttribute(new Float32Array(mesh.vertexCount * 3), 3));
          geom.setIndex(Array.from(mesh.triangles));
          const mat = new THREE.MeshStandardMaterial({ color: entry.color, side: THREE.DoubleSide, roughness: 0.9, metalness: 0, flatShading: false });
          group.add(new THREE.Mesh(geom, mat));
          return geom;
        });
        const upload = () => {
          valid.forEach(({ mesh }, mi) => {
            const attr = geoms[mi].getAttribute('position') as THREE.BufferAttribute;
            const b = world.base[mi];
            for (let v = 0; v < mesh.vertexCount; v++) {
              attr.setXYZ(v, world.pos[3 * (b + v)], world.pos[3 * (b + v) + 1], world.pos[3 * (b + v) + 2]);
            }
            attr.needsUpdate = true;
            geoms[mi].computeVertexNormals();
          });
        };
        upload();
        // Debug hook (used by the headless screenshot harness): run the remaining steps now.
        (window as unknown as { __stitchsmithFoldViewer?: { finish: () => void } }).__stitchsmithFoldViewer = {
          finish: () => {
            while (world.steps < CLOTH_STEPS) clothStep(world);
            upload();
            setSimStats({ steps: world.steps, stretch: maxStretch(world), seam: seamResidual(world).mean, pen: maxPenetration(world) });
          },
        };
        const tick = () => {
          if (world.steps < CLOTH_STEPS) {
            for (let k = 0; k < CLOTH_STEPS_PER_FRAME; k++) clothStep(world);
            upload();
            if (world.steps % 20 === 0 || world.steps >= CLOTH_STEPS) {
              setSimStats({ steps: world.steps, stretch: maxStretch(world), seam: seamResidual(world).mean, pen: maxPenetration(world) });
            }
            clothRef.current = { world, geoms, raf: requestAnimationFrame(tick) };
          }
        };
        clothRef.current = { world, geoms, raf: requestAnimationFrame(tick) };
      }
    } else {
      setSimStats(null);
    }

    // Object box. Its base sits on the root region (which stays flat), so flat
    // pattern coordinates map straight to 3D: (x, −y, 0).
    let up = new THREE.Vector3(0, 1, 0);
    if (object && showObject && first && objectBox) {
      const dir3 = objectBox.dir3;
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(object.width, object.height, object.depth),
        new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.45, roughness: 0.6 }),
      );
      // BoxGeometry's height runs along +y; rotate about z so it runs along dir3.
      box.rotation.z = Math.atan2(dir3.y, dir3.x) - Math.PI / 2;
      box.position.set(objectBox.center[0], objectBox.center[1], objectBox.center[2]);
      group.add(box);
      const wire = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: 0x111111 }));
      wire.rotation.copy(box.rotation);
      wire.position.copy(box.position);
      group.add(wire);
      up = dir3;
      // Stage 2: measure the cavity around the object with rays against the folded panels.
      if (!showFlat && progress >= 0.999 && !simulate) {
        const centre = box.position;
        const half: [number, number, number] = [object.width / 2, object.height / 2, object.depth / 2];
        // A rigid lid sweeps through the object instead of wrapping it, so measure across/depth
        // without any panel hanging off a lid fold, and only use the full model for the height axis.
        const noLid = foldedModels.map((fm, i) => withoutRegions(fm, regionsUnderFolds(entries[i].model, (f) => /lid|flap/i.test(`${f.label ?? ''} ${f.pathId}`))));
        const body = measureCavity(noLid, [centre.x, centre.y, centre.z], half);
        const full = measureCavity(foldedModels, [centre.x, centre.y, centre.z], half);
        const floor = dir3.y < 0 ? full.y.pos : full.y.neg;
        const above = dir3.y < 0 ? full.y.neg : full.y.pos;
        setCavity({ ...body, y: full.y, floor, above });
      } else {
        setCavity(null);
      }
    } else if (object?.base) {
      up = new THREE.Vector3(object.base.direction.x, -object.base.direction.y, 0).normalize();
    }
    s.camera.up.copy(up);

    // Frame the scene.
    if (!bounds.isEmpty()) {
      const center = bounds.getCenter(new THREE.Vector3());
      const size = bounds.getSize(new THREE.Vector3()).length();
      s.controls.target.copy(center);
      const cam = s.camera;
      const dist = size / (2 * Math.tan((cam.fov * DEG) / 2)) * 1.15;
      // Look from the front (+z), a little above (along `up`) and to the right.
      const dir = new THREE.Vector3(0.55, 0, 0.75).add(up.clone().multiplyScalar(0.4)).normalize();
      cam.position.copy(center.clone().add(dir.multiplyScalar(Math.max(dist, 100))));
      cam.near = Math.max(1, dist / 100);
      cam.far = dist * 20;
      cam.updateProjectionMatrix();
      s.controls.update();
    }
    if (!(object && showObject && first)) setCavity(null);
    return () => { if (clothRef.current) { cancelAnimationFrame(clothRef.current.raf); clothRef.current = null; } };
  }, [entries, progress, showObject, showFlat, angleOverrides, object, first, simulate, seams, pattern]);

  const foldControls = entries.flatMap((e) =>
    e.model.folds.map((f, i) => {
      const key = `${e.model.pieceId}:${i}`;
      const dflt = Math.round(defaultFoldAngles(e.model)[i] / DEG);
      return { key, label: `${e.model.pieceName}: ${f.label ?? f.pathId}`, value: key in angleOverrides ? angleOverrides[key] : dflt, dflt };
    }),
  );

  return (
    <div className="space-y-2">
      <div ref={mountRef} className="w-full rounded bg-muted/30 overflow-hidden" style={{ height }} />
      <div className="flex flex-wrap items-center gap-3 text-xs">
        <label className="flex items-center gap-2 flex-1 min-w-[200px]">
          <span className="whitespace-nowrap">Fold</span>
          <input type="range" min={0} max={1} step={0.01} value={progress} aria-label="Fold progress"
            onChange={(e) => setProgress(parseFloat(e.target.value))} className="flex-1 accent-primary" />
          <span className="w-10 text-right tabular-nums">{Math.round(progress * 100)}%</span>
        </label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={showFlat} onChange={(e) => setShowFlat(e.target.checked)} /> flat</label>
        <label className="flex items-center gap-1"><input type="checkbox" checked={allPieces} onChange={(e) => setAllPieces(e.target.checked)} /> all pieces</label>
        {seams.length > 0 && <label className="flex items-center gap-1"><input type="checkbox" checked={simulate} onChange={(e) => setSimulate(e.target.checked)} /> simulate seams</label>}
        {object && <label className="flex items-center gap-1"><input type="checkbox" checked={showObject} onChange={(e) => setShowObject(e.target.checked)} /> {object.label ?? 'object'}</label>}
        <span className="text-muted-foreground">drag to orbit, wheel to zoom</span>
      </div>
      {simStats && (
        <div className="text-xs rounded border border-border p-2 flex flex-wrap gap-3" data-testid="sim-stats">
          <span><span className="text-muted-foreground">Cloth:</span> {simStats.steps}/{CLOTH_STEPS} steps</span>
          <span><span className="text-muted-foreground">max stretch</span> {(simStats.stretch * 100).toFixed(1)}%</span>
          <span><span className="text-muted-foreground">seam gap</span> {simStats.seam.toFixed(1)} mm</span>
          <span><span className="text-muted-foreground">penetration</span> {simStats.pen.toFixed(1)} mm</span>
          <span className="text-muted-foreground">gathered seams are not modelled yet</span>
        </div>
      )}
      {cavity && object && (
        <div className="text-xs rounded border border-border p-2 grid grid-cols-3 gap-2" data-testid="fit-report">
          <div><span className="text-muted-foreground">Across:</span> cavity {fmtMm(cavity.x.extent)}, {object.label ?? 'object'} {Math.round(object.width)} mm — <span className={cavity.x.clearance !== null && cavity.x.clearance < 0 ? 'text-destructive' : ''}>clearance {fmtMm(cavity.x.clearance)}</span></div>
          <div><span className="text-muted-foreground">Depth:</span> cavity {fmtMm(cavity.z.extent)}, {object.label ?? 'object'} {Math.round(object.depth)} mm — <span className={cavity.z.clearance !== null && cavity.z.clearance < 0 ? 'text-destructive' : ''}>clearance {fmtMm(cavity.z.clearance)}</span></div>
          <div><span className="text-muted-foreground">Height:</span> floor {fmtMm(cavity.floor)} below centre; above {cavity.above === null ? 'open (mouth)' : `${fmtMm(cavity.above)} (lid over it)`}; {Math.round(object.height)} mm tall</div>
        </div>
      )}
      {foldControls.length > 0 && (
        <details className="text-xs">
          <summary className="cursor-pointer select-none text-muted-foreground">Fold angles ({foldControls.length})</summary>
          <div className="mt-1 space-y-1">
            {foldControls.map((c) => (
              <label key={c.key} className="flex items-center gap-2">
                <span className="w-56 truncate" title={c.label}>{c.label}</span>
                <input type="range" min={-180} max={180} step={5} value={c.value} aria-label={c.label}
                  onChange={(e) => setAngleOverrides((o) => ({ ...o, [c.key]: parseFloat(e.target.value) }))} className="flex-1 accent-primary" />
                <span className="w-12 text-right tabular-nums">{c.value}°</span>
                {c.value !== c.dflt && (
                  <button type="button" className="underline" onClick={() => setAngleOverrides((o) => { const n = { ...o }; delete n[c.key]; return n; })}>reset</button>
                )}
              </label>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
