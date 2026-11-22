import { useMemo } from 'react';
import type { UseTarpProjectReturn } from '../../state/useTarpProject.js';
import { validateInputs, buildPattern, tarpAssembly } from '../../generators/tarp/index.js';
import { TarpSettingsPanel } from './TarpSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { PatternEngineLegend } from '../shared/PatternEngineLegend.js';
import { ConstructionSteps } from '../shared/ConstructionSteps.js';
import { PatternPageShell } from '../shared/PatternPageShell.js';
import { parseProjectJson, downloadProjectJson } from '../../export/projectEnvelopeIO.js';
import { ValidationBanner } from '../shared/ValidationBanner.js';
import { WarningsPanel, type UiWarning } from '../shared/WarningsPanel.js';
import { DerivedNumbers } from '../shared/warnings/DerivedNumbers.js';
import { FoldPreview3D } from '../shared/FoldPreview3D.js';
import { PreviewTabs } from '../shared/PreviewTabs.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';

type TarpPageProps = Pick<UseTarpProjectReturn, 'project' | 'updateInputs' | 'resetProject' | 'importProject'>;
const FIELD_LABELS: Record<string, string> = {
  construction: 'Construction', cut_style: 'Edges', ridge_length: 'Ridge length', width: 'Width', ridge_sag: 'Ridge cat-cut depth', eave_sag: 'Eave cat-cut depth',
  fabric_width: 'Fabric width', seam_allowance: 'Ridge seam allowance', hem_depth: 'Hem depth', hem_fold: 'Hem', eave_tieouts: 'Tie-outs per eave',
  patch_size: 'Patch size', loop_length: 'Loop length', loop_width: 'Grosgrain width', ridge_height: 'Ridgeline height',
  guyline_length: 'Cord per guyline', end_sag: 'End cat-cut depth', pullouts: 'Pull-outs', doors: 'Doors', beaks: 'Beaks', beak_length: 'Beak length',
};
const IN = 25.4;
const inch = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');

export function TarpPage({ project, updateInputs, resetProject, importProject }: TarpPageProps) {
  const validation = useMemo(() => validateInputs(project.inputs), [project.inputs]);
  const errors = useMemo(() => { const out: Record<string, string> = {}; if (!validation.ok) for (const e of validation.errors) out[e.field] = e.message; return out; }, [validation]);
  const hasErrors = !validation.ok;
  const built = useMemo(() => { if (hasErrors) return null; try { const r = buildPattern(project.inputs); return r.ok ? r.value : null; } catch { return null; } }, [project.inputs, hasErrors]);
  const steps = built?.steps ?? [];
  const warnings = useMemo<UiWarning[]>(() => (built?.warnings ?? []).map((w) => ({ id: w.id, severity: w.severity, message: w.message, field: w.field })), [built]);
  const assembly = useMemo(() => { if (!built) return null; try { return tarpAssembly(built.pieces, built.resolved); } catch { return null; } }, [built]);
  const pattern3d = useMemo<Pattern | null>(() => (built && assembly ? { id: 'tarp', name: 'Tarp', pieces: assembly.pieces } : null), [built, assembly]);
  const r = built?.resolved;
  function handleReset() { if (window.confirm('Reset will discard all changes and restore default Tarp settings. Continue?')) resetProject(); }
  function handleImport(jsonText: string) { importProject(parseProjectJson<typeof project>(jsonText, 'tarp')); }
  function handleExport() { downloadProjectJson(project); }
  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Tarp Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Tarp project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={<TarpSettingsPanel inputs={project.inputs} errors={errors} onChange={updateInputs} />}
      preview={
        <PreviewTabs
          pattern={<PatternPreview inputs={project.inputs} hasErrors={hasErrors} />}
          assembly={pattern3d && assembly ? <FoldPreview3D pattern={pattern3d} placements={assembly.placements} pins={assembly.pins} seams={assembly.seams} gravity={assembly.gravity} initialSimulate height={560} /> : null}
          assemblyExtra={assembly && assembly.report.length > 0 ? (
            <div className="text-xs rounded border border-border p-2 space-y-1" data-testid="pitch-check">
              <div className="text-muted-foreground">Pitch check — A-frame on the ridgeline, every tie-out staked</div>
              {assembly.report.map((line, i) => <div key={i} className={i === 0 && r && r.eave_clearance > 0 ? 'text-destructive' : ''}>{line}</div>)}
            </div>
          ) : null}
          unavailableReason="The 3D check pitches the two-panel ridge-seam tarp; the single panel is not assembled."
        />
      }
      sidebar={
        <>
          <WarningsPanel warnings={warnings} />
          <PatternEngineLegend />
          <ExportPanel inputs={project.inputs} project={project} hasErrors={hasErrors} />
          {r && (
            <DerivedNumbers rows={[
              { label: 'Panel cut', value: <>{r.panel_count} × {inch(r.panel_cut_length)} × {inch(r.panel_cut_width)}" ({r.construction === 'ridge_seam' ? 'seam allowance and ' : ''}hems included)</> },
              { label: 'Fabric', value: <>{inch(r.fabric_length)}" of {inch(r.fabric_width)}" fabric, panels end to end</> },
              { label: 'Panel depth', value: <>{inch(r.panel_finished_width)}" at the ends, {inch(r.panel_mid_width)}" at mid-span</> },
              { label: 'Curves', value: <>ridge {inch(r.ridge_curve_length)}", eave {inch(r.eave_curve_length)}" along the edge</> },
              { label: 'Hems', value: <>{inch(r.hem_depth)}" {r.hem_fold === 'double' ? 'rolled' : 'single-fold'}, {inch(r.hem_allowance)}" of fabric, mark at {inch(r.hem_mark)}"</> },
              { label: 'Tie-outs', value: <>{r.tieout_count} loops and patches</> },
              { label: 'Pitch', value: r.footprint_width > 0 ? <>{r.pitch_deg.toFixed(0)}° on a {inch(r.ridge_height)}" ridgeline; footprint {inch(r.footprint_width)}" across</> : <>eaves {inch(r.eave_clearance)}" off the ground</> },
            ]} />
          )}
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
