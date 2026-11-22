import { useMemo } from 'react';
import type { UseQuiltProjectReturn } from '../../state/useQuiltProject.js';
import { validateInputs, buildPattern } from '../../generators/quilt/index.js';
import { QuiltSettingsPanel } from './QuiltSettingsPanel.js';
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

type QuiltPageProps = Pick<UseQuiltProjectReturn, 'project' | 'updateInputs' | 'resetProject' | 'importProject'>;
const FIELD_LABELS: Record<string, string> = {
  construction: 'Chambers', footbox: 'Footbox', length: 'Length', shoulder_width: 'Shoulder width', foot_width: 'Foot width',
  footbox_length: 'Footbox length', fabric_width: 'Fabric width', loft: 'Loft', baffle_spacing: 'Chamber spacing',
  shell_differential: 'Shell differential', fill_power: 'Fill power', overstuff: 'Overstuff', seam_allowance: 'Seam allowance', kind: 'Quilt', end_channel: 'End channel', neck: 'Neck', neck_channel: 'Neck channel', pad_straps: 'Pad straps', pad_width: 'Pad width',
};
const IN = 25.4;
const inch = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');

export function QuiltPage({ project, updateInputs, resetProject, importProject }: QuiltPageProps) {
  const validation = useMemo(() => validateInputs(project.inputs), [project.inputs]);
  const errors = useMemo(() => { const out: Record<string, string> = {}; if (!validation.ok) for (const e of validation.errors) out[e.field] = e.message; return out; }, [validation]);
  const hasErrors = !validation.ok;
  const built = useMemo(() => { if (hasErrors) return null; try { const r = buildPattern(project.inputs); return r.ok ? r.value : null; } catch { return null; } }, [project.inputs, hasErrors]);
  const steps = built?.steps ?? [];
  const warnings = useMemo<UiWarning[]>(() => (built?.warnings ?? []).map((w) => ({ id: w.id, severity: w.severity, message: w.message, field: w.field })), [built]);
  const r = built?.resolved;
  function handleReset() { if (window.confirm('Reset will discard all changes and restore default Top Quilt settings. Continue?')) resetProject(); }
  function handleImport(jsonText: string) { importProject(parseProjectJson<typeof project>(jsonText, 'quilt')); }
  function handleExport() { downloadProjectJson(project); }
  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Top Quilt Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Top Quilt project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={<QuiltSettingsPanel inputs={project.inputs} errors={errors} onChange={updateInputs} />}
      preview={
        <PreviewTabs
          pattern={<PatternPreview inputs={project.inputs} hasErrors={hasErrors} />}
          assembly={null}
          unavailableReason="No 3D check yet: the cloth engine has no loft or fill model (the chambers would lie flat) and no lying body form to drape the quilt over."
        />
      }
      sidebar={
        <>
          <WarningsPanel warnings={warnings} />
          <PatternEngineLegend />
          <ExportPanel inputs={project.inputs} project={project} hasErrors={hasErrors} />
          {r && r.chambers && (
            <DerivedNumbers rows={[
              { label: 'Liner cut', value: <>{inch(r.liner_cut_width)} × {inch(r.cut_length)}" (seam allowance included)</> },
              { label: 'Shell cut', value: <>{inch(r.shell_cut_width)} × {inch(r.cut_length)}"{r.shell_differential > 0 ? ` (${r.shell_differential} % differential)` : ''}</> },
              { label: 'Chambers', value: <>{r.chambers.count} at {inch(r.chambers.pitch)}", {r.chambers.wallY.length} {r.construction === 'baffled' ? 'baffles' : 'stitch lines'}</> },
              { label: 'Fill', value: <>{Math.round(r.total_fill_g)} g ({(r.total_fill_g / 28.349523125).toFixed(1)} oz), {Math.round(r.chambers.chambers[0].fillG)} g head chamber to {Math.round(r.chambers.chambers[r.chambers.count - 1].fillG)} g foot</> },
              { label: 'Fabric', value: <>{inch(r.fabric_length)}" of {inch(r.fabric_width)}" fabric (shell and liner)</> },
              ...(r.footbox === 'zip' ? [{ label: 'Footbox zipper', value: <>{inch(r.zipper_length)}"</> }] : []),
            ]} />
          )}
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
