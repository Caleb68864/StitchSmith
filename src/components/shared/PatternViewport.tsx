import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface Props {
  /** Inline SVG string to render. Mutually exclusive with `children`. */
  svg?: string;
  /** React content (used by Tool Roll's FullPatternSvg). */
  children?: ReactNode;
  /** Header text (e.g. "Pattern Preview", or piece counts). */
  header?: ReactNode;
  /** Extra toolbar buttons rendered to the left of zoom controls. */
  toolbarExtras?: ReactNode;
  /** Viewport height in px. */
  height?: number;
  /** Pass-through key — when it changes, the viewport refits. */
  fitKey?: string | number;
}

const MIN_SCALE = 0.05;
const MAX_SCALE = 10;
const ZOOM_FACTOR = 1.15;

/**
 * Shared zoom/pan/fit-to-screen viewport used by every pattern preview.
 *
 * Fit-to-screen reads the content wrapper's natural offsetWidth/offsetHeight
 * (which is invariant under CSS transform), so it works whether the inner
 * payload is an inline SVG string with mm-sized intrinsic dimensions or a
 * React component (Tool Roll's FullPatternSvg) that renders at mm × 3.78 px.
 */
export function PatternViewport({
  svg,
  children,
  header,
  toolbarExtras,
  height = 480,
  fitKey,
}: Props) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);
  const [translate, setTranslate] = useState({ x: 0, y: 0 });
  const dragRef = useRef<{ startX: number; startY: number; baseX: number; baseY: number } | null>(null);

  const fitToScreen = useCallback(() => {
    const vp = viewportRef.current;
    const content = contentRef.current;
    if (!vp || !content) return;
    const cw = vp.clientWidth;
    const ch = vp.clientHeight;
    const naturalW = content.offsetWidth;
    const naturalH = content.offsetHeight;
    if (cw === 0 || ch === 0 || naturalW === 0 || naturalH === 0) return;
    const s = Math.min(cw / naturalW, ch / naturalH) * 0.92;
    const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, s));
    setScale(next);
    setTranslate({
      x: (cw - naturalW * next) / 2,
      y: (ch - naturalH * next) / 2,
    });
  }, []);

  // Auto-fit when the content key changes (e.g. new pattern build).
  useLayoutEffect(() => {
    // Defer to next frame so the new SVG has been measured.
    const id = requestAnimationFrame(() => fitToScreen());
    return () => cancelAnimationFrame(id);
  }, [fitToScreen, fitKey, svg]);

  // Refit on container resize.
  useEffect(() => {
    const vp = viewportRef.current;
    if (!vp || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => fitToScreen());
    ro.observe(vp);
    return () => ro.disconnect();
  }, [fitToScreen]);

  // Non-passive wheel listener so we can preventDefault and zoom under cursor.
  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const factor = e.deltaY < 0 ? ZOOM_FACTOR : 1 / ZOOM_FACTOR;
      setScale((prev) => {
        const next = Math.max(MIN_SCALE, Math.min(MAX_SCALE, prev * factor));
        const ratio = next / prev;
        setTranslate((t) => ({
          x: cx - ratio * (cx - t.x),
          y: cy - ratio * (cy - t.y),
        }));
        return next;
      });
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (e.button !== 0) return;
    dragRef.current = { startX: e.clientX, startY: e.clientY, baseX: translate.x, baseY: translate.y };
  };
  const handleMouseMove = (e: React.MouseEvent) => {
    const d = dragRef.current;
    if (!d) return;
    setTranslate({ x: d.baseX + (e.clientX - d.startX), y: d.baseY + (e.clientY - d.startY) });
  };
  const handleMouseUp = () => { dragRef.current = null; };

  const zoomIn = () => setScale((s) => Math.min(MAX_SCALE, s * ZOOM_FACTOR));
  const zoomOut = () => setScale((s) => Math.max(MIN_SCALE, s / ZOOM_FACTOR));

  return (
    <div className="rounded border border-border bg-white dark:bg-gray-900 relative overflow-hidden">
      <div className="absolute top-2 right-2 z-10 flex gap-1 bg-white/90 dark:bg-gray-900/90 backdrop-blur rounded border border-border p-1 shadow-sm">
        {toolbarExtras}
        {toolbarExtras && <span className="w-px bg-border self-stretch mx-0.5" aria-hidden />}
        <Button variant="ghost" size="sm" onClick={zoomOut} className="h-7 w-7 p-0" title="Zoom out (or scroll down)">
          <ZoomOut className="h-3.5 w-3.5" />
        </Button>
        <span className="text-xs text-muted-foreground self-center w-12 text-center tabular-nums">
          {Math.round(scale * 100)}%
        </span>
        <Button variant="ghost" size="sm" onClick={zoomIn} className="h-7 w-7 p-0" title="Zoom in (or scroll up)">
          <ZoomIn className="h-3.5 w-3.5" />
        </Button>
        <Button variant="ghost" size="sm" onClick={fitToScreen} className="h-7 w-7 p-0" title="Fit to screen">
          <Maximize2 className="h-3.5 w-3.5" />
        </Button>
      </div>

      {header && (
        <div className="absolute top-2 left-2 z-10 text-xs text-muted-foreground bg-white/80 dark:bg-gray-900/80 backdrop-blur rounded px-2 py-1 max-w-[60%] truncate">
          {header}
        </div>
      )}

      <div
        ref={viewportRef}
        className="overflow-hidden relative"
        style={{ height, cursor: dragRef.current ? 'grabbing' : 'grab', touchAction: 'none' }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={contentRef}
          className="absolute top-0 left-0 select-none"
          style={{
            transform: `translate(${translate.x}px, ${translate.y}px) scale(${scale})`,
            transformOrigin: '0 0',
            pointerEvents: 'none',
          }}
          {...(svg !== undefined
            ? { dangerouslySetInnerHTML: { __html: svg } }
            : { children })}
        />
      </div>
    </div>
  );
}
