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
  type FoldModel,
  type FoldedModel,
  type CavityReport,
} from '../../lib/fold-engine/index.js';
import type { FoldPreview3DProps, PiecePlacement } from './FoldPreview3D.js';

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
      entries.push({ model, offsetX: pl.dx ?? 0, offsetY: pl.dy ?? 0, offsetZ: pl.dz ?? 0, color: PALETTE[i % PALETTE.length] });
      return;
    }
    entries.push({ model, offsetX: x - bb.minX, offsetY: 0, offsetZ: 0, color: PALETTE[i % PALETTE.length] });
    x += bb.width + PIECE_GAP;
  });
  return entries;
}

function fmtMm(v: number | null): string {
  return v === null ? 'open' : `${Math.round(v)} mm`;
}

export function FoldViewer({ pattern, object, placements = {}, initialProgress = 1, height = 360 }: FoldPreview3DProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<{ scene: THREE.Scene; group: THREE.Group; renderer: THREE.WebGLRenderer; camera: THREE.PerspectiveCamera; controls: OrbitControls } | null>(null);
  const [progress, setProgress] = useState(initialProgress);
  const [showObject, setShowObject] = useState(true);
  const [showFlat, setShowFlat] = useState(false);
  const [angleOverrides, setAngleOverrides] = useState<Record<string, number>>({});
  const [allPieces, setAllPieces] = useState(false);
  const [cavity, setCavity] = useState<(CavityReport & { floor: number | null; above: number | null }) | null>(null);

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

    for (const entry of entries) {
      const angles = defaultFoldAngles(entry.model).map((a, i) => {
        const key = `${entry.model.pieceId}:${i}`;
        return key in angleOverrides ? angleOverrides[key] * DEG : a;
      });
      const raw = foldModel(entry.model, angles, showFlat ? 0 : progress);
      const shift = (v: [number, number, number]): [number, number, number] => [v[0] + entry.offsetX, v[1] - entry.offsetY, v[2] + entry.offsetZ];
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

    // Object box. Its base sits on the root region (which stays flat), so flat
    // pattern coordinates map straight to 3D: (x, −y, 0).
    let up = new THREE.Vector3(0, 1, 0);
    if (object && showObject && first) {
      const host = object.base ? entries.find((e) => e.model.pieceId === object.base!.pieceId) ?? first : first;
      const root = host.model.regions[host.model.root];
      const dirFlat = object.base?.direction ?? { x: 0, y: -1 };
      const dir3 = new THREE.Vector3(dirFlat.x, -dirFlat.y, 0).normalize();
      const base = object.base?.point ?? { x: root.centroid.x, y: Math.max(...root.poly.map((p) => p.y)) };
      const centre = new THREE.Vector3(base.x + host.offsetX, -base.y - host.offsetY, host.offsetZ + object.depth / 2 + 0.5).add(dir3.clone().multiplyScalar(object.height / 2));
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(object.width, object.height, object.depth),
        new THREE.MeshStandardMaterial({ color: 0x333333, transparent: true, opacity: 0.45, roughness: 0.6 }),
      );
      // BoxGeometry's height runs along +y; rotate about z so it runs along dir3.
      box.rotation.z = Math.atan2(dir3.y, dir3.x) - Math.PI / 2;
      box.position.copy(centre);
      group.add(box);
      const wire = new THREE.LineSegments(new THREE.EdgesGeometry(box.geometry), new THREE.LineBasicMaterial({ color: 0x111111 }));
      wire.rotation.copy(box.rotation);
      wire.position.copy(box.position);
      group.add(wire);
      up = dir3;
      // Stage 2: measure the cavity around the object with rays against the folded panels.
      if (!showFlat && progress >= 0.999) {
        const half: [number, number, number] = [object.width / 2, object.height / 2, object.depth / 2];
        // A rigid lid sweeps through the object instead of wrapping it, so measure across/depth
        // without any panel hanging off a lid fold, and only use the full model for the height axis.
        const noLid = foldedModels.map((fm, i) => withoutRegions(fm, regionsUnderFolds(entries[i].model, (f) => /lid|flap/i.test(`${f.label ?? ''} ${f.pathId}`))));
        const body = measureCavity(noLid, [centre.x, centre.y, centre.z], half);
        const full = measureCavity(foldedModels, [centre.x, centre.y, centre.z], half);
        // The object's height runs along dir3: the floor is behind it, "above" is ahead of it.
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
  }, [entries, progress, showObject, showFlat, angleOverrides, object, first]);

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
        {object && <label className="flex items-center gap-1"><input type="checkbox" checked={showObject} onChange={(e) => setShowObject(e.target.checked)} /> {object.label ?? 'object'}</label>}
        <span className="text-muted-foreground">drag to orbit, wheel to zoom</span>
      </div>
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
