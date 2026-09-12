import { useMemo } from 'react';
import type { UsePaddedStrapProjectReturn } from '../../state/usePaddedStrapProject.js';
import { validateInputs, buildPattern } from '../../generators/padded-strap/index.js';
import { PaddedStrapSettingsPanel } from './PaddedStrapSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { PatternEngineLegend } from '../shared/PatternEngineLegend.js';
import { ConstructionSteps } from '../shared/ConstructionSteps.js';
import { PatternPageShell } from '../shared/PatternPageShell.js';
import { parseProjectJson, downloadProjectJson } from '../../export/projectEnvelopeIO.js';
import { ValidationBanner } from '../shared/ValidationBanner.js';
import { WarningsPanel, type UiWarning } from '../shared/WarningsPanel.js';
import { FoldPreview3D } from '../shared/FoldPreview3D.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';

type PaddedStrapPageProps = Pick<UsePaddedStrapProjectReturn, 'project' | 'updateInputs' | 'resetProject' | 'importProject'>;

const FIELD_LABELS: Record<string, string> = {
  pad_length: 'Pad length',
  pad_width: 'Pad width',
  foam_thickness: 'Foam thickness',
  webbing_width: 'Webbing width',
  seam_allowance: 'Seam allowance',
  torso_length: 'Torso length',
  gusset_depth: 'Gusset depth',
  tail_length: 'Tail length',
  cross_strap_height: 'Cross strap height',
  pad_spread: 'Pad spread',
  chest_adjust_range: 'Chest adjustment',
  slot_pitch: 'Slot pitch',
  drop_leg_length: 'Drop leg length',
  hydration_channels: 'Hydration channels',
  front_pals_rows: 'Front PALS rows',
};

export function PaddedStrapPage({ project, updateInputs, resetProject, importProject }: PaddedStrapPageProps) {
  const validation = useMemo(() => validateInputs(project.inputs), [project.inputs]);
  const errors = useMemo(() => {
    const out: Record<string, string> = {};
    if (!validation.ok) for (const e of validation.errors) out[e.field] = e.message;
    return out;
  }, [validation]);
  const hasErrors = !validation.ok;

  const built = useMemo(() => {
    if (hasErrors) return null;
    try {
      const r = buildPattern(project.inputs);
      return r.ok ? r.value : null;
    } catch {
      return null;
    }
  }, [project.inputs, hasErrors]);
  const steps = built?.steps ?? [];
  const warnings = useMemo<UiWarning[]>(() => (built?.warnings ?? []).map((w) => ({ id: w.id, severity: w.severity, message: w.message, field: w.field })), [built]);
  const pattern3d = useMemo<Pattern | null>(() => (built ? { id: 'padded-strap', name: 'Padded Strap', pieces: built.pieces } : null), [built]);
  const isH = (project.inputs.mode ?? 'pack_pair') === 'h_harness';

  function handleReset() {
    if (window.confirm('Reset will discard all changes and restore default Padded Strap settings. Continue?')) resetProject();
  }
  function handleImport(jsonText: string) {
    importProject(parseProjectJson<typeof project>(jsonText, 'padded-strap'));
  }
  function handleExport() {
    downloadProjectJson(project);
  }

  return (
    <PatternPageShell
      title={project.projectName}
      subtitle={isH ? 'Padded Strap Generator — H-harness' : 'Padded Strap Generator'}
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Padded Strap project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={<PaddedStrapSettingsPanel inputs={project.inputs} errors={errors} onChange={updateInputs} />}
      preview={
        <div className="space-y-3">
          <PatternPreview inputs={project.inputs} hasErrors={hasErrors} />
          {pattern3d && <FoldPreview3D pattern={pattern3d} />}
        </div>
      }
      sidebar={
        <>
          <WarningsPanel warnings={warnings} />
          <PatternEngineLegend />
          <ExportPanel inputs={project.inputs} project={project} hasErrors={hasErrors} />
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
