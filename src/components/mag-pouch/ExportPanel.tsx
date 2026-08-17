import { useState } from 'react';
import { Download, Printer, FileCode, List, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { MagPouchInputs, MagPouchBuildResult } from '../../generators/mag-pouch/types.js';
import type { MagPouchProject } from '../../state/useMagPouchProject.js';
import { patternToSvg } from '../../lib/pattern-engine/exports/svg.js';
import { exportCutList, exportCutListCsv } from '../../lib/pattern-engine/exports/cutList.js';
import { renderHtml } from '../../lib/pattern-engine/instructions/compile.js';
import {
  loadPdfExporter,
  loadDxfExporter,
  loadTiledHtmlExporter,
} from '../../lib/pattern-engine/exports/lazy.js';
import { downloadTextFile } from '../../utils/download.js';
import { CutListTable } from './CutListTable.js';
import type { ExportCutList } from '../../lib/pattern-engine/exports/cutList.js';

interface Props {
  inputs: MagPouchInputs;
  project: MagPouchProject;
  result: MagPouchBuildResult | null;
  hasErrors: boolean;
  /** @deprecated PatternPageShell now owns project JSON I/O. Kept for back-compat with the page wiring. */
  onImportProject?: (p: MagPouchProject) => void;
}

export function ExportPanel({ inputs, project, result, hasErrors }: Props) {
  const [showCutList, setShowCutList] = useState(false);
  const [engineCutList, setEngineCutList] = useState<ExportCutList | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dxfLoading, setDxfLoading] = useState(false);
  const [tiledLoading, setTiledLoading] = useState(false);

  const disabled = hasErrors || !result;

  function handleSvg() {
    if (!result) return;
    const svg = patternToSvg(result.pattern, {
      defaultSeamAllowance: inputs.seamAllowance * 25.4,
      showLabels: true,
    });
    downloadTextFile(`${project.projectName}.svg`, svg, 'image/svg+xml');
  }

  async function handleTiledHtml() {
    if (!result) return;
    setTiledLoading(true);
    try {
      const mod = await loadTiledHtmlExporter();
      const html = mod.patternToTiledHtml(result.pattern);
      const win = window.open('about:blank', '_blank');
      if (win) {
        win.document.write(html);
        win.document.close();
        win.print();
      }
    } finally {
      setTiledLoading(false);
    }
  }

  async function handlePdf() {
    if (!result) return;
    setPdfLoading(true);
    try {
      const mod = await loadPdfExporter();
      const pdf = await mod.exportPatternToPdf(result.pattern, {
        defaultSeamAllowance: inputs.seamAllowance * 25.4,
      });
      const blob = new Blob([pdf], { type: 'application/pdf' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${project.projectName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } finally {
      setPdfLoading(false);
    }
  }

  async function handleDxf() {
    if (!result) return;
    setDxfLoading(true);
    try {
      const mod = await loadDxfExporter();
      const dxf = mod.exportPatternToDxf(result.pattern);
      downloadTextFile(`${project.projectName}.dxf`, dxf, 'application/dxf');
    } finally {
      setDxfLoading(false);
    }
  }

  function handleCutList() {
    if (!result) return;
    const cl = exportCutList(result.pattern, [], []);
    setEngineCutList(cl);
    setShowCutList(v => !v);
  }

  function handleCutListCsv() {
    if (!result) return;
    const cl = exportCutList(result.pattern, [], []);
    const csv = exportCutListCsv(cl, []);
    downloadTextFile(`${project.projectName}-cut-list.csv`, csv, 'text/csv');
  }

  function handleInstructions() {
    if (!result) return;
    const renderResult = renderHtml(result.steps);
    if (!renderResult.ok) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${project.projectName} — Assembly Instructions</title></head><body>${renderResult.value}</body></html>`;
    downloadTextFile(`${project.projectName}-instructions.html`, html, 'text/html');
  }


  return (
    <div className="rounded border border-border p-3 space-y-2">
      <h2 className="text-xs font-semibold">Export</h2>

      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={disabled}
          onClick={handleSvg}
          title="Download the pattern as a full-dimension SVG file."
        >
          <Download className="h-3 w-3 mr-2" />
          SVG
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={disabled || tiledLoading}
          onClick={handleTiledHtml}
          title="Open tiled layout for home printing."
        >
          <Printer className="h-3 w-3 mr-2" />
          {tiledLoading ? 'Loading…' : 'Tiled printable HTML'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={disabled || pdfLoading}
          onClick={handlePdf}
          title="Download a PDF file."
        >
          <FileCode className="h-3 w-3 mr-2" />
          {pdfLoading ? 'Loading…' : 'PDF'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={disabled || dxfLoading}
          onClick={handleDxf}
          title="Download a DXF file for CNC cutting machines."
        >
          <FileCode className="h-3 w-3 mr-2" />
          {dxfLoading ? 'Loading…' : 'DXF'}
        </Button>

        <div className="flex gap-1">
          <Button
            variant="outline"
            size="sm"
            className="flex-1 justify-start text-xs"
            disabled={disabled}
            onClick={handleCutList}
            title="Toggle cut list / BOM table."
          >
            <List className="h-3 w-3 mr-2" />
            Cut List
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="text-xs px-2"
            disabled={disabled}
            onClick={handleCutListCsv}
            title="Download cut list as CSV."
          >
            CSV
          </Button>
        </div>

        {showCutList && result && (
          <div className="rounded border border-border p-2 bg-muted/20">
            {engineCutList ? (
              <CutListTable
                bom={result.bom}
                cutPieces={engineCutList.byMaterial.map(m => ({
                  id: m.materialId,
                  name: m.materialId,
                  widthMm: Math.sqrt(m.totalAreaMm2),
                  sizeMm: Math.sqrt(m.totalAreaMm2),
                  quantity: m.pieces.length,
                }))}
              />
            ) : (
              <CutListTable bom={result.bom} />
            )}
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={disabled}
          onClick={handleInstructions}
          title="Download assembly instructions as HTML."
        >
          <BookOpen className="h-3 w-3 mr-2" />
          Instructions
        </Button>

        {/* Save / Import buttons removed — the page header (PatternPageShell)
            now owns project JSON I/O. Keeping them here duplicated the
            functionality and created two competing UIs. */}
      </div>

      {disabled && (
        <p className="text-xs text-muted-foreground">
          Fix validation errors to enable exports.
        </p>
      )}
    </div>
  );
}
