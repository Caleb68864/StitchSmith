import { useState } from 'react';
import { Download, FileJson, FileText, Grid, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { BookCoverProjectInputs } from '../../state/useBookCoverProject.js';
import type { BookCoverProject } from '../../state/useBookCoverProject.js';
import { buildPattern } from '../../generators/book-cover/index.js';
import { patternToSvg } from '../../lib/pattern-engine/exports/svg.js';
import { downloadTextFile, downloadBlob } from '../../utils/download.js';
import { loadPdfExporter, loadDxfExporter, loadTiledHtmlExporter } from '../../lib/pattern-engine/exports/lazy.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import type { Bom } from '../../generators/book-cover/types.js';

interface Props {
  inputs: BookCoverProjectInputs;
  project: BookCoverProject;
  hasErrors: boolean;
}

function BomTable({ bom }: { bom: Bom }) {
  return (
    <div className="space-y-2 text-xs">
      {bom.materials.length > 0 && (
        <div>
          <p className="font-medium mb-1">Materials</p>
          {bom.materials.map((m, i) => (
            <p key={i} className="text-muted-foreground">
              {m.name}{m.widthMm ? ` (${m.widthMm}mm wide)` : ''}
            </p>
          ))}
        </div>
      )}
      {bom.hardware.length > 0 && (
        <div>
          <p className="font-medium mb-1">Hardware</p>
          {bom.hardware.map((h, i) => (
            <p key={i} className="text-muted-foreground">
              {h.name}: {h.quantity}
            </p>
          ))}
        </div>
      )}
      {bom.notes.length > 0 && (
        <div>
          <p className="font-medium mb-1">Notes</p>
          {bom.notes.map((n, i) => (
            <p key={i} className="text-muted-foreground">{n}</p>
          ))}
        </div>
      )}
    </div>
  );
}

export function ExportPanel({ inputs, project, hasErrors }: Props) {
  const [showCutList, setShowCutList] = useState(false);
  const [bomData, setBomData] = useState<Bom | null>(null);
  const [pdfBusy, setPdfBusy] = useState(false);
  const [dxfBusy, setDxfBusy] = useState(false);
  const [tiledBusy, setTiledBusy] = useState(false);

  function getResult() {
    if (hasErrors) return null;
    const r = buildPattern(inputs);
    if (!r.ok) return null;
    return r.value;
  }

  function makePattern(r: { pieces: Pattern['pieces'] }): Pattern {
    return { id: 'book-cover', name: project.projectName, pieces: r.pieces };
  }

  function handleSvg() {
    const r = getResult();
    if (!r) return;
    const svg = patternToSvg(makePattern(r), {
      defaultSeamAllowance: inputs.seam_allowance ?? 9.5,
      showLabels: true,
    });
    downloadTextFile(`${project.projectName}.svg`, svg, 'image/svg+xml');
  }

  function handleCutListJson() {
    const r = getResult();
    if (!r) return;
    const json = JSON.stringify(r.bom, null, 2);
    downloadTextFile(`${project.projectName}-cut-list.json`, json, 'application/json');
  }

  async function handlePdf() {
    const r = getResult();
    if (!r) return;
    setPdfBusy(true);
    try {
      const { exportPatternToPdf } = await loadPdfExporter();
      const blob = await exportPatternToPdf(makePattern(r), {
        defaultSeamAllowance: inputs.seam_allowance ?? 9.5,
      });
      downloadBlob(`${project.projectName}.pdf`, blob);
    } finally {
      setPdfBusy(false);
    }
  }

  async function handleDxf() {
    const r = getResult();
    if (!r) return;
    setDxfBusy(true);
    try {
      const { exportPatternToDxf } = await loadDxfExporter();
      const dxf = exportPatternToDxf(makePattern(r));
      downloadTextFile(`${project.projectName}.dxf`, dxf, 'application/dxf');
    } finally {
      setDxfBusy(false);
    }
  }

  async function handleTiledHtml() {
    const r = getResult();
    if (!r) return;
    setTiledBusy(true);
    try {
      const { patternToTiledHtml } = await loadTiledHtmlExporter();
      const html = patternToTiledHtml(makePattern(r), { title: project.projectName });
      downloadTextFile(`${project.projectName}-tiled.html`, html, 'text/html');
    } finally {
      setTiledBusy(false);
    }
  }

  function handleToggleCutList() {
    const r = getResult();
    if (!r) return;
    setBomData(r.bom);
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
          Download SVG
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={disabled || pdfBusy}
          onClick={handlePdf}
          title="Download the pattern as a print-ready PDF."
        >
          <FileText className="h-3 w-3 mr-2" />
          {pdfBusy ? 'Generating PDF…' : 'Download PDF'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={disabled || dxfBusy}
          onClick={handleDxf}
          title="Download the pattern as a DXF file for cutting machines."
        >
          <Download className="h-3 w-3 mr-2" />
          {dxfBusy ? 'Generating DXF…' : 'Download DXF'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={disabled || tiledBusy}
          onClick={handleTiledHtml}
          title="Download a tiled print layout as HTML."
        >
          <Grid className="h-3 w-3 mr-2" />
          {tiledBusy ? 'Generating…' : 'Download Tiled (HTML)'}
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={disabled}
          onClick={handleCutListJson}
          title="Download cut list as JSON."
        >
          <FileJson className="h-3 w-3 mr-2" />
          Download Cut List (JSON)
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={disabled}
          onClick={handleToggleCutList}
          title="Show cut list and BOM."
        >
          <List className="h-3 w-3 mr-2" />
          {showCutList ? 'Hide Cut List' : 'Show Cut List'}
        </Button>

        {showCutList && bomData && (
          <div className="rounded border border-border p-2 bg-muted/20">
            <BomTable bom={bomData} />
          </div>
        )}
      </div>

      {disabled && (
        <p className="text-xs text-muted-foreground">
          Fix validation errors to enable exports.
        </p>
      )}
    </div>
  );
}
