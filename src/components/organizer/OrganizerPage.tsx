import { useMemo } from 'react';
import type { UseOrganizerProjectReturn } from '../../state/useOrganizerProject.js';
import { validateInputs, buildPattern, organizerAssembly } from '../../generators/organizer/index.js';
import { OrganizerSettingsPanel } from './OrganizerSettingsPanel.js';
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

type OrganizerPageProps = Pick<UseOrganizerProjectReturn, 'project' | 'updateInputs' | 'resetProject' | 'importProject'>;
const FIELD_LABELS: Record<string, string> = {
  pouch_width: 'Pouch width', pocket_height: 'Pocket height', body_hem: 'Body hem', panel_hem: 'Panel hem', side_seam_allowance: 'Side seam allowance', side_fold: 'Side fold',
  panel_extra_width: 'Panel extra width', slot_widths: 'Pen slots', velcro_strip_count: 'Hook strips', velcro_strip_width: 'Strip width', velcro_strip_length: 'Strip length', velcro_gap: 'Velcro gap',
};
const IN = 25.4;
const inch = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');

export function OrganizerPage({ project, updateInputs, resetProject, importProject }: OrganizerPageProps) {
  const validation = useMemo(() => validateInputs(project.inputs), [project.inputs]);
  const errors = useMemo(() => { const out: Record<string, string> = {}; if (!validation.ok) for (const e of validation.errors) out[e.field] = e.message; return out; }, [validation]);
  const hasErrors = !validation.ok;
  const built = useMemo(() => { if (hasErrors) return null; try { const r = buildPattern(project.inputs); return r.ok ? r.value : null; } catch { return null; } }, [project.inputs, hasErrors]);
  const steps = built?.steps ?? [];
  const warnings = useMemo<UiWarning[]>(() => (built?.warnings ?? []).map((w) => ({ id: w.id, severity: w.severity, message: w.message, field: w.field })), [built]);
  const assembly = useMemo(() => { if (!built) return null; try { return organizerAssembly(built.pieces, built.resolved); } catch { return null; } }, [built]);
  const pattern3d = useMemo<Pattern | null>(() => (built ? { id: 'organizer', name: 'Organizer', pieces: assembly?.pieces ?? built.pieces } : null), [built, assembly]);
  const r = built?.resolved;
  function handleReset() { if (window.confirm('Reset will discard all changes and restore default Organizer settings. Continue?')) resetProject(); }
  function handleImport(jsonText: string) { importProject(parseProjectJson<typeof project>(jsonText, 'organizer')); }
  function handleExport() { downloadProjectJson(project); }
  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Tactical Organizer Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Organizer project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={<OrganizerSettingsPanel inputs={project.inputs} errors={errors} onChange={updateInputs} />}
      preview={
        <PreviewTabs
          pattern={<PatternPreview inputs={project.inputs} hasErrors={hasErrors} />}
          assembly={pattern3d && assembly ? <FoldPreview3D pattern={pattern3d} object={assembly.object} placements={assembly.placements} seams={assembly.seams} initialSimulate height={560} /> : null}
          unavailableReason="The 3D check assembles the single pouch; the bifold is not assembled."
        />
      }
      sidebar={
        <>
          <WarningsPanel warnings={warnings} />
          <PatternEngineLegend />
          <ExportPanel inputs={project.inputs} project={project} hasErrors={hasErrors} />
{r && (
            <DerivedNumbers rows={[
        { label: 'Body cut', value: <>{inch(r.body_cut_width)} × {inch(r.body_cut_length)}" (hems marked at {inch(r.body_hem_mark)}")</> },
        { label: 'Panel cut', value: <>{inch(r.panel_cut_width)} × {inch(r.panel_cut_height)}" (hem marked at {inch(r.panel_hem_mark)}")</> },
        { label: 'Bellows', value: <>flat centre {inch(r.panel_flat_center)}"; {inch(r.span_loss)}"/side bridges the body, {inch(r.bellows_depth)}" becomes depth</> },
        { label: 'Slots', value: <>{r.slot_widths.map(inch).join('", ')}", wide pocket {inch(r.wide_pocket_width)}" of {inch(r.interior_width)}" interior</> },
        { label: 'Back face', value: <>{inch(r.clear_width)} × {inch(r.clear_height)}" clear; Velcro block {inch(r.velcro_block_height)}" tall</> },
            ]} />
          )}
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
