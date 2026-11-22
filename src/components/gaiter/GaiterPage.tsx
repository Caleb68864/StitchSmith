import { useMemo } from 'react';
import type { UseGaiterProjectReturn } from '../../state/useGaiterProject.js';
import { validateInputs, buildPattern, gaiterAssembly } from '../../generators/gaiter/index.js';
import { FoldPreview3D } from '../shared/FoldPreview3D.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import { GaiterSettingsPanel } from './GaiterSettingsPanel.js';
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

type GaiterPageProps = Pick<UseGaiterProjectReturn, 'project' | 'updateInputs' | 'resetProject' | 'importProject'>;
const FIELD_LABELS: Record<string, string> = {
  height: 'Height', top_circumference: 'Top circumference', bottom_circumference: 'Bottom circumference', front_drop: 'Front drop',
  closure: 'Front closure', overlap: 'Overlap', hem_depth: 'Hem depth', channel_depth: 'Elastic channel', hem_fold: 'Hem',
  elastic_pct: 'Elastic length', instep_strap_length: 'Instep strap', fabric_width: 'Fabric width', seam_allowance: 'Seam allowance',
};
const IN = 25.4;
const inch = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');

export function GaiterPage({ project, updateInputs, resetProject, importProject }: GaiterPageProps) {
  const validation = useMemo(() => validateInputs(project.inputs), [project.inputs]);
  const errors = useMemo(() => { const out: Record<string, string> = {}; if (!validation.ok) for (const e of validation.errors) out[e.field] = e.message; return out; }, [validation]);
  const hasErrors = !validation.ok;
  const built = useMemo(() => { if (hasErrors) return null; try { const r = buildPattern(project.inputs); return r.ok ? r.value : null; } catch { return null; } }, [project.inputs, hasErrors]);
  const steps = built?.steps ?? [];
  const warnings = useMemo<UiWarning[]>(() => (built?.warnings ?? []).map((w) => ({ id: w.id, severity: w.severity, message: w.message, field: w.field })), [built]);
  const r = built?.resolved;
  // 3D: the piece wrapped back onto its cone round a leg, the front closed, the top held.
  const assembly = useMemo(() => { if (!built) return null; try { return gaiterAssembly(built.pieces, built.resolved); } catch { return null; } }, [built]);
  const pattern3d = useMemo<Pattern | null>(() => (assembly ? { id: 'gaiter', name: 'Gaiter', pieces: assembly.pieces } : null), [assembly]);
  function handleReset() { if (window.confirm('Reset will discard all changes and restore default Gaiters settings. Continue?')) resetProject(); }
  function handleImport(jsonText: string) { importProject(parseProjectJson<typeof project>(jsonText, 'gaiter')); }
  function handleExport() { downloadProjectJson(project); }
  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Gaiters Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Gaiters project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={<GaiterSettingsPanel inputs={project.inputs} errors={errors} onChange={updateInputs} />}
      preview={
        <PreviewTabs
          pattern={<PatternPreview inputs={project.inputs} hasErrors={hasErrors} />}
          assembly={pattern3d && assembly ? <FoldPreview3D pattern={pattern3d} placements={assembly.placements} pins={assembly.pins} seams={assembly.seams} solids={assembly.solids} gravity={assembly.gravity} initialSimulate height={560} /> : null}
          unavailableReason="The 3D check wraps a gaiter whose bottom is wider than its top; this one is narrower at the bottom, so it would hang upside down."
        />
      }
      sidebar={
        <>
          <WarningsPanel warnings={warnings} />
          <PatternEngineLegend />
          <ExportPanel inputs={project.inputs} project={project} hasErrors={hasErrors} />
          {r && (
            <DerivedNumbers rows={[
              { label: 'Cut (each)', value: <>{inch(r.cut_width)} × {inch(r.cut_height)}" (channel, hems and {r.closure === 'velcro' ? 'overlap' : 'zipper allowance'} included)</> },
              { label: 'Front edge', value: <>{inch(r.front_length)}" (height + front drop)</> },
              { label: 'Top elastic', value: <>{inch(r.elastic_length)}" each ({r.elastic_pct} %)</> },
            ]} />
          )}
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
