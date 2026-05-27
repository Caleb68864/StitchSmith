import { Grid } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ToolRollLayout, ToolRollSettings } from '../../generators/tool-roll/types.js';
import { FullPatternSvg } from '../svg/FullPatternSvg.js';
import { PatternViewport } from '../shared/PatternViewport.js';

interface PatternPreviewProps {
  layout: ToolRollLayout;
  settings: ToolRollSettings;
  onToggleTileGrid?: () => void;
}

export function PatternPreview({ layout, settings, onToggleTileGrid }: PatternPreviewProps) {
  const toolbarExtras = onToggleTileGrid ? (
    <Button
      variant={settings.showTileGrid ? 'secondary' : 'ghost'}
      size="sm"
      className="h-7 w-7 p-0"
      onClick={onToggleTileGrid}
      title="Toggle tile grid"
    >
      <Grid className="h-3.5 w-3.5" />
    </Button>
  ) : null;

  const header = (
    <span>
      <span className="font-medium text-foreground">{layout.pockets.length}</span> pocket
      {layout.pockets.length === 1 ? '' : 's'} · {layout.patternWidth.toFixed(0)} × {layout.patternHeight.toFixed(0)} mm
    </span>
  );

  return (
    <PatternViewport
      header={header}
      toolbarExtras={toolbarExtras}
      fitKey={`${layout.patternWidth}x${layout.patternHeight}-${layout.pockets.length}`}
      height={400}
    >
      <FullPatternSvg layout={layout} settings={settings} />
    </PatternViewport>
  );
}
