import { useMemo } from 'react';
import type { UseClamshellPackProjectReturn } from '../../state/useClamshellPackProject.js';
import { validateInputs, buildPattern, clamshellAssembly } from '../../generators/clamshell-pack/index.js';
import { ClamshellPackSettingsPanel } from './ClamshellPackSettingsPanel.js';
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

type Props = Pick<UseClamshellPackProjectReturn, 'project' | 'updateInputs' | 'resetProject' | 'importProject'>;
const FIELD_LABELS: Record<string, string> = {
  width: 'Width', height: 'Height', depth: 'Depth', lid_depth: 'Lid depth', zipper_lip: 'Zipper lip', zipper_underwrap: 'Zipper underwrap', hoop_overcut: 'Hoop overcut',
  seam_allowance: 'Seam allowance', fold_in: 'Fold-in', zipper_clearance: 'Zipper clearance', edge_offset: 'Edge offset', handle_bow: 'Handle bow', handle_fold_under: 'Handle fold-under',
  compression_extra: 'Compression strap extra', loop_strip_width: 'Loop strip width', loop_gap: 'Loop gap', strap_tab_spacing: 'Strap tab spacing',
  pals_rows_side: 'Side PALS rows', pals_rows_face: 'Face PALS rows', pals_rows_bottom: 'Bottom PALS rows', pals_cols_side: 'Side PALS columns', compression_straps_per_side: 'Compression straps',
};
const IN = 25.4;
const inch = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');

export function ClamshellPackPage({ project, updateInputs, resetProject, importProject }: Props) {
  const validation = useMemo(() => validateInputs(project.inputs), [project.inputs]);
  const errors = useMemo(() => { const out: Record<string, string> = {}; if (!validation.ok) for (const e of validation.errors) out[e.field] = e.message; return out; }, [validation]);
  const hasErrors = !validation.ok;
  const built = useMemo(() => { if (hasErrors) return null; try { const r = buildPattern(project.inputs); return r.ok ? r.value : null; } catch { return null; } }, [project.inputs, hasErrors]);
  const steps = built?.steps ?? [];
  const warnings = useMemo<UiWarning[]>(() => (built?.warnings ?? []).map((w) => ({ id: w.id, severity: w.severity, message: w.message, field: w.field, tag: w.tag })), [built]);
  const assembly = useMemo(() => { if (!built) return null; try { return clamshellAssembly(built.pieces, built.resolved); } catch { return null; } }, [built]);
  const pattern3d = useMemo<Pattern | null>(() => (built ? { id: 'clamshell-pack', name: 'Clamshell Pack', pieces: assembly?.pieces ?? built.pieces } : null), [built, assembly]);
  const r = built?.resolved;
  function handleReset() { if (window.confirm('Reset will discard all changes and restore default Clamshell Pack settings. Continue?')) resetProject(); }
  function handleImport(jsonText: string) { importProject(parseProjectJson<typeof project>(jsonText, 'clamshell-pack')); }
  function handleExport() { downloadProjectJson(project); }
  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Clamshell Pack Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Clamshell Pack project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={<ClamshellPackSettingsPanel inputs={project.inputs} errors={errors} onChange={updateInputs} />}
      preview={
        <PreviewTabs
          pattern={<PatternPreview inputs={project.inputs} hasErrors={hasErrors} />}
          assembly={pattern3d && assembly ? <FoldPreview3D pattern={pattern3d} object={assembly.object} placements={assembly.placements} seams={assembly.seams} initialSimulate height={560} /> : null}
          unavailableReason="The 3D check assembles the hoop, bottom and both panels round a block of the finished size."
        />
      }
      sidebar={
        <>
          <WarningsPanel warnings={warnings} />
          <PatternEngineLegend />
          <ExportPanel inputs={project.inputs} project={project} hasErrors={hasErrors} />
{r && (
            <DerivedNumbers rows={[
        { label: 'Hoop', value: <>{inch(r.hoop_length)}" finished; cut {inch(r.hoop_cut_length)}" and trim at the bottom join</> },
        { label: 'Base gusset', value: <>{inch(r.base_depth)}" finished + {inch(r.zipper_lip)}" lip + {inch(r.seam_allowance)}" = {inch(r.gusset_cut_width)}" cut</> },
        { label: 'Lid strip', value: <>{inch(r.lid_depth)}" + lip + allowance = {inch(r.lid_cut_width)}" cut</> },
        { label: 'Bottom', value: <>{inch(r.bottom_nominal_length)} × {inch(r.bottom_cut_width)}" nominal — cut from the measured gap + {inch(2 * r.fold_in)}"</> },
        { label: 'Side PALS', value: <>{r.pals_rows_side} rows × {r.pals_cols_side} columns on {inch(r.side_work_area)}" work area; {inch(r.side_pals_budget)}" of depth for {inch(r.pals_cols_side * 38.1)}" of columns</> },
        { label: 'Face PALS', value: <>{r.pals_rows_face} rows × {r.face_pals_cols} columns</> },
        ...(r.handle ? [{ label: 'Handle', value: <>{inch(r.handle_cut_length)}" of 2" webbing over a {inch(r.handle_core_length)}" 1" core</> }] : []),
        ...(r.compression_straps_per_side > 0 ? [{ label: 'Compression straps', value: <>{2 * r.compression_straps_per_side} × {inch(r.compression_strap_length)}" (depth + {inch(r.compression_extra)}")</> }] : []),
        ...(r.interior_loop ? [{ label: 'Interior loop', value: <>{r.loop_strips_per_wall} strips per wall, cut {inch(r.loop_strip_cut_length)}"</> }] : []),
            ]} />
          )}
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
