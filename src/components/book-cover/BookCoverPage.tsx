import { useMemo } from 'react';
import type { UseBookCoverProjectReturn } from '../../state/useBookCoverProject.js';
import { validateInputs } from '../../generators/book-cover/inputs.js';
import { buildPattern } from '../../generators/book-cover/index.js';
import { PatternPageShell } from '../shared/PatternPageShell.js';
import { parseProjectJson, downloadProjectJson } from '../../export/projectEnvelopeIO.js';
import { PatternEngineLegend } from '../shared/PatternEngineLegend.js';
import { ConstructionSteps } from '../shared/ConstructionSteps.js';
import { BookCoverSettingsPanel } from './BookCoverSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';

type BookCoverPageProps = Pick<
  UseBookCoverProjectReturn,
  | 'project'
  | 'updateInputs'
  | 'resetProject'
  | 'importProject'
  | 'toggleOuterPocket'
  | 'toggleInnerPocket'
  | 'togglePenHolder'
  | 'toggleLining'
  | 'toggleCardSlots'
  | 'toggleBookmarkRibbon'
  | 'toggleInternalZipPocket'
  | 'toggleMeshPocket'
  | 'toggleTactical'
>;

const FIELD_LABELS: Record<string, string> = {
  // Base dimensions
  book_height: 'Book Height',
  book_width: 'Book Width',
  spine_width: 'Spine Width',
  flap_depth: 'Flap Depth',
  seam_allowance: 'Seam Allowance',
  top_bottom_hem: 'Top/Bottom Hem',
  // Geometry knobs
  book_preset: 'Book Preset',
  foldover_preset: 'Foldover Preset',
  width_ease: 'Width Ease',
  spine_bulge: 'Spine Bulge',
  is_hardcover: 'Hardcover',
  // Accessories
  outer_pocket: 'Outer Pocket',
  inner_pocket: 'Inner Pocket',
  pen_holder: 'Pen Holder',
  // Closure
  closure: 'Closure',
  // Lining + features + tactical
  lining: 'Lining',
  card_slots: 'Card Slots',
  bookmark_ribbon: 'Bookmark Ribbon',
  internal_zip_pocket: 'Internal Zip Pocket',
  mesh_pocket: 'Mesh Pocket',
  tactical: 'Tactical Mode',
};

function deriveErrors(inputs: UseBookCoverProjectReturn['project']['inputs']): Record<string, string> {
  const errors: Record<string, string> = {};
  const { units } = inputs;
  const toMm = (v: number) => units === 'in' ? v * 25.4 : v;

  if (!inputs.book_height || !isFinite(toMm(inputs.book_height)) || toMm(inputs.book_height) <= 0) {
    errors['book_height'] = 'Must be a positive number';
  }
  if (!inputs.book_width || !isFinite(toMm(inputs.book_width)) || toMm(inputs.book_width) <= 0) {
    errors['book_width'] = 'Must be a positive number';
  }
  if (!inputs.spine_width || !isFinite(toMm(inputs.spine_width)) || toMm(inputs.spine_width) <= 0) {
    errors['spine_width'] = 'Must be a positive number';
  }
  if (!inputs.flap_depth || !isFinite(toMm(inputs.flap_depth)) || toMm(inputs.flap_depth) <= 0) {
    errors['flap_depth'] = 'Must be a positive number';
  }
  if (inputs.seam_allowance !== undefined && (!isFinite(inputs.seam_allowance) || inputs.seam_allowance < 0)) {
    errors['seam_allowance'] = 'Must be a non-negative number';
  }
  if (inputs.top_bottom_hem !== undefined && (!isFinite(inputs.top_bottom_hem) || inputs.top_bottom_hem < 0)) {
    errors['top_bottom_hem'] = 'Must be a non-negative number';
  }

  return errors;
}

export function BookCoverPage({
  project,
  updateInputs,
  resetProject,
  importProject,
  toggleOuterPocket,
  toggleInnerPocket,
  togglePenHolder,
  toggleLining,
  toggleCardSlots,
  toggleBookmarkRibbon,
  toggleInternalZipPocket,
  toggleMeshPocket,
  toggleTactical,
}: BookCoverPageProps) {
  const errors = useMemo(() => deriveErrors(project.inputs), [project.inputs]);
  const hasErrors = Object.keys(errors).length > 0;

  const engineValid = useMemo(() => {
    if (hasErrors) return false;
    const r = validateInputs(project.inputs);
    return r.ok;
  }, [project.inputs, hasErrors]);

  const steps = useMemo(() => {
    if (!engineValid) return [];
    const r = buildPattern(project.inputs);
    return r.ok ? r.value.steps : [];
  }, [project.inputs, engineValid]);

  function handleReset() {
    if (window.confirm('Reset will discard all changes and restore default Book Cover settings. Continue?')) {
      resetProject();
    }
  }

  function handleImport(jsonText: string) {
    const parsed = parseProjectJson<typeof project>(jsonText, 'book-cover');
    importProject(parsed);
  }

  function handleExport() {
    downloadProjectJson(project);
  }

  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Book Cover Generator"
      onReset={handleReset}
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Book Cover project (.json)"
      exportTooltip="Download this project as JSON"
      banner={
        hasErrors ? (
          <div className="rounded border border-destructive/50 bg-destructive/5 p-3 space-y-1">
            <p className="text-xs font-semibold text-destructive">Fix these before exporting</p>
            {Object.entries(errors).map(([field, msg]) => (
              <p key={field} className="text-xs text-destructive">
                <span className="font-medium">{FIELD_LABELS[field] ?? field}:</span> {msg}
              </p>
            ))}
          </div>
        ) : undefined
      }
      settings={
        <BookCoverSettingsPanel
          inputs={project.inputs}
          errors={errors}
          onChange={updateInputs}
          onToggleOuterPocket={toggleOuterPocket}
          onToggleInnerPocket={toggleInnerPocket}
          onTogglePenHolder={togglePenHolder}
          onToggleLining={toggleLining}
          onToggleCardSlots={toggleCardSlots}
          onToggleBookmarkRibbon={toggleBookmarkRibbon}
          onToggleInternalZipPocket={toggleInternalZipPocket}
          onToggleMeshPocket={toggleMeshPocket}
          onToggleTactical={toggleTactical}
        />
      }
      preview={
        <div className="space-y-3">
          <PatternPreview inputs={project.inputs} hasErrors={!engineValid} />
          <PatternEngineLegend />
          {steps.length > 0 && <ConstructionSteps steps={steps} />}
        </div>
      }
      sidebar={
        <ExportPanel inputs={project.inputs} project={project} hasErrors={!engineValid} />
      }
    />
  );
}
