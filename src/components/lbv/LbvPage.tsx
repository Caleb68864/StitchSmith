import { useMemo } from 'react';
import type { UseLbvProjectReturn } from '../../state/useLbvProject.js';
import { validateInputs, buildPattern, lbvAssembly } from '../../generators/lbv/index.js';
import { LbvSettingsPanel } from './LbvSettingsPanel.js';
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

type LbvPageProps = Pick<UseLbvProjectReturn, 'project' | 'updateInputs' | 'resetProject' | 'importProject'>;
const FIELD_LABELS: Record<string, string> = {
  panel_width: 'Front panel width', panel_height: 'Front panel height', back_panel_width: 'Back panel width', back_panel_height: 'Back panel height', back_bellow: 'Back bellows',
  seam_allowance: 'Seam allowance', foam_thickness: 'Foam thickness', edge_tape_width: 'Edge tape width', edge_tape_conceal: 'Edge tape concealment', row_width: 'Row width', row_pitch: 'Row pitch',
  front_cols: 'Front columns', back_cols: 'Back columns', rows_per_panel: 'Rows per panel', vertical_mark: 'Vertical mark', vertical_width: 'Vertical width', vertical_strap_len: 'Vertical strap length',
  tab_foldover: 'Tab fold-over', hardware_wrap: 'Hardware wrap', drop_adjust: 'Drop adjustment', pad_length: 'Pad length', pad_width: 'Pad width', pad_tab_foldover: 'Pad tab fold-over',
  cross_piece_width: 'Cross piece width', cross_piece_angle: 'Cross piece angle', pad_spread: 'Pad spread', drag_handle_len: 'Drag handle length', front_straps: 'Front straps',
  front_strap_positions: 'Front strap positions', adjust_per_location: 'Adjustment per location', base_chest: 'Base chest', belt_width: 'Belt width', loops_per_panel: 'Loops per panel',
  belt_length: 'Belt length', hydration_webbing: 'Hydration webbing', pouch_width: 'Pouch width',
};
const IN = 25.4;
const inch = (mm: number) => (mm / IN).toFixed(2).replace(/\.?0+$/, '');

export function LbvPage({ project, updateInputs, resetProject, importProject }: LbvPageProps) {
  const validation = useMemo(() => validateInputs(project.inputs), [project.inputs]);
  const errors = useMemo(() => { const out: Record<string, string> = {}; if (!validation.ok) for (const e of validation.errors) out[e.field] = e.message; return out; }, [validation]);
  const hasErrors = !validation.ok;
  const built = useMemo(() => { if (hasErrors) return null; try { const r = buildPattern(project.inputs); return r.ok ? r.value : null; } catch { return null; } }, [project.inputs, hasErrors]);
  const steps = built?.steps ?? [];
  const warnings = useMemo<UiWarning[]>(() => (built?.warnings ?? []).map((w) => ({ id: w.id, severity: w.severity, message: w.message, field: w.field })), [built]);
  const assembly = useMemo(() => { if (!built) return null; try { return lbvAssembly(built.pieces, built.resolved); } catch { return null; } }, [built]);
  const pattern3d = useMemo<Pattern | null>(() => (built ? { id: 'lbv', name: 'Modular LBV', pieces: assembly?.pieces ?? built.pieces } : null), [built, assembly]);
  const r = built?.resolved;
  function handleReset() { if (window.confirm('Reset will discard all changes and restore default Modular LBV settings. Continue?')) resetProject(); }
  function handleImport(jsonText: string) { importProject(parseProjectJson<typeof project>(jsonText, 'lbv')); }
  function handleExport() { downloadProjectJson(project); }
  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Modular LBV Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Modular LBV project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={<LbvSettingsPanel inputs={project.inputs} errors={errors} onChange={updateInputs} />}
      preview={
        <PreviewTabs
          pattern={<PatternPreview inputs={project.inputs} hasErrors={hasErrors} />}
          assembly={pattern3d && assembly ? <FoldPreview3D pattern={pattern3d} object={assembly.object} placements={assembly.placements} pins={assembly.pins} seams={assembly.seams} initialSimulate height={560} /> : null}
          assemblyExtra={assembly && assembly.report.length > 0 ? (
            <div className="text-xs rounded border border-border p-2 space-y-1" data-testid="torso-fit">
              <div className="text-muted-foreground">Fit on a medium torso (360 × 230 mm chest, 480 mm torso, 440 mm shoulders) — panels shown at their highest, verticals from the 4" marks over the pads</div>
              {assembly.report.map((line, i) => <div key={i} className={(i === 0 && !assembly.fit.dropOk) || (i === 1 && !assembly.fit.chestOk) ? 'text-destructive' : ''}>{line}</div>)}
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
        { label: 'Fronts', value: <>{inch(r.panel_width)} × {inch(r.panel_height)}" × 2, zipper {inch(r.front_zipper_len)}"</> },
        { label: 'Back', value: <>inner {inch(r.back_panel_width)} × {inch(r.back_panel_height)}", outer {inch(r.back_outer_width)} × {inch(r.back_outer_height)}" (bellows)</> },
        { label: 'Rows', value: <>first mark {inch(r.first_mark_from_edge)}" from the edge; strips {inch(r.front_strip_cut)}" front / {inch(r.back_strip_cut)}" back; {r.pouches_per_panel} × {inch(r.pouch_width)}" pouches per front panel</> },
        { label: 'Verticals', value: <>{inch(r.vertical_strap_len)}" − 2 × {inch(r.tab_foldover)}" tabs = {inch(r.usable_adjustment)}" usable for {inch(r.drop_adjust)}" of drop</> },
        { label: 'Fit', value: <>{inch(r.fit_min_chest)}"–{inch(r.fit_max_chest)}" chest ({r.front_straps} front straps, 3 × {inch(r.adjust_per_location)}"{r.tension_lock_outboard ? ' + 3" locks outboard' : ''})</> },
        { label: 'Pad tabs', value: <>{inch(r.pad_tab_foldover)}" marked → {inch(r.pad_tab_tuck)}" tuck</> },
        { label: 'Belt', value: <>{3 * r.loops_per_panel} loops leave {inch(r.belt_usable)}" of {inch(r.belt_length)}" for pouches</> },
            ]} />
          )}
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
