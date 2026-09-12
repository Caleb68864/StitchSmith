import { useMemo } from 'react';
import type { UseMicroRigProjectReturn } from '../../state/useMicroRigProject.js';
import { validateInputs, buildPattern, microRigAssembly } from '../../generators/micro-rig/index.js';
import { MicroRigSettingsPanel } from './MicroRigSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { PatternEngineLegend } from '../shared/PatternEngineLegend.js';
import { ConstructionSteps } from '../shared/ConstructionSteps.js';
import { PatternPageShell } from '../shared/PatternPageShell.js';
import { parseProjectJson, downloadProjectJson } from '../../export/projectEnvelopeIO.js';
import { ValidationBanner } from '../shared/ValidationBanner.js';
import { WarningsPanel, type UiWarning } from '../shared/WarningsPanel.js';
import { FoldPreview3D } from '../shared/FoldPreview3D.js';
import { PreviewTabs } from '../shared/PreviewTabs.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';

type MicroRigPageProps = Pick<UseMicroRigProjectReturn, 'project' | 'updateInputs' | 'resetProject' | 'importProject'>;

const FIELD_LABELS: Record<string, string> = {
  panel_width: 'Panel width', panel_height: 'Panel height', seam_allowance: 'Seam allowance', edge_margin: 'Edge margin',
  cell_count: 'Cells', cell_span: 'Cell span', face_per_cell: 'Face per cell', cell_height: 'Cell height', magazine_preset_id: 'Magazine',
  side_pals_columns: 'Side PALS columns', bottom_loop_count: 'Bottom loops', gap_width: 'Sternum gap', buckle_setback: 'Buckle setback',
};

const IN = 25.4;
const inch = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');

export function MicroRigPage({ project, updateInputs, resetProject, importProject }: MicroRigPageProps) {
  const validation = useMemo(() => validateInputs(project.inputs), [project.inputs]);
  const errors = useMemo(() => {
    const out: Record<string, string> = {};
    if (!validation.ok) for (const e of validation.errors) out[e.field] = e.message;
    return out;
  }, [validation]);
  const hasErrors = !validation.ok;
  const built = useMemo(() => {
    if (hasErrors) return null;
    try { const r = buildPattern(project.inputs); return r.ok ? r.value : null; } catch { return null; }
  }, [project.inputs, hasErrors]);
  const steps = built?.steps ?? [];
  const warnings = useMemo<UiWarning[]>(() => (built?.warnings ?? []).map((w) => ({ id: w.id, severity: w.severity, message: w.message, field: w.field })), [built]);
  const assembly = useMemo(() => {
    if (!built) return null;
    try { return microRigAssembly(built.pieces, built.resolved); } catch { return null; }
  }, [built]);
  const pattern3d = useMemo<Pattern | null>(() => (built ? { id: 'micro-rig', name: 'Micro Rig', pieces: assembly?.pieces ?? built.pieces } : null), [built, assembly]);
  const r = built?.resolved;

  function handleReset() { if (window.confirm('Reset will discard all changes and restore default Micro Rig settings. Continue?')) resetProject(); }
  function handleImport(jsonText: string) { importProject(parseProjectJson<typeof project>(jsonText, 'micro-rig')); }
  function handleExport() { downloadProjectJson(project); }

  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Micro Rig Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Micro Rig project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={<MicroRigSettingsPanel inputs={project.inputs} errors={errors} onChange={updateInputs} />}
      preview={
        <PreviewTabs
          pattern={<PatternPreview inputs={project.inputs} hasErrors={hasErrors} />}
          assembly={pattern3d && assembly ? <FoldPreview3D pattern={pattern3d} object={assembly.object} placements={assembly.placements} seams={assembly.seams} initialSimulate height={560} /> : null}
          unavailableReason="The 3D check assembles the mag-cell front; a blank panel has nothing to sew up."
        />
      }
      sidebar={
        <>
          <WarningsPanel warnings={warnings} />
          <PatternEngineLegend />
          <ExportPanel inputs={project.inputs} project={project} hasErrors={hasErrors} />
          {r && (
            <div className="rounded border border-border p-3 space-y-1 text-xs" data-testid="derived-numbers">
              <h2 className="font-semibold">Derived numbers</h2>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <span className="text-muted-foreground">Panel</span><span>{inch(r.panel_width)} × {inch(r.panel_height)}"{r.split_front ? ` per half, ${inch(r.total_front_width)}" across the front` : ''}</span>
                {r.pocket_set === 'mag_cells' && <><span className="text-muted-foreground">Cells</span><span>{r.cell_count} × {inch(r.cell_span)}" = {inch(r.mag_span)}"; face {inch(r.face_per_cell)}" per cell, pucker {inch(r.pucker_per_side)}"/side</span></>}
                <span className="text-muted-foreground">Width used</span><span>{inch(r.width_needed)}" of {inch(r.panel_width)}"</span>
                <span className="text-muted-foreground">Interior loop</span><span>3 × {inch(r.internal_velcro_length)}"</span>
                <span className="text-muted-foreground">Shoulder buckles</span><span>{inch(r.buckle_edge_offset)}" in from each edge, {inch(r.buckle_spacing)}" apart</span>
                <span className="text-muted-foreground">Side PALS</span><span>{r.side_pals_columns} column{r.side_pals_columns === 1 ? '' : 's'} × {r.side_pals_rows} rows each end</span>
              </div>
            </div>
          )}
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
