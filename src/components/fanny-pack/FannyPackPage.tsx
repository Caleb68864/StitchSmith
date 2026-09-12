import { useMemo } from 'react';
import type { UseFannyPackProjectReturn } from '../../state/useFannyPackProject.js';
import { validateInputs, buildPattern, fannyPackAssembly } from '../../generators/fanny-pack/index.js';
import { FannyPackSettingsPanel } from './FannyPackSettingsPanel.js';
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

type FannyPackPageProps = Pick<UseFannyPackProjectReturn, 'project' | 'updateInputs' | 'resetProject' | 'importProject'>;
const FIELD_LABELS: Record<string, string> = {
  width: 'Width', height: 'Height', depth: 'Depth', seam_allowance: 'Seam allowance', lid_drop_target: 'Lid drop', lid_angle_deg: 'Lid angle', lid_extension: 'Zipper panel extension',
  zipper_lip: 'Zipper lip', bottom_grommets: 'Grommets', belt_webbing: 'Belt webbing', belt_min: 'Shortest belt setting', belt_max: 'Longest belt setting',
};
const IN = 25.4;
const inch = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');

export function FannyPackPage({ project, updateInputs, resetProject, importProject }: FannyPackPageProps) {
  const validation = useMemo(() => validateInputs(project.inputs), [project.inputs]);
  const errors = useMemo(() => { const out: Record<string, string> = {}; if (!validation.ok) for (const e of validation.errors) out[e.field] = e.message; return out; }, [validation]);
  const hasErrors = !validation.ok;
  const built = useMemo(() => { if (hasErrors) return null; try { const r = buildPattern(project.inputs); return r.ok ? r.value : null; } catch { return null; } }, [project.inputs, hasErrors]);
  const steps = built?.steps ?? [];
  const warnings = useMemo<UiWarning[]>(() => (built?.warnings ?? []).map((w) => ({ id: w.id, severity: w.severity, message: w.message, field: w.field })), [built]);
  const assembly = useMemo(() => { if (!built) return null; try { return fannyPackAssembly(built.pieces, built.resolved); } catch { return null; } }, [built]);
  const pattern3d = useMemo<Pattern | null>(() => (built ? { id: 'fanny-pack', name: 'Fanny Pack', pieces: assembly?.pieces ?? built.pieces } : null), [built, assembly]);
  const r = built?.resolved;
  function handleReset() { if (window.confirm('Reset will discard all changes and restore default Fanny Pack settings. Continue?')) resetProject(); }
  function handleImport(jsonText: string) { importProject(parseProjectJson<typeof project>(jsonText, 'fanny-pack')); }
  function handleExport() { downloadProjectJson(project); }
  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Fanny Pack Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Fanny Pack project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={<FannyPackSettingsPanel inputs={project.inputs} errors={errors} onChange={updateInputs} />}
      preview={
        <PreviewTabs
          pattern={<PatternPreview inputs={project.inputs} hasErrors={hasErrors} />}
          assembly={pattern3d && assembly ? <FoldPreview3D pattern={pattern3d} object={assembly.object} placements={assembly.placements} seams={assembly.seams} initialSimulate height={560} /> : null}
          unavailableReason="The 3D check shows the bag zipped closed round its contents; the lid drop is a cut-list rule, not simulated."
        />
      }
      sidebar={
        <>
          <WarningsPanel warnings={warnings} />
          <PatternEngineLegend />
          <ExportPanel inputs={project.inputs} project={project} hasErrors={hasErrors} />
{r && (
            <DerivedNumbers rows={[
        { label: 'Panels', value: <>{inch(r.panel_cut_width)} × {inch(r.panel_cut_height)}" cut, ×2 ({r.volume_l.toFixed(1)} L)</> },
        { label: 'Zipper panel', value: <>{inch(r.zipper_panel_cut_length)} × {inch(r.zipper_half_cut_height)}" cut, ×2 halves; runs {inch(r.lid_extension)}" down each side{r.lid_extension_overridden ? ' (override)' : ` (heuristic for ${r.lid_drop_target.replace('_', ' ')})`}</> },
        { label: 'Rising gusset', value: <>{inch(r.rising_gusset_cut_length)} × {inch(r.gusset_cut_height)}" cut; sides rise {inch(r.rising_side)}"</> },
        { label: 'Zipper', value: <>{inch(r.zipper_length)}" coil, non-locking slider{r.edge_tape_length > 0 ? `; ${inch(r.edge_tape_length)}" edge tape` : ''}</> },
        { label: 'Belt', value: <>{r.belt_webbing}" webbing cut {inch(r.belt_cut_length)}" for {inch(r.belt_min)}–{inch(r.belt_max)}"</> },
        ...(r.drawbridge_limiter ? [{ label: 'Cord loops', value: <>{inch(r.drawbridge_cord_length)}" of 550 each side</> }] : []),
        ...(r.bottom_grommets > 0 ? [{ label: 'Grommets', value: <>{r.bottom_grommets} on the bottom at {r.grommet_positions.map(inch).join('", ')}" from the left corner</> }] : []),
            ]} />
          )}
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
