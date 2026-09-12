import { useState } from 'react';
import { Download, Printer, FileCode, List, BookOpen, Layers } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { ExportAdapter } from './exportAdapter.js';
import { patternToSvg, patternToSvgByMaterial } from '../../../lib/pattern-engine/exports/svg.js';
import { exportCutList, exportCutListCsv, type ExportCutList } from '../../../lib/pattern-engine/exports/cutList.js';
import { loadPdfExporter, loadDxfExporter, loadTiledHtmlExporter } from '../../../lib/pattern-engine/exports/lazy.js';
import { renderHtml } from '../../../lib/pattern-engine/instructions/compile.js';
import { runExport, printOrDownloadHtml } from '../runExport.js';
import { downloadTextFile, downloadBlob } from '../../../utils/download.js';
import { escapeHtml } from '../../../utils/escapeHtml.js';
import { EngineCutListTable } from './EngineCutListTable.js';
import { SimpleBomTable, StructuredBomTable } from './BomTables.js';

interface Props {
  adapter: ExportAdapter;
  /** When the page owns the label toggle (Tri-Zip's preview button), pass it here. */
  showLabels?: boolean;
}

/**
 * One export panel for every generator: SVG (with label and annotation
 * toggles), per-material cut sheets, tiled print HTML, PDF, DXF, cut list
 * (engine cut list + generator BOM, CSV) and the assembly instructions.
 *
 * Per-material cut sheets download as ONE printable HTML page with a heading
 * and an inline SVG per material rather than several SVG files: browsers
 * block or prompt on multi-file downloads, and one page prints straight to
 * the cutting bench with foam, mesh and webbing on their own sheets.
 */
export function PatternExportPanel({ adapter, showLabels: showLabelsProp }: Props) {
  const [showCutList, setShowCutList] = useState(false);
  const [cutList, setCutList] = useState<ExportCutList | null>(null);
  const [labelsState, setLabelsState] = useState(true);
  const [annotations, setAnnotations] = useState(true);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [dxfLoading, setDxfLoading] = useState(false);
  const [tiledLoading, setTiledLoading] = useState(false);
  const showLabels = showLabelsProp ?? labelsState;
  const disabled = adapter.hasErrors;
  const name = adapter.projectName;

  function pattern() {
    if (adapter.hasErrors) return null;
    try {
      const p = adapter.buildPattern();
      return p ? { ...p, name: p.name || name } : null;
    } catch {
      return null;
    }
  }
  const svgOptions = () => ({ defaultSeamAllowance: adapter.defaultSeamAllowance, showLabels, showAnnotations: annotations });

  function handleSvg() {
    const p = pattern();
    if (!p) return;
    downloadTextFile(`${name}.svg`, patternToSvg(p, svgOptions()), 'image/svg+xml');
  }

  function handleMaterialSheets() {
    const p = pattern();
    if (!p) return;
    const sheets = patternToSvgByMaterial(p, svgOptions());
    const sections = Object.entries(sheets)
      .map(([material, svg]) => `<section class="sheet"><h2>${escapeHtml(material)}</h2>${svg}</section>`)
      .join('\n');
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(name)} — cut sheets by material</title>` +
      `<style>body{font-family:sans-serif;margin:16px}h1{font-size:18px}h2{font-size:14px;margin:0 0 8px}.sheet{page-break-after:always;margin-bottom:24px}svg{max-width:100%;height:auto;border:1px solid #ddd}</style>` +
      `</head><body><h1>${escapeHtml(name)} — cut sheets by material</h1><p>One sheet per material at 1 mm = 1 unit; print each at 100 % or send the matching SVG to the cutter.</p>${sections}</body></html>`;
    downloadTextFile(`${name}-cut-sheets.html`, html, 'text/html');
  }

  async function handleTiledHtml() {
    const p = pattern();
    if (!p) return;
    await runExport('Tiled HTML', setTiledLoading, async () => {
      const mod = await loadTiledHtmlExporter();
      printOrDownloadHtml(mod.patternToTiledHtml(p, { title: name }), `${name}-tiled.html`);
    });
  }

  async function handlePdf() {
    const p = pattern();
    if (!p) return;
    await runExport('PDF', setPdfLoading, async () => {
      const mod = await loadPdfExporter();
      const pdf = await mod.exportPatternToPdf(p, { defaultSeamAllowance: adapter.defaultSeamAllowance });
      downloadBlob(`${name}.pdf`, new Blob([pdf], { type: 'application/pdf' }));
    });
  }

  async function handleDxf() {
    const p = pattern();
    if (!p) return;
    await runExport('DXF', setDxfLoading, async () => {
      const mod = await loadDxfExporter();
      downloadTextFile(`${name}.dxf`, mod.exportPatternToDxf(p), 'application/dxf');
    });
  }

  function engineCutList() {
    const p = pattern();
    if (!p) return null;
    let hardware: ReturnType<NonNullable<ExportAdapter['hardware']>> = [];
    try { hardware = adapter.hardware?.() ?? []; } catch { hardware = []; }
    return exportCutList(p, [], hardware, { defaultSeamAllowance: adapter.defaultSeamAllowance });
  }

  function handleCutList() {
    if (disabled) return;
    setCutList(engineCutList());
    setShowCutList((v) => !v);
  }

  function handleCutListCsv() {
    const cl = engineCutList();
    if (!cl) return;
    downloadTextFile(`${name}-cut-list.csv`, exportCutListCsv(cl, []), 'text/csv');
  }

  function handleInstructions() {
    if (disabled || !adapter.steps) return;
    let steps;
    try { steps = adapter.steps(); } catch { return; }
    if (!steps) return;
    const result = renderHtml(steps);
    if (!result.ok) return;
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>${escapeHtml(name)} — Assembly Instructions</title></head><body>${result.value}</body></html>`;
    downloadTextFile(`${name}-instructions.html`, html, 'text/html');
  }

  function renderBom() {
    if (adapter.renderBom) return adapter.renderBom();
    if (!adapter.bom) return null;
    let bom;
    try { bom = adapter.bom(); } catch { bom = null; }
    if (!bom) return null;
    return Array.isArray(bom) ? <SimpleBomTable bom={bom} /> : <StructuredBomTable bom={bom} />;
  }

  const btn = 'w-full justify-start text-xs';

  return (
    <div className="rounded border border-border p-3 space-y-2" data-testid="export-panel">
      <h2 className="text-xs font-semibold">Export</h2>

      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {showLabelsProp === undefined && (
          <label className="flex items-center gap-1">
            <input type="checkbox" checked={labelsState} onChange={(e) => setLabelsState(e.target.checked)} />
            Piece labels
          </label>
        )}
        <label className="flex items-center gap-1">
          <input type="checkbox" checked={annotations} onChange={(e) => setAnnotations(e.target.checked)} />
          Notes and grain arrows
        </label>
      </div>

      <div className="flex flex-col gap-2">
        <Button variant="outline" size="sm" className={btn} disabled={disabled} onClick={handleSvg} title="Download the pattern as a full-dimension SVG file.">
          <Download className="h-3 w-3 mr-2" />
          SVG
        </Button>
        <Button variant="outline" size="sm" className={btn} disabled={disabled} onClick={handleMaterialSheets} title="One printable page with a separate sheet per material (fabric, foam, mesh, webbing).">
          <Layers className="h-3 w-3 mr-2" />
          Cut sheets by material
        </Button>
        <Button variant="outline" size="sm" className={btn} disabled={disabled || tiledLoading} onClick={handleTiledHtml} title="Open tiled layout for home printing.">
          <Printer className="h-3 w-3 mr-2" />
          {tiledLoading ? 'Loading…' : 'Tiled printable HTML'}
        </Button>
        <Button variant="outline" size="sm" className={btn} disabled={disabled || pdfLoading} onClick={handlePdf} title="Download a PDF file.">
          <FileCode className="h-3 w-3 mr-2" />
          {pdfLoading ? 'Loading…' : 'PDF'}
        </Button>
        <Button variant="outline" size="sm" className={btn} disabled={disabled || dxfLoading} onClick={handleDxf} title="Download a DXF file for CNC cutting machines.">
          <FileCode className="h-3 w-3 mr-2" />
          {dxfLoading ? 'Loading…' : 'DXF'}
        </Button>

        <div className="flex gap-1">
          <Button variant="outline" size="sm" className="flex-1 justify-start text-xs" disabled={disabled} onClick={handleCutList} title="Toggle the cut list and bill of materials.">
            <List className="h-3 w-3 mr-2" />
            {showCutList ? 'Hide Cut List' : 'Cut List'}
          </Button>
          <Button variant="outline" size="sm" className="text-xs px-2" disabled={disabled} onClick={handleCutListCsv} title="Download the cut list as CSV.">
            CSV
          </Button>
        </div>

        {showCutList && (
          <div className="rounded border border-border p-2 bg-muted/20 space-y-4">
            {cutList && <EngineCutListTable cutList={cutList} />}
            {renderBom()}
          </div>
        )}

        {adapter.steps && (
          <Button variant="outline" size="sm" className={btn} disabled={disabled} onClick={handleInstructions} title="Download the assembly instructions as an HTML file.">
            <BookOpen className="h-3 w-3 mr-2" />
            Instructions
          </Button>
        )}
      </div>

      {disabled && <p className="text-xs text-muted-foreground">Fix validation errors to enable exports.</p>}
    </div>
  );
}
