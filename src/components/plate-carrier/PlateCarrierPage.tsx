import { useMemo } from 'react';
import type { UsePlateCarrierProjectReturn } from '../../state/usePlateCarrierProject.js';
import { validateInputs, buildPattern, plateCarrierAssembly } from '../../generators/plate-carrier/index.js';
import { PlateCarrierSettingsPanel } from './PlateCarrierSettingsPanel.js';
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

type PlateCarrierPageProps = Pick<UsePlateCarrierProjectReturn, 'project' | 'updateInputs' | 'resetProject' | 'importProject'>;

const FIELD_LABELS: Record<string, string> = {
  plate_width: 'Plate width', plate_height: 'Plate height', top_clip_length: 'Corner clip', top_clip_angle: 'Clip angle', pocket_ease: 'Pocket ease', shell_oversize: 'Shell oversize',
  seam_allowance: 'Seam allowance', binding_width: 'Binding width', strap_width: 'Strap width', pad_length: 'Pad length', shoulder_strap_length: 'Strap span', strap_adjust_range: 'Strap adjustment',
  torso_length: 'Torso length', loop_field_width: 'Loop field width', loop_field_height: 'Loop field height', loop_field_y_offset: 'Loop field offset', cummerbund_width: 'Cummerbund width',
  torso_circumference: 'Torso circumference', cummerbund_overlap: 'Cummerbund hook', side_plate: 'Side plates', plate_preset: 'Plate size',
};
const IN = 25.4;
const inch = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');

export function PlateCarrierPage({ project, updateInputs, resetProject, importProject }: PlateCarrierPageProps) {
  const validation = useMemo(() => validateInputs(project.inputs), [project.inputs]);
  const errors = useMemo(() => { const out: Record<string, string> = {}; if (!validation.ok) for (const e of validation.errors) out[e.field] = e.message; return out; }, [validation]);
  const hasErrors = !validation.ok;
  const built = useMemo(() => { if (hasErrors) return null; try { const r = buildPattern(project.inputs); return r.ok ? r.value : null; } catch { return null; } }, [project.inputs, hasErrors]);
  const steps = built?.steps ?? [];
  const warnings = useMemo<UiWarning[]>(() => (built?.warnings ?? []).map((w) => ({ id: w.id, severity: w.severity, message: w.message, field: w.field })), [built]);
  const assembly = useMemo(() => { if (!built) return null; try { return plateCarrierAssembly(built.pieces, built.resolved); } catch { return null; } }, [built]);
  const pattern3d = useMemo<Pattern | null>(() => (assembly ? { id: 'plate-carrier', name: 'Plate Carrier', pieces: assembly.pieces } : null), [assembly]);
  const r = built?.resolved;
  function handleReset() { if (window.confirm('Reset will discard all changes and restore default Plate Carrier settings. Continue?')) resetProject(); }
  function handleImport(jsonText: string) { importProject(parseProjectJson<typeof project>(jsonText, 'plate-carrier')); }
  function handleExport() { downloadProjectJson(project); }
  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Plate Carrier Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Plate Carrier project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={<PlateCarrierSettingsPanel inputs={project.inputs} errors={errors} onChange={updateInputs} />}
      preview={
        <PreviewTabs
          pattern={<PatternPreview inputs={project.inputs} hasErrors={hasErrors} />}
          assembly={pattern3d && assembly ? <FoldPreview3D pattern={pattern3d} object={assembly.object} placements={assembly.placements} pins={assembly.pins} seams={assembly.seams} initialSimulate height={560} /> : null}
          assemblyExtra={assembly ? (
            <div className="rounded border border-border p-2 text-xs space-y-1" data-testid="carrier-fit">
              <p className="font-semibold">Fit on a medium torso</p>
              {assembly.report.map((line, i) => <p key={i} className={i === 0 && !assembly.fit.strapOk ? 'text-destructive' : i === 1 && !assembly.fit.cummerbundOk ? 'text-destructive' : ''}>{line}</p>)}
              <p className="text-muted-foreground">Shells hung at the plate's ride height, straps over the shoulders at the box-X marks, cummerbund round each side; a span that does not match the torso shows as a seam gap.</p>
            </div>
          ) : null}
        />
      }
      sidebar={
        <>
          <WarningsPanel warnings={warnings} />
          <PatternEngineLegend />
          <ExportPanel inputs={project.inputs} project={project} hasErrors={hasErrors} />
{r && (
            <DerivedNumbers rows={[
        { label: 'Plate', value: <>{inch(r.plate_width)} × {inch(r.plate_height)}" {r.plate_cut.toUpperCase()}</> },
        { label: 'Pocket', value: <>{inch(r.pocket_width)} × {inch(r.pocket_height)}" (+{inch(r.pocket_ease)}" ease per side)</> },
        { label: 'Shell', value: <>{inch(r.panel_width)} × {inch(r.panel_height)}" finished, {r.edge_finish}</> },
        ...(r.cummerbund_style !== 'none' ? [{ label: 'Cummerbund', value: <>{inch(r.cummerbund_length)}" per side: half of {inch(r.cummerbund_free_girth)}" free girth + {inch(r.cummerbund_overlap)}" hook each end</> }] : []),
        { label: 'Straps', value: <>{inch(r.shoulder_strap_length)}" span + {inch(r.strap_adjust_range)}" adjustment{r.shoulder_style === 'padded' ? `, ${inch(r.pad_length)}" pads` : ''}</> },
        ...(r.edge_finish === 'bound' ? [{ label: 'Binding', value: <>≈ {Math.ceil(r.binding_length / IN)}" of {inch(r.binding_width)}" tape</> }] : []),
            ]} />
          )}
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
