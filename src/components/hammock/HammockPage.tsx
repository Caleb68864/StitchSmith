import { useMemo } from 'react';
import type { UseHammockProjectReturn } from '../../state/useHammockProject.js';
import { validateInputs, buildPattern } from '../../generators/hammock/index.js';
import { HammockSettingsPanel } from './HammockSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { PatternEngineLegend } from '../shared/PatternEngineLegend.js';
import { ConstructionSteps } from '../shared/ConstructionSteps.js';
import { PatternPageShell } from '../shared/PatternPageShell.js';
import { parseProjectJson, downloadProjectJson } from '../../export/projectEnvelopeIO.js';
import { ValidationBanner } from '../shared/ValidationBanner.js';
import { WarningsPanel, type UiWarning } from '../shared/WarningsPanel.js';
import { DerivedNumbers } from '../shared/warnings/DerivedNumbers.js';
import { PreviewTabs } from '../shared/PreviewTabs.js';

type HammockPageProps = Pick<UseHammockProjectReturn, 'project' | 'updateInputs' | 'resetProject' | 'importProject'>;
const FIELD_LABELS: Record<string, string> = {
  end_style: 'Gathered ends', side_edge: 'Long sides', length: 'Length', width: 'Width', fabric_width: 'Fabric width',
  side_hem_depth: 'Side hem depth', channel_depth: 'Channel depth', whip_tail: 'Whip tail', hem_fold: 'Hem',
  ridgeline_pct: 'Structural ridgeline', seam_allowance: 'Seam allowance', occupant_weight: 'Occupant weight', fabric_rating: 'Fabric rating',
};
const IN = 25.4;
const inch = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');

export function HammockPage({ project, updateInputs, resetProject, importProject }: HammockPageProps) {
  const validation = useMemo(() => validateInputs(project.inputs), [project.inputs]);
  const errors = useMemo(() => { const out: Record<string, string> = {}; if (!validation.ok) for (const e of validation.errors) out[e.field] = e.message; return out; }, [validation]);
  const hasErrors = !validation.ok;
  const built = useMemo(() => { if (hasErrors) return null; try { const r = buildPattern(project.inputs); return r.ok ? r.value : null; } catch { return null; } }, [project.inputs, hasErrors]);
  const steps = built?.steps ?? [];
  const warnings = useMemo<UiWarning[]>(() => (built?.warnings ?? []).map((w) => ({ id: w.id, severity: w.severity, message: w.message, field: w.field })), [built]);
  const r = built?.resolved;
  function handleReset() { if (window.confirm('Reset will discard all changes and restore default Hammock settings. Continue?')) resetProject(); }
  function handleImport(jsonText: string) { importProject(parseProjectJson<typeof project>(jsonText, 'hammock')); }
  function handleExport() { downloadProjectJson(project); }
  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Hammock Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Hammock project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={<HammockSettingsPanel inputs={project.inputs} errors={errors} onChange={updateInputs} />}
      preview={
        <PreviewTabs
          pattern={<PatternPreview inputs={project.inputs} hasErrors={hasErrors} />}
          assembly={null}
          unavailableReason="No 3D check yet: the cloth engine cannot gather a whole end into one point, so a hanging hammock is not simulated."
        />
      }
      sidebar={
        <>
          <WarningsPanel warnings={warnings} />
          <PatternEngineLegend />
          <ExportPanel inputs={project.inputs} project={project} hasErrors={hasErrors} />
          {r && (
            <DerivedNumbers rows={[
              { label: 'Body cut', value: <>{inch(r.cut_length)} × {inch(r.cut_width)}" ({r.end_style === 'channel' ? 'channels' : 'whip tails'}{r.side_edge === 'hem' ? ' and side hems' : ''} included)</> },
              { label: 'Fabric', value: <>{inch(r.fabric_length)}" of {inch(r.fabric_width)}" fabric{r.fabric_trim > 1e-6 ? `, ${inch(r.fabric_trim)}" left across` : ''}</> },
              { label: 'Ends', value: r.end_style === 'channel' ? <>{inch(r.channel_depth)}" channel, {inch(r.end_allowance)}" of fabric each end</> : <>{inch(r.whip_tail)}" whip tail, {inch(r.end_allowance)}" of fabric each end</> },
              { label: 'Ridgeline', value: <>{inch(r.ridgeline_length)}" eye to eye ({r.ridgeline_pct} % of {inch(r.length)}")</> },
            ]} />
          )}
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
