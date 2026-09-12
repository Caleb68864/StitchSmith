import { useMemo } from 'react';
import type { UseZipPouchProjectReturn } from '../../state/useZipPouchProject.js';
import { validateInputs, resolveInputs } from '../../generators/zip-pouch/inputs.js';
import { zipPouchAssembly } from '../../generators/zip-pouch/assembly3d.js';
import { buildPattern } from '../../generators/zip-pouch/buildPattern.js';
import { ZipPouchSettingsPanel } from './ZipPouchSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { PatternEngineLegend } from '../shared/PatternEngineLegend.js';
import { ConstructionSteps } from '../shared/ConstructionSteps.js';
import { PatternPageShell } from '../shared/PatternPageShell.js';
import { parseProjectJson, downloadProjectJson } from '../../export/projectEnvelopeIO.js';
import { ValidationBanner } from '../shared/ValidationBanner.js';
import { FoldPreview3D } from '../shared/FoldPreview3D.js';
import { PreviewTabs } from '../shared/PreviewTabs.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
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
  zip_from_top: 'Zipper Placement from Top',
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

  const built = useMemo(() => {
    if (hasErrors) return null;
    const r = buildPattern(project.inputs);
    return r.ok ? r.value : null;
  }, [project.inputs, hasErrors]);
  const steps = built?.steps ?? [];
  // 3D check for every construction style (see generators/zip-pouch/assembly3d.ts).
  const fold3d = useMemo(() => {
    if (!built) return null;
    try {
      return zipPouchAssembly(built.pieces, resolveInputs(project.inputs));
    } catch {
      return null;
    }
  }, [built, project.inputs]);
  const pattern3d = useMemo<Pattern | null>(
    () => (built ? { id: 'zip-pouch', name: 'Zip Pouch', pieces: fold3d?.pieces ?? built.pieces } : null),
    [built, fold3d],
  );


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
      preview={
        <PreviewTabs
          pattern={<PatternPreview inputs={project.inputs} hasErrors={hasErrors} />}
          assembly={pattern3d && fold3d ? <FoldPreview3D pattern={pattern3d} object={fold3d.object} placements={fold3d.placements} seams={fold3d.seams} pins={fold3d.pins} selfCollision={fold3d.selfCollision ?? true} initialSimulate height={560} /> : null}
        />
      }
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
