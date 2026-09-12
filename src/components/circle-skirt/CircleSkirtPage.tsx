import { useMemo } from 'react';
import type { UseCircleSkirtProjectReturn } from '../../state/useCircleSkirtProject.js';
import { validateInputs } from '../../generators/circle-skirt/index.js';
import { buildPattern } from '../../generators/circle-skirt/index.js';
import { CircleSkirtSettingsPanel } from './CircleSkirtSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { PatternEngineLegend } from '../shared/PatternEngineLegend.js';
import { ConstructionSteps } from '../shared/ConstructionSteps.js';
import { PatternPageShell } from '../shared/PatternPageShell.js';
import { parseProjectJson, downloadProjectJson } from '../../export/projectEnvelopeIO.js';
import { ValidationBanner } from '../shared/ValidationBanner.js';
import type { CircleSkirtInputs } from '../../generators/circle-skirt/types.js';
import { resolveInputs } from '../../generators/circle-skirt/inputs.js';
import { circleSkirtAssembly } from '../../generators/circle-skirt/assembly3d.js';
import { FoldPreview3D } from '../shared/FoldPreview3D.js';
import { PreviewTabs } from '../shared/PreviewTabs.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';

type CircleSkirtPageProps = Pick<
  UseCircleSkirtProjectReturn,
  'project' | 'updateInputs' | 'resetProject' | 'importProject'
>;

const FIELD_LABELS: Record<string, string> = {
  waist_circumference: 'Waist Circumference',
  skirt_length: 'Skirt Length',
  sweep_angle_deg: 'Sweep Angle',
  seam_allowance: 'Seam Allowance',
  hem_allowance: 'Hem Allowance',
};

function deriveErrors(inputs: CircleSkirtInputs): Record<string, string> {
  const errors: Record<string, string> = {};
  const toMm = (v: number) => (inputs.units === 'in' ? v * 25.4 : v);

  if (inputs.waist_circumference == null || !isFinite(toMm(inputs.waist_circumference)) || toMm(inputs.waist_circumference) <= 0) {
    errors['waist_circumference'] = 'Must be a positive number';
  }
  if (inputs.skirt_length == null || !isFinite(toMm(inputs.skirt_length)) || toMm(inputs.skirt_length) <= 0) {
    errors['skirt_length'] = 'Must be a positive number';
  }
  return errors;
}

export function CircleSkirtPage({ project, updateInputs, resetProject, importProject }: CircleSkirtPageProps) {
  const errors = useMemo(() => deriveErrors(project.inputs), [project.inputs]);
  const hasErrors = Object.keys(errors).length > 0;

  const engineValid = useMemo(() => {
    if (hasErrors) return false;
    const r = validateInputs(project.inputs);
    return r.ok;
  }, [project.inputs, hasErrors]);

  const built = useMemo(() => {
    if (!engineValid) return null;
    try {
      return buildPattern(project.inputs);
    } catch {
      return null;
    }
  }, [project.inputs, engineValid]);
  const steps = built?.steps ?? [];
  // 3D: panels wrapped onto a cone from the waist, seamed, and draped by gravity over a hip form.
  const assembly = useMemo(() => {
    if (!built) return null;
    try {
      return circleSkirtAssembly(built.pieces, resolveInputs(project.inputs));
    } catch {
      return null;
    }
  }, [built, project.inputs]);
  const pattern3d = useMemo<Pattern | null>(() => (assembly ? { id: 'circle-skirt', name: 'Circle Skirt', pieces: assembly.pieces } : null), [assembly]);

  function handleReset() {
    if (window.confirm('Reset will discard all changes and restore default Circle Skirt settings. Continue?')) {
      resetProject();
    }
  }

  function handleImport(jsonText: string) {
    const parsed = parseProjectJson<typeof project>(jsonText, 'circle-skirt');
    importProject(parsed);
  }

  function handleExport() {
    downloadProjectJson(project);
  }

  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Circle Skirt Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Circle Skirt project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={
        <CircleSkirtSettingsPanel
          inputs={project.inputs}
          errors={errors}
          onChange={updateInputs}
        />
      }
      preview={
        <PreviewTabs
          pattern={<PatternPreview inputs={project.inputs} hasErrors={!engineValid} />}
          assembly={pattern3d && assembly ? <FoldPreview3D pattern={pattern3d} placements={assembly.placements} pins={assembly.pins} seams={assembly.seams} solids={assembly.solids} gravity={assembly.gravity} initialSimulate height={560} /> : null}
        />
      }
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
