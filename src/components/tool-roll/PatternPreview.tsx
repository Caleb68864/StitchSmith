import { useRef, useState, useCallback, useEffect, type WheelEvent, type MouseEvent } from 'react';
import { ZoomIn, ZoomOut, Maximize2, Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ToolRollLayout, ToolRollSettings } from '../../generators/tool-roll/types.js';
import { FullPatternSvg } from '../svg/FullPatternSvg.js';

interface PatternPreviewProps {
  layout: ToolRollLayout;
  settings: ToolRollSettings;
  onToggleTileGrid?: () => void;
}

interface Transform {
  x: number;
  y: number;
  scale: number;
}

const MIN_SCALE = 0.05;
const MAX_SCALE = 10;
const ZOOM_FACTOR = 1.15;

export function PatternPreview({ layout, settings, onToggleTileGrid }: PatternPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [transform, setTransform] = useState<Transform>({ x: 0, y: 0, scale: 1 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef<{ x: number; y: number; tx: number; ty: number } | null>(null);

  // Fit-to-screen on first render or when layout changes
  const fitToScreen = useCallback(() => {
    if (!containerRef.current) return;
    const { clientWidth: cw, clientHeight: ch } = containerRef.current;
    const scaleX = cw / layout.patternWidth;
    const scaleY = ch / layout.patternHeight;
    const scale = Math.min(scaleX, scaleY) * 0.9;
    const x = (cw - layout.patternWidth * scale) / 2;
    const y = (ch - layout.patternHeight * scale) / 2;
    setTransform({ x, y, scale });
  }, [layout.patternWidth, layout.patternHeight]);

  useEffect(() => {
    fitToScreen();
  }, [fitToScreen]);

  const handleWheel = useCallback((e: WheelEvent<HTMLDivElement>) => {
    e.preventDefault();
    const delta = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
    setTransform(prev => {
      const rect = containerRef.current?.getBoundingClientRect();
      if (!rect) return prev;
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const newScale = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev.scale * delta));
      const scaleDiff = newScale / prev.scale;
      return {
        scale: newScale,
        x: mx - (mx - prev.x) * scaleDiff,
        y: my - (my - prev.y) * scaleDiff,
      };
    });
  }, []);

  const handleMouseDown = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, tx: transform.x, ty: transform.y };
  }, [transform]);

  const handleMouseMove = useCallback((e: MouseEvent<HTMLDivElement>) => {
    if (!dragging || !dragStart.current) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setTransform(prev => ({ ...prev, x: dragStart.current!.tx + dx, y: dragStart.current!.ty + dy }));
  }, [dragging]);

  const handleMouseUp = useCallback(() => {
    setDragging(false);
    dragStart.current = null;
  }, []);

  const zoomIn = () => setTransform(prev => ({
    ...prev,
    scale: Math.min(MAX_SCALE, prev.scale * ZOOM_FACTOR),
  }));

  const zoomOut = () => setTransform(prev => ({
    ...prev,
    scale: Math.max(MIN_SCALE, prev.scale / ZOOM_FACTOR),
  }));

  return (
    <div className="rounded border border-border bg-muted/20 overflow-hidden flex flex-col" style={{ height: 400 }}>
      {/* Toolbar */}
      <div className="flex items-center gap-1 px-2 py-1 border-b border-border bg-background shrink-0">
        <span className="text-xs text-muted-foreground mr-auto">Pattern Preview</span>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={zoomIn} title="Zoom in">
          <ZoomIn className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={zoomOut} title="Zoom out">
          <ZoomOut className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={fitToScreen} title="Fit to screen">
          <Maximize2 className="h-3 w-3" />
        </Button>
        {onToggleTileGrid && (
          <Button
            variant={settings.showTileGrid ? 'secondary' : 'ghost'}
            size="sm"
            className="h-6 w-6 p-0"
            onClick={onToggleTileGrid}
            title="Toggle tile grid"
          >
            <Grid className="h-3 w-3" />
          </Button>
        )}
        <span className="text-xs text-muted-foreground ml-1">{Math.round(transform.scale * 100)}%</span>
      </div>

      {/* Canvas */}
      <div
        ref={containerRef}
        className="flex-1 overflow-hidden relative"
        style={{ cursor: dragging ? 'grabbing' : 'grab' }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          style={{
            position: 'absolute',
            transformOrigin: '0 0',
            transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
            pointerEvents: 'none',
          }}
        >
          <FullPatternSvg layout={layout} settings={settings} />
        </div>
      </div>
    </div>
  );
}
