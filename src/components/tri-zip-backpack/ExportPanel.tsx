import { useState } from 'react';
import { Download, Printer, FileCode, List, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TriZipInputs } from '../../generators/tri-zip-backpack/types.js';
import type { TriZipProject } from '../../state/useTriZipProject.js';
import { buildPattern } from '../../generators/tri-zip-backpack/buildPattern.js';
import { getPreset } from '../../generators/tri-zip-backpack/stylePresets.js';
import { finalAssemblySteps } from '../../generators/tri-zip-backpack/steps.js';
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
  inputs: TriZipInputs;
  project: TriZipProject;
  hasErrors: boolean;
  showLabels?: boolean;
  /** @deprecated PatternPageShell now owns project JSON I/O. Kept for back-compat with the page wiring. */
  onImportProject?: (p: TriZipProject) => void;
}

export function ExportPanel({ inputs, project, hasErrors, showLabels = true }: Props) {
  const [showCutList, setShowCutList] = useState(false);
  const [cutListData, setCutListData] = useState<ExportCutList | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dxfLoading, setDxfLoading] = useState(false);
  const [tiledLoading, setTiledLoading] = useState(false);

  function getPattern() {
    if (hasErrors) return null;
    const preset = getPreset(inputs.stylePreset);
    const result = buildPattern(inputs, preset);
    if (!result.ok) return null;
    return result.value;
  }

  function handleSvg() {
    const r = getPattern();
    if (!r) return;
    const svg = patternToSvg(r, {
      defaultSeamAllowance: inputs.seam_allowance ?? 10,
      showLabels,
    });
    downloadTextFile(`${project.projectName}.svg`, svg, 'image/svg+xml');
  }

  async function handleTiledHtml() {
    const r = getPattern();
    if (!r) return;
    setTiledLoading(true);
    try {
      const mod = await loadTiledHtmlExporter();
      const html = mod.patternToTiledHtml(r);
      downloadTextFile(`${project.projectName}-tiled.html`, html, 'text/html');
    } finally {
      setTiledLoading(false);
    }
  }

  async function handlePdf() {
    const r = getPattern();
    if (!r) return;
    setPdfLoading(true);
    try {
      const mod = await loadPdfExporter();
      const pdf = await mod.exportPatternToPdf(r);
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
    const r = getPattern();
    if (!r) return;
    setDxfLoading(true);
    try {
      const mod = await loadDxfExporter();
      const dxf = mod.exportPatternToDxf(r);
      downloadTextFile(`${project.projectName}.dxf`, dxf, 'application/dxf');
    } finally {
      setDxfLoading(false);
    }
  }

  function handleCutList() {
    const r = getPattern();
    if (!r) return;
    const cl = exportCutList(r, [], []);
    setCutListData(cl);
    setShowCutList(v => !v);
  }

  function handleCutListCsv() {
    const r = getPattern();
    if (!r) return;
    const cl = exportCutList(r, [], []);
    const csv = exportCutListCsv(cl, []);
    downloadTextFile(`${project.projectName}-cut-list.csv`, csv, 'text/csv');
  }

  function handleInstructions() {
    const result = renderHtml(finalAssemblySteps());
    if (!result.ok) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${project.projectName} — Assembly Instructions</title></head><body>${result.value}</body></html>`;
    downloadTextFile(`${project.projectName}-instructions.html`, html, 'text/html');
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
          title="Download a tiled HTML file for home printing."
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
            title="Show a cut list and BOM table."
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

        {showCutList && cutListData && (
          <div className="rounded border border-border p-2 bg-muted/20">
            <CutListTable cutList={cutListData} />
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
