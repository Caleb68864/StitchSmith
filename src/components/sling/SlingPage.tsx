import { useMemo } from 'react';
import type { UseSlingProjectReturn } from '../../state/useSlingProject.js';
import { validateInputs, buildPattern, slingAssembly } from '../../generators/sling/index.js';
import { SlingSettingsPanel } from './SlingSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { PatternEngineLegend } from '../shared/PatternEngineLegend.js';
import { ConstructionSteps } from '../shared/ConstructionSteps.js';
import { PatternPageShell } from '../shared/PatternPageShell.js';
import { parseProjectJson, downloadProjectJson } from '../../export/projectEnvelopeIO.js';
import { ValidationBanner } from '../shared/ValidationBanner.js';
import { WarningsPanel, type UiWarning } from '../shared/WarningsPanel.js';
import { FoldPreview3D } from '../shared/FoldPreview3D.js';
import { PreviewTabs } from '../shared/PreviewTabs.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';

type SlingPageProps = Pick<UseSlingProjectReturn, 'project' | 'updateInputs' | 'resetProject' | 'importProject'>;

const FIELD_LABELS: Record<string, string> = {
  webbing_width: 'Webbing width', pad_finished_length: 'Pad length', pad_girth: 'Pad girth', foam_thickness: 'Foam thickness', foam_width: 'Foam width',
  foam_setback: 'Foam setback', tuck_depth: 'Webbing tuck', turning_ease: 'Turning ease', seam_allowance: 'Seam allowance',
  rear_tail_length: 'Rear tail', adjustment_webbing_length: 'Adjustment webbing', anchor_strap_length: 'Anchor strap',
};
const IN = 25.4;
const inch = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');

export function SlingPage({ project, updateInputs, resetProject, importProject }: SlingPageProps) {
  const validation = useMemo(() => validateInputs(project.inputs), [project.inputs]);
  const errors = useMemo(() => { const out: Record<string, string> = {}; if (!validation.ok) for (const e of validation.errors) out[e.field] = e.message; return out; }, [validation]);
  const hasErrors = !validation.ok;
  const built = useMemo(() => { if (hasErrors) return null; try { const r = buildPattern(project.inputs); return r.ok ? r.value : null; } catch { return null; } }, [project.inputs, hasErrors]);
  const steps = built?.steps ?? [];
  const warnings = useMemo<UiWarning[]>(() => (built?.warnings ?? []).map((w) => ({ id: w.id, severity: w.severity, message: w.message, field: w.field })), [built]);
  const assembly = useMemo(() => (built ? slingAssembly(built.resolved) : null), [built]);
  const pattern3d = useMemo<Pattern | null>(() => (assembly ? { id: 'sling', name: 'Sling', pieces: assembly.pieces } : null), [assembly]);
  const r = built?.resolved;
  function handleReset() { if (window.confirm('Reset will discard all changes and restore default Sling settings. Continue?')) resetProject(); }
  function handleImport(jsonText: string) { importProject(parseProjectJson<typeof project>(jsonText, 'sling')); }
  function handleExport() { downloadProjectJson(project); }
  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Padded Sling Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Sling project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={<SlingSettingsPanel inputs={project.inputs} errors={errors} onChange={updateInputs} />}
      preview={
        <PreviewTabs
          pattern={<PatternPreview inputs={project.inputs} hasErrors={hasErrors} />}
          assembly={pattern3d && assembly ? <FoldPreview3D pattern={pattern3d} object={assembly.object} placements={assembly.placements} pins={assembly.pins} seams={assembly.seams} initialSimulate height={560} /> : null}
          assemblyExtra={<p className="text-xs text-muted-foreground">The finished pad draped over a medium torso's right shoulder, ends held where the webbing leaves it.</p>}
        />
      }
      sidebar={
        <>
          <WarningsPanel warnings={warnings} />
          <PatternEngineLegend />
          <ExportPanel inputs={project.inputs} project={project} hasErrors={hasErrors} />
          {r && (
            <div className="rounded border border-border p-3 space-y-1 text-xs" data-testid="derived-numbers">
              <h2 className="font-semibold">Derived numbers</h2>
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1">
                <span className="text-muted-foreground">Tube cut</span><span>{inch(r.tube_cut_width)} × {inch(r.tube_cut_length)}" (girth + {inch(r.turning_ease)}" ease + allowance)</span>
                <span className="text-muted-foreground">Pad flat</span><span>{inch(r.pad_flat_width)}" wide, turned on a {r.turn_method === 'rod' ? 'rod' : '550 cord'}</span>
                <span className="text-muted-foreground">Foam</span><span>{inch(r.foam_width)} × {inch(r.foam_length)}" ({inch(r.foam_setback)}" setback each end)</span>
                <span className="text-muted-foreground">Engagement</span><span>{inch(r.webbing_engagement)}" of webbing in the closing stitch</span>
                <span className="text-muted-foreground">Adjustment</span><span>≈ {inch(r.adjustment_range)}" travel</span>
                <span className="text-muted-foreground">Webbing</span><span>{inch(r.total_webbing)}" total</span>
              </div>
            </div>
          )}
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
