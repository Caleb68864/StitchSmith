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
import { DerivedNumbers } from '../shared/warnings/DerivedNumbers.js';
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
          assembly={pattern3d && assembly ? <FoldPreview3D pattern={pattern3d} object={assembly.object} placements={assembly.placements} seams={assembly.seams} pins={assembly.pins} initialSimulate height={560} /> : null}
          unavailableReason="The 3D check assembles the cell front; a blank panel has nothing to sew up."
        />
      }
      sidebar={
        <>
          <WarningsPanel warnings={warnings} />
          <PatternEngineLegend />
          <ExportPanel inputs={project.inputs} project={project} hasErrors={hasErrors} />
{r && (
            <DerivedNumbers rows={[
        { label: 'Panel', value: <>{inch(r.panel_width)} × {inch(r.panel_height)}"{r.split_front ? ` per half, ${inch(r.total_front_width)}" across the front` : ''}</> },
        ...(r.pocket_set === 'mag_cells' ? [{ label: 'Cells', value: <>{r.cell_count} × {inch(r.cell_span)}" = {inch(r.mag_span)}"; face {inch(r.face_per_cell)}" per cell, pucker {inch(r.pucker_per_side)}"/side</> }] : []),
        ...(r.pocket_set === 'stacked_cells' ? [
      { label: 'Stack', value: <>{r.cell_count} × {r.cells_deep} = {r.cell_count * r.cells_deep} mags; rear cell {inch(r.rear_cell_width)}" (depth + {inch(r.stack_ease)}"), front marks {inch(r.front_cell_mark)}"</> },
      { label: 'Depth', value: <>{inch(r.stack_depth)}" stack; pouch {inch(r.pouch_height)}" tall ({Math.round(r.coverage * 100)} %); {inch(r.mag_exposed_height)}" of mag proud</> },
      { label: 'Retention', value: <>{r.grommet_count} grommets in {inch(r.cradle_length)}" cradles, {r.cord_count} cords, {r.pull_tab_count} {r.split_pull ? 'split' : 'plain'} pulls; ≈ {Math.round(r.loaded_weight_lb)} lb loaded</> },
    ] : []),
        { label: 'Width used', value: <>{inch(r.width_needed)}" of {inch(r.panel_width)}"</> },
        { label: 'Interior loop', value: <>3 × {inch(r.internal_velcro_length)}"</> },
        { label: 'Shoulder buckles', value: <>{inch(r.buckle_edge_offset)}" in from each edge, {inch(r.buckle_spacing)}" apart</> },
        { label: 'Side PALS', value: <>{r.side_pals_columns} column{r.side_pals_columns === 1 ? '' : 's'} × {r.side_pals_rows} rows each end</> },
            ]} />
          )}
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
