import { useMemo, useState } from 'react';
import { Tag, TagsIcon, StickyNote } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { Pattern } from '../../../lib/pattern-engine/graph/Pattern.js';
import { patternToSvg } from '../../../lib/pattern-engine/exports/svg.js';
import { PatternViewport } from '../PatternViewport.js';

export interface PatternPreviewProps {
  /** The built pattern, or null when it could not be built. */
  pattern: Pattern | null;
  /** Message when the build itself failed (shown in place of the drawing). */
  buildError?: string | null;
  /** Validation errors: show the placeholder instead of building. */
  hasErrors: boolean;
  /** Seam allowance (mm) drawn for pieces without per-edge allowances. */
  defaultSeamAllowance?: number;
  /** Seam allowance as the user sees it, e.g. `0.38"` or `10 mm`; omitted when not shown. */
  saLabel?: string;
  /** Page-owned label toggle (Tri-Zip); otherwise the preview owns its own. */
  showLabels?: boolean;
  onShowLabelsChange?: (v: boolean) => void;
  margin?: number;
  pieceGap?: number;
  /** Viewport height in px; matches the 3D tab so switching tabs does not jump. */
  height?: number;
}

/**
 * The shared pattern preview: renders a Pattern through the engine's SVG
 * exporter inside the zoom/pan viewport, with piece-label and annotation
 * toggles in the toolbar and the piece count in the header.
 */
export function PatternPreview({ pattern, buildError, hasErrors, defaultSeamAllowance = 0, saLabel, showLabels: labelsProp, onShowLabelsChange, margin, pieceGap, height = 560 }: PatternPreviewProps) {
  const [labelsState, setLabelsState] = useState(true);
  const [annotations, setAnnotations] = useState(true);
  const showLabels = labelsProp ?? labelsState;
  const setShowLabels = onShowLabelsChange ?? setLabelsState;

  const svg = useMemo(() => {
    if (hasErrors || !pattern) return '';
    try {
      return patternToSvg(pattern, { defaultSeamAllowance, showLabels, showAnnotations: annotations, margin, pieceGap });
    } catch {
      return '';
    }
  }, [pattern, hasErrors, defaultSeamAllowance, showLabels, annotations, margin, pieceGap]);

  if (hasErrors) {
    return (
      <div data-testid="pattern-preview-placeholder" className="rounded border border-dashed border-border p-6 flex items-center justify-center bg-muted/20 min-h-48">
        <p className="text-xs text-muted-foreground">Fix the validation errors to preview the pattern.</p>
      </div>
    );
  }
  if (buildError || !pattern) {
    return (
      <div className="rounded border border-destructive/50 bg-destructive/5 p-4 space-y-1">
        <p className="text-xs font-semibold text-destructive">Pattern build failed</p>
        <p className="text-xs text-destructive">{buildError ?? 'The generator returned no pattern.'}</p>
      </div>
    );
  }

  const pieceCount = pattern.pieces.length;
  const totalQuantity = pattern.pieces.reduce((s, p) => s + (p.quantity ?? 1), 0);
  const header = (
    <span data-testid="pattern-preview-region">
      <span className="font-medium text-gray-900">{pieceCount}</span> piece type{pieceCount === 1 ? '' : 's'}
      {totalQuantity !== pieceCount && <> · <span className="font-medium text-gray-900">{totalQuantity}</span> to cut</>}
      {saLabel && <span className="text-gray-500"> · SA {saLabel}</span>}
    </span>
  );
  const toolbarExtras = (
    <>
      <Button variant="ghost" size="sm" onClick={() => setShowLabels(!showLabels)} className={`h-7 w-7 p-0 hover:bg-gray-100 ${showLabels ? 'text-gray-900' : 'text-gray-400'}`} title={showLabels ? 'Hide piece labels' : 'Show piece labels'} aria-pressed={showLabels} aria-label="Piece labels">
        {showLabels ? <Tag className="h-3.5 w-3.5" /> : <TagsIcon className="h-3.5 w-3.5 opacity-40" />}
      </Button>
      <Button variant="ghost" size="sm" onClick={() => setAnnotations((v) => !v)} className={`h-7 w-7 p-0 hover:bg-gray-100 ${annotations ? 'text-gray-900' : 'text-gray-400'}`} title={annotations ? 'Hide notes and grain arrows' : 'Show notes and grain arrows'} aria-pressed={annotations} aria-label="Notes and grain arrows">
        <StickyNote className={`h-3.5 w-3.5 ${annotations ? '' : 'opacity-40'}`} />
      </Button>
    </>
  );
  return <PatternViewport svg={svg} header={header} toolbarExtras={toolbarExtras} fitKey={svg.length} height={height} />;
}
