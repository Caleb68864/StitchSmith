import { useMemo, useState } from 'react';
import type { UseTriZipProjectReturn } from '../../state/useTriZipProject.js';
import { validateInputs } from '../../generators/tri-zip-backpack/inputs.js';
import { buildPattern } from '../../generators/tri-zip-backpack/buildPattern.js';
import { getPreset } from '../../generators/tri-zip-backpack/stylePresets.js';
import { TriZipSettingsPanel } from './TriZipSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { TriZipLegend } from './Legend.js';
import { ConstructionSteps } from '../shared/ConstructionSteps.js';
import { PatternPageShell } from '../shared/PatternPageShell.js';
import { parseProjectJson, downloadProjectJson } from '../../export/projectEnvelopeIO.js';
import { ValidationBanner } from '../shared/ValidationBanner.js';

type TriZipPageProps = Pick<
  UseTriZipProjectReturn,
  'project' | 'updateInputs' | 'resetProject' | 'importProject'
>;

const FIELD_LABELS: Record<string, string> = {
  height: 'Height',
  width: 'Width',
  depth: 'Depth',
  y_split_height_percent: 'Y-split height',
  center_panel_width_percent: 'Center panel width',
  seam_allowance: 'Seam allowance',
  hem_allowance: 'Hem allowance',
};

function deriveErrors(inputs: UseTriZipProjectReturn['project']['inputs']): Record<string, string> {
  const errors: Record<string, string> = {};
  const { height, width, depth, units } = inputs;
  const toMm = (v: number) => units === 'in' ? v * 25.4 : v;
  if (!isFinite(height) || toMm(height) <= 0) errors['height'] = 'Must be a positive number';
  if (!isFinite(width) || toMm(width) <= 0) errors['width'] = 'Must be a positive number';
  if (!isFinite(depth) || toMm(depth) <= 0) errors['depth'] = 'Must be a positive number';
  const yp = inputs.y_split_height_percent;
  if (yp !== undefined && (yp < 1 || yp > 99)) errors['y_split_height_percent'] = 'Must be between 1 and 99';
  const cp = inputs.center_panel_width_percent;
  if (cp !== undefined && (cp < 1 || cp > 99)) errors['center_panel_width_percent'] = 'Must be between 1 and 99';
  if (inputs.seam_allowance !== undefined && (!isFinite(inputs.seam_allowance) || inputs.seam_allowance < 0)) {
    errors['seam_allowance'] = 'Must be 0 or greater';
  }
  if (inputs.hem_allowance !== undefined && (!isFinite(inputs.hem_allowance) || inputs.hem_allowance < 0)) {
    errors['hem_allowance'] = 'Must be 0 or greater';
  }
  return errors;
}

export function TriZipPage({ project, updateInputs, resetProject, importProject }: TriZipPageProps) {
  const [topHandleLength, setTopHandleLength] = useState(100);
  const [showLabels, setShowLabels] = useState(true);

  const errors = useMemo(() => deriveErrors(project.inputs), [project.inputs]);
  const hasErrors = Object.keys(errors).length > 0;

  const engineValid = useMemo(() => {
    if (hasErrors) return false;
    const r = validateInputs(project.inputs);
    return r.ok;
  }, [project.inputs, hasErrors]);

  const steps = useMemo(() => {
    if (!engineValid) return [];
    const preset = getPreset(project.inputs.stylePreset);
    const r = buildPattern(project.inputs, preset);
    return r.ok ? r.value.steps : [];
  }, [project.inputs, engineValid]);

  function handleReset() {
    if (window.confirm('Reset will discard all changes and restore default Tri-Zip settings. This cannot be undone — continue?')) {
      resetProject();
    }
  }

  function handleImport(jsonText: string) {
    const parsed = parseProjectJson<typeof project>(jsonText, 'tri-zip-backpack');
    importProject(parsed);
  }

  function handleExport() {
    downloadProjectJson(project);
  }

  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Tri-Zip Backpack Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Tri-Zip project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={
        <TriZipSettingsPanel
          inputs={project.inputs}
          errors={errors}
          topHandleLength={topHandleLength}
          onChange={updateInputs}
          onTopHandleLengthChange={setTopHandleLength}
        />
      }
      preview={
        <PatternPreview
          inputs={project.inputs}
          hasErrors={!engineValid}
          showLabels={showLabels}
          onShowLabelsChange={setShowLabels}
        />
      }
      sidebar={
        <>
          <TriZipLegend />
          <ExportPanel
            inputs={project.inputs}
            project={project}
            hasErrors={!engineValid}
            showLabels={showLabels}
            onImportProject={importProject}
          />
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
