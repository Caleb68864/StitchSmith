import { useMemo, useRef, useState, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BookCoverProjectInputs } from '../../state/useBookCoverProject.js';
import { buildPattern } from '../../generators/book-cover/index.js';
import { patternToSvg } from '../../lib/pattern-engine/exports/svg.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';

interface Props {
  inputs: BookCoverProjectInputs;
  hasErrors: boolean;
}

const MIN_SCALE = 0.1;
const MAX_SCALE = 8;

export function PatternPreview({ inputs, hasErrors }: Props) {
  const result = useMemo<{ svg: string; pieceCount: number; buildError: string | null } | null>(() => {
    if (hasErrors) return null;
    try {
      const r = buildPattern(inputs);
      if (!r.ok) return { svg: '', pieceCount: 0, buildError: r.error.message };
      const pattern: Pattern = {
        id: 'book-cover',
        name: 'Book Cover',
        pieces: r.value.pieces,
      };
      const svg = patternToSvg(pattern, {
        defaultSeamAllowance: inputs.seam_allowance ?? 9.5,
        showLabels: true,
      });
      return { svg, pieceCount: r.value.pieces.length, buildError: null };
    } catch (e) {
      return { svg: '', pieceCount: 0, buildError: (e as Error).message };
    }
  }, [inputs, hasErrors]);

  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const reset = useCallback(() => {
    setScale(1);
    setTranslate({ x: 0, y: 0 });
  }, []);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const viewport = viewportRef.current;
    if (!viewport) return;
    const rect = viewport.getBoundingClientRect();
    const cx = e.clientX - rect.left;
    const cy = e.clientY - rect.top;
    const factor = e.deltaY < 0 ? 1.15 : 1 / 1.15;
    setScale((prevScale) => {
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, prevScale * factor));
      const ratio = next / prevScale;
      setTranslate((t) => ({
        x: cx - ratio * (cx - t.x),
        y: cy - ratio * (cy - t.y),
      }));
      return next;
    });
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: translate.x, baseY: translate.y };
  }, [translate]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setTranslate({ x: d.baseX + (e.clientX - d.startX), y: d.baseY + (e.clientY - d.startY) });
  }, []);

  const handleMouseUp = useCallback(() => { dragRef.current = null; }, []);

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, s * 1.25));
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, s / 1.25));

  if (!result) {
    return (
      <div
        data-testid="pattern-preview-placeholder"
        className="rounded border border-dashed border-border p-6 flex items-center justify-center bg-muted/20 min-h-48"
      >
        <p className="text-xs text-muted-foreground">
          Fix the validation errors to preview the pattern.
        </p>
      </div>
    );
  }

  if (result.buildError) {
    return (
      <div className="rounded border border-destructive/50 bg-destructive/5 p-4 space-y-1">
        <p className="text-xs font-semibold text-destructive">Pattern build failed</p>
        <p className="text-xs text-destructive">{result.buildError}</p>
      </div>
    );
  }

  return (
    <div className="space-y-2" data-testid="pattern-preview-region">
      <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
        <span>
          <span className="font-medium text-foreground">{result.pieceCount}</span> piece type
          {result.pieceCount === 1 ? '' : 's'}
        </span>
        <span>SA: {inputs.seam_allowance ?? 9.5} mm</span>
      </div>
      <div className="rounded border border-border bg-white relative">
        <div className="absolute top-2 right-2 z-10 flex gap-1 bg-white/90 backdrop-blur rounded border border-border p-1 shadow-sm">
          <Button variant="ghost" size="sm" onClick={zoomOut} className="h-7 w-7 p-0" title="Zoom out">
            <ZoomOut className="h-3.5 w-3.5" />
          </Button>
          <span className="text-xs text-muted-foreground self-center w-12 text-center tabular-nums">
            {Math.round(scale * 100)}%
          </span>
          <Button variant="ghost" size="sm" onClick={zoomIn} className="h-7 w-7 p-0" title="Zoom in">
            <ZoomIn className="h-3.5 w-3.5" />
          </Button>
          <Button variant="ghost" size="sm" onClick={reset} className="h-7 w-7 p-0" title="Reset view">
            <Maximize2 className="h-3.5 w-3.5" />
          </Button>
        </div>
        <div
          ref={viewportRef}
          className="overflow-hidden"
          style={{ height: 480, cursor: dragRef.current ? 'grabbing' : 'grab', touchAction: 'none' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <div
            className="pattern-preview-svg select-none"
            dangerouslySetInnerHTML={{ __html: result.svg }}
            style={{
              transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
              transformOrigin: '0 0',
              pointerEvents: 'none',
            }}
          />
        </div>
      </div>
    </div>
  );
}
