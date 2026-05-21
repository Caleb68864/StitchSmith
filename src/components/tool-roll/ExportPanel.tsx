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
        >
          <Printer className="h-3 w-3 mr-2" />
          Export tiled printable HTML
        </Button>
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          onClick={onExportJson}
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
