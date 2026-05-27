import { useMemo, useState } from 'react';
import type { UseTriZipProjectReturn } from '../../state/useTriZipProject.js';
import { validateInputs } from '../../generators/tri-zip-backpack/inputs.js';
import { TriZipSettingsPanel } from './TriZipSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { TriZipLegend } from './Legend.js';

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

  if (!isFinite(height) || toMm(height) <= 0) {
    errors['height'] = 'Must be a positive number';
  }
  if (!isFinite(width) || toMm(width) <= 0) {
    errors['width'] = 'Must be a positive number';
  }
  if (!isFinite(depth) || toMm(depth) <= 0) {
    errors['depth'] = 'Must be a positive number';
  }

  const yp = inputs.y_split_height_percent;
  if (yp !== undefined && (yp < 1 || yp > 99)) {
    errors['y_split_height_percent'] = 'Must be between 1 and 99';
  }
  const cp = inputs.center_panel_width_percent;
  if (cp !== undefined && (cp < 1 || cp > 99)) {
    errors['center_panel_width_percent'] = 'Must be between 1 and 99';
  }

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

  // Additional engine-level validation check
  const engineValid = useMemo(() => {
    if (hasErrors) return false;
    const r = validateInputs(project.inputs);
    return r.ok;
  }, [project.inputs, hasErrors]);

  function handleReset() {
    if (window.confirm('Reset will discard all changes and restore default Tri-Zip settings. This cannot be undone — continue?')) {
      resetProject();
    }
  }

  return (
    <div className="flex flex-col gap-4 max-w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold">{project.projectName}</h1>
          <p className="text-xs text-muted-foreground">Tri-Zip Backpack Generator</p>
        </div>
        <button
          onClick={handleReset}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          Reset
        </button>
      </div>

      <div className="flex flex-col md:flex-row gap-4 items-start">
        <div className="w-full md:w-80 md:shrink-0">
          <TriZipSettingsPanel
            inputs={project.inputs}
            errors={errors}
            topHandleLength={topHandleLength}
            onChange={updateInputs}
            onTopHandleLengthChange={setTopHandleLength}
          />
        </div>

        <div className="w-full md:flex-1 md:min-w-0 space-y-3">
          <PatternPreview
            inputs={project.inputs}
            hasErrors={!engineValid}
            showLabels={showLabels}
            onShowLabelsChange={setShowLabels}
          />
          <TriZipLegend />

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
            showLabels={showLabels}
            onImportProject={importProject}
          />
        </div>
      </div>
    </div>
  );
}
