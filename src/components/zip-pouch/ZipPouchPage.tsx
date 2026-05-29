import { useMemo } from 'react';
import type { UseZipPouchProjectReturn } from '../../state/useZipPouchProject.js';
import { validateInputs } from '../../generators/zip-pouch/inputs.js';
import { buildPattern } from '../../generators/zip-pouch/buildPattern.js';
import { ZipPouchSettingsPanel } from './ZipPouchSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { PatternEngineLegend } from '../shared/PatternEngineLegend.js';
import { ConstructionSteps } from '../shared/ConstructionSteps.js';
import { PatternPageShell } from '../shared/PatternPageShell.js';
import { parseProjectJson, downloadProjectJson } from '../../export/projectEnvelopeIO.js';
import { ValidationBanner } from '../shared/ValidationBanner.js';
import type { BuildPatternError } from '../../generators/zip-pouch/types.js';

type ZipPouchPageProps = Pick<
  UseZipPouchProjectReturn,
  'project' | 'updateInputs' | 'resetProject' | 'importProject'
>;

const FIELD_LABELS: Record<string, string> = {
  finished_length: 'Length',
  finished_width: 'Width',
  finished_depth: 'Depth',
  seam_allowance: 'Seam Allowance',
  zip_gauge: 'Zipper Gauge',
  grosgrain_width: 'Grosgrain Width',
};

function deriveErrors(errors: BuildPatternError[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const e of errors) {
    result[e.field] = e.message;
  }
  return result;
}

export function ZipPouchPage({ project, updateInputs, resetProject, importProject }: ZipPouchPageProps) {
  const validationResult = useMemo(() => validateInputs(project.inputs), [project.inputs]);
  const errors = useMemo(
    () => validationResult.ok ? {} : deriveErrors(validationResult.errors),
    [validationResult],
  );
  const hasErrors = !validationResult.ok;

  const steps = useMemo(() => {
    if (hasErrors) return [];
    const r = buildPattern(project.inputs);
    return r.ok ? r.value.steps : [];
  }, [project.inputs, hasErrors]);

  function handleReset() {
    if (window.confirm('Reset will discard all changes and restore default Zip Pouch settings. Continue?')) {
      resetProject();
    }
  }

  function handleImport(jsonText: string) {
    const parsed = parseProjectJson<typeof project>(jsonText, 'zip-pouch');
    importProject(parsed);
  }

  function handleExport() {
    downloadProjectJson(project);
  }

  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Zip Pouch Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Zip Pouch project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={
        <ZipPouchSettingsPanel
          inputs={project.inputs}
          errors={errors}
          onChange={updateInputs}
        />
      }
      preview={<PatternPreview inputs={project.inputs} hasErrors={hasErrors} />}
      sidebar={
        <>
          <PatternEngineLegend />
          <ExportPanel
            inputs={project.inputs}
            project={project}
            hasErrors={hasErrors}
          />
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
