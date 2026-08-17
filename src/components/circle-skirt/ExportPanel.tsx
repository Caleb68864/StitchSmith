import { useState } from 'react';
import { Download, Printer, FileCode, List, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { CircleSkirtInputs } from '../../generators/circle-skirt/types.js';
import type { CircleSkirtProject } from '../../state/useCircleSkirtProject.js';
import { buildPattern } from '../../generators/circle-skirt/index.js';
import { buildBom } from '../../generators/circle-skirt/index.js';
import { patternToSvg } from '../../lib/pattern-engine/exports/svg.js';
import {
  loadPdfExporter,
  loadDxfExporter,
  loadTiledHtmlExporter,
} from '../../lib/pattern-engine/exports/lazy.js';
import { downloadTextFile } from '../../utils/download.js';
import { CutListTable } from './CutListTable.js';
import type { BomRow } from '../../generators/circle-skirt/types.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';

interface Props {
  inputs: CircleSkirtInputs;
  project: CircleSkirtProject;
  hasErrors: boolean;
}

export function ExportPanel({ inputs, project, hasErrors }: Props) {
  const [showCutList, setShowCutList] = useState(false);
  const [bomData, setBomData] = useState<BomRow[] | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dxfLoading, setDxfLoading] = useState(false);
  const [tiledLoading, setTiledLoading] = useState(false);

  function getPattern(): Pattern | null {
    if (hasErrors) return null;
    try {
      const r = buildPattern(inputs);
      return { id: 'circle-skirt', name: project.projectName, pieces: r.pieces };
    } catch {
      return null;
    }
  }

  function handleSvg() {
    const pattern = getPattern();
    if (!pattern) return;
    const svg = patternToSvg(pattern, {
      defaultSeamAllowance: inputs.seam_allowance ?? 15,
      showLabels: true,
    });
    downloadTextFile(`${project.projectName}.svg`, svg, 'image/svg+xml');
  }

  async function handleTiledHtml() {
    const pattern = getPattern();
    if (!pattern) return;
    setTiledLoading(true);
    try {
      const mod = await loadTiledHtmlExporter();
      const html = mod.patternToTiledHtml(pattern);
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
    const pattern = getPattern();
    if (!pattern) return;
    setPdfLoading(true);
    try {
      const mod = await loadPdfExporter();
      const pdf = await mod.exportPatternToPdf(pattern, {
        defaultSeamAllowance: inputs.seam_allowance ?? 15,
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
    const pattern = getPattern();
    if (!pattern) return;
    setDxfLoading(true);
    try {
      const mod = await loadDxfExporter();
      const dxf = mod.exportPatternToDxf(pattern);
      downloadTextFile(`${project.projectName}.dxf`, dxf, 'application/dxf');
    } finally {
      setDxfLoading(false);
    }
  }

  function handleToggleCutList() {
    if (hasErrors) return;
    const bom = buildBom(inputs);
    setBomData(bom);
    setShowCutList(v => !v);
  }

  const disabled = hasErrors;

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

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={disabled}
          onClick={handleToggleCutList}
          title="Toggle cut list / BOM table."
        >
          <List className="h-3 w-3 mr-2" />
          {showCutList ? 'Hide Cut List' : 'Cut List'}
        </Button>

        {showCutList && bomData && (
          <div className="rounded border border-border p-2 bg-muted/20">
            <CutListTable bom={bomData} />
          </div>
        )}

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={disabled}
          onClick={() => {}}
          title="Assembly instructions (coming soon)."
        >
          <BookOpen className="h-3 w-3 mr-2" />
          Instructions
        </Button>
      </div>

      {disabled && (
        <p className="text-xs text-muted-foreground">
          Fix validation errors to enable exports.
        </p>
      )}
    </div>
  );
}
