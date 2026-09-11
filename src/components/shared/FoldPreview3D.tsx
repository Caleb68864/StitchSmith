import { lazy, Suspense, useEffect, useState } from 'react';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';

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
  /** Where the object stands. Without it the object is centred on the first piece's root region. */
  base?: FoldObjectBase;
}

/** Per-piece placement in the 3D scene, in flat pattern mm before folding (dz is applied after). */
export interface PiecePlacement {
  dx?: number;
  dy?: number;
  dz?: number;
  /** Root the piece's hinge tree at this flat point instead of its label. */
  rootPoint?: { x: number; y: number };
  /** Show this piece even when it has no folds (strips are hidden by default). */
  keep?: boolean;
}

export interface FoldPreview3DProps {
  pattern: Pattern;
  object?: FoldObject;
  /** Optional per-piece placements so separate pieces can be shown assembled (e.g. a card face over its back). */
  placements?: Record<string, PiecePlacement>;
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
