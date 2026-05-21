import { Download, FileJson, Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ToolRollLayout, ToolRollProject } from '../../generators/tool-roll/types.js';

interface ExportPanelProps {
  layout: ToolRollLayout | null;
  project: ToolRollProject;
  onExportSvg: () => void;
  onExportJson: () => void;
  onExportPrintableHtml?: () => void;
}

export function ExportPanel({
  layout,
  project: _project,
  onExportSvg,
  onExportJson,
  onExportPrintableHtml,
}: ExportPanelProps) {
  return (
    <div className="rounded border border-border p-3 space-y-2">
      <h2 className="text-xs font-semibold">Export</h2>
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={layout === null}
          onClick={onExportSvg}
          title="Download the full pattern as a single real-dimension SVG. Best for printing on a copy-shop plotter or opening in vector software."
        >
          <Download className="h-3 w-3 mr-2" />
          Export full SVG
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={layout === null}
          onClick={onExportPrintableHtml}
          title="Download a self-contained HTML file with one page per tile. Open in a browser, set scaling to 100%, and print to tile the pattern across multiple sheets."
        >
          <Printer className="h-3 w-3 mr-2" />
          Export tiled printable HTML
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={onExportJson}
          title="Download the project as JSON. Re-import later to restore tools and settings."
        >
          <FileJson className="h-3 w-3 mr-2" />
          Export project JSON
        </Button>
      </div>
      {layout === null && (
        <p className="text-xs text-muted-foreground">Add tools to enable SVG and print export.</p>
      )}
    </div>
  );
}
