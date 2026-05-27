import { useMemo } from 'react';
import type { UseRollTopSackProjectReturn } from '../../state/useRollTopSackProject.js';
import { validateInputs } from '../../generators/roll-top-sack/inputs.js';
import { buildPattern } from '../../generators/roll-top-sack/index.js';
import { RollTopSackSettingsPanel } from './RollTopSackSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { PatternEngineLegend } from '../shared/PatternEngineLegend.js';
import { ConstructionSteps } from '../shared/ConstructionSteps.js';

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

  if (bottom_length === null || bottom_length === undefined || !isFinite(toMm(bottom_length)) || toMm(bottom_length) <= 0) {
    errors['bottom_length'] = 'Must be a positive number';
  }
  if (bottom_width === null || bottom_width === undefined || !isFinite(toMm(bottom_width)) || toMm(bottom_width) <= 0) {
    errors['bottom_width'] = 'Must be a positive number';
  }
  if (height_when_rolled === null || height_when_rolled === undefined || !isFinite(toMm(height_when_rolled)) || toMm(height_when_rolled) <= 0) {
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
    <div className="flex flex-col gap-4 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{project.projectName}</h1>
          <p className="text-xs text-muted-foreground">Roll-Top Stuff Sack Generator</p>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="w-full md:w-72 md:shrink-0">
          <RollTopSackSettingsPanel
            inputs={project.inputs}
            errors={errors}
            onChange={updateInputs}
          />
        </div>

        <div className="w-full md:flex-1 md:min-w-0 space-y-3">
          <PatternPreview
            inputs={project.inputs}
            hasErrors={!engineValid}
          />
          <PatternEngineLegend />
          {steps.length > 0 && <ConstructionSteps steps={steps} />}

          {hasErrors && (
            <div className="rounded border border-destructive/50 bg-destructive/5 p-3 space-y-1">
              <p className="text-xs font-semibold text-destructive">Fix these before exporting</p>
              {Object.entries(errors).map(([field, msg]) => (
                <p key={field} className="text-xs text-destructive">
                  <span className="font-medium">{FIELD_LABELS[field] ?? field}:</span> {msg}
                </p>
              ))}
            </div>
          )}
        </div>

        <div className="w-full md:w-64 md:shrink-0 space-y-3">
          <ExportPanel
            inputs={project.inputs}
            project={project}
            hasErrors={!engineValid}
          />
        </div>
      </div>
    </div>
  );
}
