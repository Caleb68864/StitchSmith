import { useMemo } from 'react';
import type { UseRollTopSackProjectReturn } from '../../state/useRollTopSackProject.js';
import { validateInputs } from '../../generators/roll-top-sack/inputs.js';
import { buildPattern } from '../../generators/roll-top-sack/index.js';
import { RollTopSackSettingsPanel } from './RollTopSackSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { PatternEngineLegend } from '../shared/PatternEngineLegend.js';
import { ConstructionSteps } from '../shared/ConstructionSteps.js';
import { PatternPageShell } from '../shared/PatternPageShell.js';
import { ValidationBanner } from '../shared/ValidationBanner.js';

type RollTopSackPageProps = Pick<
  UseRollTopSackProjectReturn,
  'project' | 'updateInputs' | 'resetProject' | 'importProject'
>;

const FIELD_LABELS: Record<string, string> = {
  bottom_length: 'Bottom Length',
  bottom_width: 'Bottom Width',
  height_when_rolled: 'Body Height',
  collar_height: 'Collar Height',
  seam_allowance: 'Seam Allowance',
};

function deriveErrors(inputs: UseRollTopSackProjectReturn['project']['inputs']): Record<string, string> {
  const errors: Record<string, string> = {};
  const { bottom_length, bottom_width, height_when_rolled, collar_height, units } = inputs;
  const toMm = (v: number) => units === 'in' ? v * 25.4 : v;
  if (bottom_length == null || !isFinite(toMm(bottom_length)) || toMm(bottom_length) <= 0) {
    errors['bottom_length'] = 'Must be a positive number';
  }
  if (bottom_width == null || !isFinite(toMm(bottom_width)) || toMm(bottom_width) <= 0) {
    errors['bottom_width'] = 'Must be a positive number';
  }
  if (height_when_rolled == null || !isFinite(toMm(height_when_rolled)) || toMm(height_when_rolled) <= 0) {
    errors['height_when_rolled'] = 'Must be a positive number';
  }
  if (collar_height !== undefined && collar_height !== null && (!isFinite(toMm(collar_height)) || toMm(collar_height) <= 0)) {
    errors['collar_height'] = 'Must be a positive number';
  }
  return errors;
}

export function RollTopSackPage({ project, updateInputs, resetProject }: RollTopSackPageProps) {
  const errors = useMemo(() => deriveErrors(project.inputs), [project.inputs]);
  const hasErrors = Object.keys(errors).length > 0;

  const engineValid = useMemo(() => {
    if (hasErrors) return false;
    const r = validateInputs(project.inputs);
    return r.ok;
  }, [project.inputs, hasErrors]);

  const steps = useMemo(() => {
    if (!engineValid) return [];
    const r = buildPattern(project.inputs);
    return r.ok ? r.value.steps : [];
  }, [project.inputs, engineValid]);

  function handleReset() {
    if (window.confirm('Reset will discard all changes and restore default Roll-Top Sack settings. Continue?')) {
      resetProject();
    }
  }

  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Roll-Top Stuff Sack Generator"
      onReset={handleReset}
      resetLabel="Reset"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={
        <RollTopSackSettingsPanel
          inputs={project.inputs}
          errors={errors}
          onChange={updateInputs}
        />
      }
      preview={<PatternPreview inputs={project.inputs} hasErrors={!engineValid} />}
      sidebar={
        <>
          <PatternEngineLegend />
          <ExportPanel
            inputs={project.inputs}
            project={project}
            hasErrors={!engineValid}
          />
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
