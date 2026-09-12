import { useMemo } from 'react';
import type { UseBookCoverProjectReturn } from '../../state/useBookCoverProject.js';
import { validateInputs, resolveInputs } from '../../generators/book-cover/inputs.js';
import { buildPattern } from '../../generators/book-cover/index.js';
import { coverPanelDims } from '../../generators/book-cover/buildPattern.js';
import { PatternPageShell } from '../shared/PatternPageShell.js';
import { parseProjectJson, downloadProjectJson } from '../../export/projectEnvelopeIO.js';
import { PatternEngineLegend } from '../shared/PatternEngineLegend.js';
import { ConstructionSteps } from '../shared/ConstructionSteps.js';
import { BookCoverSettingsPanel } from './BookCoverSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { FoldPreview3D, type FoldObject, type PiecePlacement, type SeamSpec } from '../shared/FoldPreview3D.js';
import { PreviewTabs } from '../shared/PreviewTabs.js';
import { mirrorPieceX } from '../../lib/fold-engine/index.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';

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

  const built = useMemo(() => {
    if (!engineValid) return null;
    const r = buildPattern(project.inputs);
    return r.ok ? r.value : null;
  }, [project.inputs, engineValid]);
  const steps = built?.steps ?? [];
  // The two inner flaps are cut from one drawing (outer edge at x = 0); the right one is
  // sewn mirrored, so the 3D assembly mirrors its geometry.
  const pattern3d = useMemo<Pattern | null>(() => {
    if (!built) return null;
    const pieces = built.pieces.map((p) => (p.id === 'inner-flap-right' ? mirrorPieceX(p, p.id, p.name) : p));
    return { id: 'book-cover', name: 'Book Cover', pieces };
  }, [built]);

  // Flaps ride on the cover they are sewn to: outer edge at SA between the hems, and the top and
  // bottom edges caught along the hem fold lines (the hem strip itself folds over them).
  const foldAssembly = useMemo<{ placements: Record<string, PiecePlacement>; seams: SeamSpec[] } | undefined>(() => {
    if (!built || !built.pieces.some((p) => p.id === 'cover-panel')) return undefined;
    try {
      const r = resolveInputs(project.inputs);
      const { coverW, cutWidth, cutHeight } = coverPanelDims(r);
      const SA = r.seam_allowance;
      const hem = r.top_bottom_hem;
      const flapW = r.flap_depth + SA + hem;
      const cover = 'cover-panel';
      const line = (pieceId: string, from: { x: number; y: number }, to: { x: number; y: number }) => ({ pieceId, from, to });
      const placements: Record<string, PiecePlacement> = {
        'inner-flap-left': { dx: 0, dy: 0, dz: 1.2, keep: true, attach: { pieceId: cover, point: { x: SA + coverW / 2, y: cutHeight / 2 } } },
        'inner-flap-right': { dx: cutWidth - flapW, dy: 0, dz: 1.2, keep: true, attach: { pieceId: cover, point: { x: cutWidth - SA - coverW / 2, y: cutHeight / 2 } } },
      };
      const seams: SeamSpec[] = [
        { label: 'left flap outer edge', a: line('inner-flap-left', { x: SA, y: hem }, { x: SA, y: cutHeight - hem }), b: line(cover, { x: SA, y: hem }, { x: SA, y: cutHeight - hem }) },
        { label: 'left flap top hem', a: line('inner-flap-left', { x: SA, y: hem }, { x: flapW - hem, y: hem }), b: line(cover, { x: SA, y: hem }, { x: flapW - hem, y: hem }) },
        { label: 'left flap bottom hem', a: line('inner-flap-left', { x: SA, y: cutHeight - hem }, { x: flapW - hem, y: cutHeight - hem }), b: line(cover, { x: SA, y: cutHeight - hem }, { x: flapW - hem, y: cutHeight - hem }) },
        { label: 'right flap outer edge', a: line('inner-flap-right', { x: flapW - SA, y: hem }, { x: flapW - SA, y: cutHeight - hem }), b: line(cover, { x: cutWidth - SA, y: hem }, { x: cutWidth - SA, y: cutHeight - hem }) },
        { label: 'right flap top hem', a: line('inner-flap-right', { x: hem, y: hem }, { x: flapW - SA, y: hem }), b: line(cover, { x: cutWidth - flapW + hem, y: hem }, { x: cutWidth - SA, y: hem }) },
        { label: 'right flap bottom hem', a: line('inner-flap-right', { x: hem, y: cutHeight - hem }, { x: flapW - SA, y: cutHeight - hem }), b: line(cover, { x: cutWidth - flapW + hem, y: cutHeight - hem }, { x: cutWidth - SA, y: cutHeight - hem }) },
      ];
      return { placements, seams };
    } catch {
      return undefined;
    }
  }, [built, project.inputs]);

  // 3D check: the closed book lies spine-down on the spine section; both covers fold up round it.
  // The cavity report then shows the ease across the spine and over the covers.
  const foldObject = useMemo<FoldObject | undefined>(() => {
    if (!built || !built.pieces.some((p) => p.id === 'cover-panel')) return undefined;
    try {
      const r = resolveInputs(project.inputs);
      const { coverW, spineW, cutHeight } = coverPanelDims(r);
      return {
        width: r.spine_width, depth: r.book_width, height: r.book_height, label: 'book',
        base: { pieceId: 'cover-panel', point: { x: r.seam_allowance + coverW + spineW / 2, y: cutHeight - r.top_bottom_hem }, direction: { x: 0, y: -1 } },
      };
    } catch {
      return undefined;
    }
  }, [built, project.inputs]);

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
          <PreviewTabs
            pattern={<PatternPreview inputs={project.inputs} hasErrors={!engineValid} />}
            assembly={pattern3d ? <FoldPreview3D pattern={pattern3d} object={foldObject} placements={foldAssembly?.placements} seams={foldAssembly?.seams} initialSimulate height={560} /> : null}
          />
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
