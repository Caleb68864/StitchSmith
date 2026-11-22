import { useMemo } from 'react';
import type { UseBivyProjectReturn } from '../../state/useBivyProject.js';
import { validateInputs, buildPattern } from '../../generators/bivy/index.js';
import { BivySettingsPanel } from './BivySettingsPanel.js';
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

type BivyPageProps = Pick<UseBivyProjectReturn, 'project' | 'updateInputs' | 'resetProject' | 'importProject'>;
const FIELD_LABELS: Record<string, string> = {
  length: 'Floor length', floor_width: 'Floor width', tub_height: 'Tub height', top_width: 'Top width', zip_length: 'Side zipper',
  fabric_width: 'Fabric width', seam_allowance: 'Seam allowance', head_gusset: 'Head gusset', zip_side: 'Zipper side', top_material: 'Top', zip_style: 'Zipper', j_from_head: 'J zipper from the head', brim: 'Brim', brim_from_head: 'Brim from the head', brim_channel: 'Brim channel',
};
const IN = 25.4;
const inch = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');

export function BivyPage({ project, updateInputs, resetProject, importProject }: BivyPageProps) {
  const validation = useMemo(() => validateInputs(project.inputs), [project.inputs]);
  const errors = useMemo(() => { const out: Record<string, string> = {}; if (!validation.ok) for (const e of validation.errors) out[e.field] = e.message; return out; }, [validation]);
  const hasErrors = !validation.ok;
  const built = useMemo(() => { if (hasErrors) return null; try { const r = buildPattern(project.inputs); return r.ok ? r.value : null; } catch { return null; } }, [project.inputs, hasErrors]);
  const steps = built?.steps ?? [];
  const warnings = useMemo<UiWarning[]>(() => (built?.warnings ?? []).map((w) => ({ id: w.id, severity: w.severity, message: w.message, field: w.field })), [built]);
  const r = built?.resolved;
  function handleReset() { if (window.confirm('Reset will discard all changes and restore default Bivy settings. Continue?')) resetProject(); }
  function handleImport(jsonText: string) { importProject(parseProjectJson<typeof project>(jsonText, 'bivy')); }
  function handleExport() { downloadProjectJson(project); }
  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Bivy Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Bivy project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={<BivySettingsPanel inputs={project.inputs} errors={errors} onChange={updateInputs} />}
      preview={
        <PreviewTabs
          pattern={<PatternPreview inputs={project.inputs} hasErrors={hasErrors} />}
          assembly={null}
          unavailableReason="No 3D check yet: the cloth engine has no lying body form to hold the top up, so the arch would collapse onto the floor."
        />
      }
      sidebar={
        <>
          <WarningsPanel warnings={warnings} />
          <PatternEngineLegend />
          <ExportPanel inputs={project.inputs} project={project} hasErrors={hasErrors} />
          {r && r.arch && (
            <DerivedNumbers rows={[
              { label: 'Floor cut', value: <>{inch(r.floor_cut_length)} × {inch(r.floor_cut_width)}" (tub sides and allowance included)</> },
              { label: 'Top cut', value: <>{inch(r.top_cut_length)} × {inch(r.top_cut_width)}"</> },
              { label: 'End arch', value: <>{inch(r.arch.rise)}" rise over the {inch(r.floor_width)}" floor</> },
              { label: 'Head height', value: <>about {inch(r.head_height)}" inside</> },
            ]} />
          )}
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
