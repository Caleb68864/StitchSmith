import { lazy, Suspense, useEffect, useState } from 'react';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import type { SeamSpec } from '../../lib/cloth-engine/sim.js';
import type { PiecePlacement } from '../../lib/fold-engine/index.js';

export type { SeamSpec };

export interface FoldObjectBase {
  /** Piece whose root region the object stands on. */
  pieceId: string;
  /** Centre of the object's base in that piece's flat pattern coordinates (mm). */
  point: { x: number; y: number };
  /** Unit direction, in flat pattern coordinates, along which the object's height extends. */
  direction: { x: number; y: number };
}

export interface FoldObject {
  /** Object placed inside the folded piece (mm): width across, depth out of the plane, height along `base.direction`. */
  width: number;
  depth: number;
  height: number;
  label?: string;
  /**
   * `box` (default) is a block of the contents. `torso` is a body form (`torsoForm` in the cloth
   * engine) standing at `at` with +y up and chest facing +z; width/depth/height then mean chest
   * width, chest depth and torso length, and `torso` carries the rest.
   */
  shape?: 'box' | 'torso';
  torso?: { shoulderWidth: number; neckRadius: number };
  /** Absolute scene position of the object's base centre (waist for a torso). Overrides `base`. */
  at?: [number, number, number];
  /** Where the object stands. Without it the object is centred on the first piece's root region. */
  base?: FoldObjectBase;
  /**
   * Which part of the host panel the cloth simulation holds still. `root` (default) pins the
   * whole root region — right when the other faces are hinged regions of the same piece.
   * `footprint` pins only the area under the object's back face, for two-panel bags whose
   * host panel must wrap half the depth round to the side and bottom seams (boxed corners).
   */
  pin?: 'root' | 'footprint';
}

export type { PiecePlacement };

export interface FoldPreview3DProps {
  pattern: Pattern;
  object?: FoldObject;
  /** Optional per-piece placements so separate pieces can be shown assembled (e.g. a card face over its back). */
  placements?: Record<string, PiecePlacement>;
  /**
   * Seams to sew in the cloth simulation (Stage 3): matched stitch lines in flat
   * pattern coordinates, including closures (lid tip to face) as short seams.
   */
  seams?: SeamSpec[];
  /** Cloth vertices held still: every vertex of `pieceId` within `radius` of flat `point`. */
  pins?: { pieceId: string; point: { x: number; y: number }; radius: number }[];
  /** Fold progress 0–1 to start at. Default 1 (folded). */
  initialProgress?: number;
  height?: number;
}

const Viewer = lazy(() =>
  import('./FoldViewer.js').then((m) => ({ default: m.FoldViewer })),
);

function webglAvailable(): boolean {
  if (typeof window === 'undefined') return false;
  if (typeof (window as { WebGLRenderingContext?: unknown }).WebGLRenderingContext === 'undefined') return false;
  try {
    const c = document.createElement('canvas');
    return !!(c.getContext('webgl2') || c.getContext('webgl'));
  } catch {
    return false;
  }
}

/**
 * Rigid fold preview (roadmap Stage 1): folds every piece along its fold
 * lines in 3D so lid reach, wing depth and object fit can be seen before any
 * fabric is cut. Three.js and the viewer load lazily and only when WebGL is
 * available, so this costs nothing on the main bundle or in jsdom.
 */
export function FoldPreview3D(props: FoldPreview3DProps) {
  const [supported, setSupported] = useState<boolean | null>(null);
  useEffect(() => { setSupported(webglAvailable()); }, []);

  return (
    <div className="rounded border border-border bg-card p-3 space-y-2" data-testid="fold-preview-3d">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-semibold">3D fold preview</h3>
        <span className="text-xs text-muted-foreground">rigid panels — no pucker or stretch</span>
      </div>
      {supported === false && (
        <p className="text-xs text-muted-foreground">
          3D preview needs WebGL, which this browser does not provide.
        </p>
      )}
      {supported && (
        <Suspense fallback={<div className="h-48 flex items-center justify-center text-xs text-muted-foreground">Loading 3D viewer…</div>}>
          <Viewer {...props} />
        </Suspense>
      )}
    </div>
  );
}
