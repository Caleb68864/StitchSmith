import { useMemo } from 'react';
import type { UseRollTopSackProjectReturn } from '../../state/useRollTopSackProject.js';
import { validateInputs, resolveInputs } from '../../generators/roll-top-sack/inputs.js';
import { buildPattern } from '../../generators/roll-top-sack/index.js';
import type { Piece } from '../../lib/pattern-engine/graph/Piece.js';
import { RollTopSackSettingsPanel } from './RollTopSackSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { PatternEngineLegend } from '../shared/PatternEngineLegend.js';
import { ConstructionSteps } from '../shared/ConstructionSteps.js';
import { WarningsPanel } from '../shared/WarningsPanel.js';
import { PatternPageShell } from '../shared/PatternPageShell.js';
import { parseProjectJson, downloadProjectJson } from '../../export/projectEnvelopeIO.js';
import { ValidationBanner } from '../shared/ValidationBanner.js';
import { FoldPreview3D, type FoldObject, type PiecePlacement, type SeamSpec } from '../shared/FoldPreview3D.js';
import { PreviewTabs } from '../shared/PreviewTabs.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';

type RollTopSackPageProps = Pick<
  UseRollTopSackProjectReturn,
  'project' | 'updateInputs' | 'resetProject' | 'importProject'
>;

const FIELD_LABELS: Record<string, string> = {
  bottom_length: 'Bottom Length',
  bottom_width: 'Bottom Width',
  height_when_rolled: 'Body Height',
  collar_height: 'Collar Height',
  seam_allowance: 'Seam Allowance',
};

function deriveErrors(inputs: UseRollTopSackProjectReturn['project']['inputs']): Record<string, string> {
  const errors: Record<string, string> = {};
  const { bottom_length, bottom_width, height_when_rolled, collar_height, units } = inputs;
  const toMm = (v: number) => units === 'in' ? v * 25.4 : v;
  if (bottom_length == null || !isFinite(toMm(bottom_length)) || toMm(bottom_length) <= 0) {
    errors['bottom_length'] = 'Must be a positive number';
  }
  if (bottom_width == null || !isFinite(toMm(bottom_width)) || toMm(bottom_width) <= 0) {
    errors['bottom_width'] = 'Must be a positive number';
  }
  if (height_when_rolled == null || !isFinite(toMm(height_when_rolled)) || toMm(height_when_rolled) <= 0) {
    errors['height_when_rolled'] = 'Must be a positive number';
  }
  if (collar_height !== undefined && collar_height !== null && (!isFinite(toMm(collar_height)) || toMm(collar_height) <= 0)) {
    errors['collar_height'] = 'Must be a positive number';
  }
  return errors;
}

export function RollTopSackPage({ project, updateInputs, resetProject, importProject }: RollTopSackPageProps) {
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
  const warnings = built?.warnings ?? [];
  // The body panel is cut twice; show both copies face to face in 3D, seamed down the sides and
  // across the bottom (French seams on the stitch lines), round a block the finished size.
  const BACK_ID = 'body-panel-back';
  const pattern3d = useMemo<Pattern | null>(() => {
    if (!built) return null;
    const body = built.pieces.find((p) => p.id === 'body-panel');
    const back: Piece[] = body ? [{ ...body, id: BACK_ID, name: `${body.name} (back)` }] : [];
    return { id: 'roll-top-sack', name: 'Roll-Top Stuff Sack', pieces: [...built.pieces, ...back] };
  }, [built]);

  const fold3d = useMemo<{ object: FoldObject; placements: Record<string, PiecePlacement>; seams: SeamSpec[] } | null>(() => {
    const body = built?.pieces.find((p) => p.id === 'body-panel');
    if (!built || !body) return null;
    try {
      const r = resolveInputs(project.inputs);
      const first = (id: string) => body.paths.find((p) => p.id === id)?.edges[0];
      const left = first('body-panel-left-stitch');
      const right = first('body-panel-right-stitch');
      const bottom = first('body-panel-bottom-stitch');
      const collar = first('body-panel-collar-fold');
      if (!left || !right || !bottom || !collar) return null;
      const side = { left: left.start.x, right: right.start.x, bottom: bottom.start.y, top: collar.start.y };
      const depth = r.bottom_width;
      const line = (pieceId: string, from: { x: number; y: number }, to: { x: number; y: number }) => ({ pieceId, from, to });
      return {
        object: {
          width: r.bottom_length, depth, height: r.height_when_rolled, label: 'contents', pin: 'footprint',
          base: { pieceId: BACK_ID, point: { x: (side.left + side.right) / 2, y: side.bottom - depth / 2 }, direction: { x: 0, y: -1 } },
        },
        placements: { 'body-panel': { dx: 0, dy: 0, dz: depth + 2 }, [BACK_ID]: { dx: 0, dy: 0, dz: 0 } },
        seams: [
          { label: 'left side', a: line('body-panel', { x: side.left, y: side.top }, { x: side.left, y: side.bottom }), b: line(BACK_ID, { x: side.left, y: side.top }, { x: side.left, y: side.bottom }) },
          { label: 'right side', a: line('body-panel', { x: side.right, y: side.top }, { x: side.right, y: side.bottom }), b: line(BACK_ID, { x: side.right, y: side.top }, { x: side.right, y: side.bottom }) },
          { label: 'bottom', a: line('body-panel', { x: side.left, y: side.bottom }, { x: side.right, y: side.bottom }), b: line(BACK_ID, { x: side.left, y: side.bottom }, { x: side.right, y: side.bottom }) },
        ],
      };
    } catch {
      return null;
    }
  }, [built, project.inputs]);

  function handleReset() {
    if (window.confirm('Reset will discard all changes and restore default Roll-Top Sack settings. Continue?')) {
      resetProject();
    }
  }

  function handleImport(jsonText: string) {
    const parsed = parseProjectJson<typeof project>(jsonText, 'roll-top-sack');
    importProject(parsed);
  }

  function handleExport() {
    downloadProjectJson(project);
  }

  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Roll-Top Stuff Sack Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Roll-Top Sack project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={
        <RollTopSackSettingsPanel
          inputs={project.inputs}
          errors={errors}
          onChange={updateInputs}
        />
      }
      preview={
        <PreviewTabs
          pattern={<PatternPreview inputs={project.inputs} hasErrors={!engineValid} />}
          assembly={pattern3d && fold3d ? <FoldPreview3D pattern={pattern3d} object={fold3d.object} placements={fold3d.placements} seams={fold3d.seams} initialSimulate height={560} /> : null}
        />
      }
      sidebar={
        <>
          <WarningsPanel warnings={warnings} />
          <PatternEngineLegend />
          <ExportPanel
            inputs={project.inputs}
            project={project}
            hasErrors={!engineValid}
          />
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
