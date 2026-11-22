import { useMemo } from 'react';
import type { UseWindShirtProjectReturn } from '../../state/useWindShirtProject.js';
import { validateInputs, buildPattern } from '../../generators/wind-shirt/index.js';
import { WindShirtSettingsPanel } from './WindShirtSettingsPanel.js';
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

type WindShirtPageProps = Pick<UseWindShirtProjectReturn, 'project' | 'updateInputs' | 'resetProject' | 'importProject'>;
const FIELD_LABELS: Record<string, string> = {
  chest: 'Chest', waist: 'Waist', hip: 'Hip', neck: 'Neck', bicep: 'Bicep', wrist: 'Wrist', nape_to_waist: 'Nape to waist', scye_depth: 'Scye depth (nape to armpit level)', waist_to_hip: 'Waist to hip', shoulder_width: 'Shoulder width (across the back)', arm_length: 'Arm length (shoulder to wrist)', ease_chest: 'Chest ease', ease_waist: 'Waist ease', ease_hip: 'Hip ease', ease_neck: 'Neck ease', ease_bicep: 'Bicep ease', ease_wrist: 'Wrist ease', shoulder_drop: 'Shoulder drop', cap_ease: 'Cap ease', hem_depth: 'Hem depth', cuff_channel: 'Cuff channel', elastic_pct: 'Cuff elastic', zip_length: 'Neck zipper', binding_width: 'Neck binding', fabric_width: 'Fabric width', seam_allowance: 'Seam allowance', body: 'Body',
};
const IN = 25.4;
const inch = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');

export function WindShirtPage({ project, updateInputs, resetProject, importProject }: WindShirtPageProps) {
  const validation = useMemo(() => validateInputs(project.inputs), [project.inputs]);
  const errors = useMemo(() => { const out: Record<string, string> = {}; if (!validation.ok) for (const e of validation.errors) out[e.field] = e.message; return out; }, [validation]);
  const hasErrors = !validation.ok;
  const built = useMemo(() => { if (hasErrors) return null; try { const r = buildPattern(project.inputs); return r.ok ? r.value : null; } catch { return null; } }, [project.inputs, hasErrors]);
  const steps = built?.steps ?? [];
  const warnings = useMemo<UiWarning[]>(() => (built?.warnings ?? []).map((w) => ({ id: w.id, severity: w.severity, message: w.message, field: w.field })), [built]);
  function handleReset() { if (window.confirm('Reset will discard all changes and restore default Wind Shirt settings. Continue?')) resetProject(); }
  function handleImport(jsonText: string) { importProject(parseProjectJson<typeof project>(jsonText, 'wind-shirt')); }
  function handleExport() { downloadProjectJson(project); }
  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Wind Shirt Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Wind Shirt project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={<WindShirtSettingsPanel inputs={project.inputs} errors={errors} onChange={updateInputs} />}
      preview={
        <PreviewTabs
          pattern={<PatternPreview inputs={project.inputs} hasErrors={hasErrors} />}
          assembly={null}
          unavailableReason="No 3D check yet for the shirt."
        />
      }
      sidebar={
        <>
          <WarningsPanel warnings={warnings} />
          <PatternEngineLegend />
          <ExportPanel inputs={project.inputs} project={project} hasErrors={hasErrors} />
          {built && (
            <DerivedNumbers rows={[
              { label: 'Armhole / cap', value: <>{inch(built.seams.armhole)}" armhole, {inch(built.seams.cap)}" cap ({inch(built.seams.cap - built.seams.armhole)}" ease)</> },
              { label: 'Shoulder seam', value: <>{inch(built.seams.shoulder[0])}"</> },
              { label: 'Side seam', value: <>{inch(built.seams.side[0])}"</> },
              { label: 'Neckline', value: <>{inch(built.seams.neckline)}" (the binding sews to it)</> },
            ]} />
          )}
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
