import { useMemo } from 'react';
import type { UseZipPouchProjectReturn } from '../../state/useZipPouchProject.js';
import { validateInputs, resolveInputs } from '../../generators/zip-pouch/inputs.js';
import { computeCutDimensions } from '../../generators/zip-pouch/bom.js';
import { buildPattern } from '../../generators/zip-pouch/buildPattern.js';
import { ZipPouchSettingsPanel } from './ZipPouchSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { PatternEngineLegend } from '../shared/PatternEngineLegend.js';
import { ConstructionSteps } from '../shared/ConstructionSteps.js';
import { PatternPageShell } from '../shared/PatternPageShell.js';
import { parseProjectJson, downloadProjectJson } from '../../export/projectEnvelopeIO.js';
import { ValidationBanner } from '../shared/ValidationBanner.js';
import { FoldPreview3D, type FoldObject, type PiecePlacement, type SeamSpec } from '../shared/FoldPreview3D.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';
import type { BuildPatternError } from '../../generators/zip-pouch/types.js';

type ZipPouchPageProps = Pick<
  UseZipPouchProjectReturn,
  'project' | 'updateInputs' | 'resetProject' | 'importProject'
>;

const FIELD_LABELS: Record<string, string> = {
  finished_length: 'Length',
  finished_width: 'Width',
  finished_depth: 'Depth',
  seam_allowance: 'Seam Allowance',
  zip_gauge: 'Zipper Gauge',
  grosgrain_width: 'Grosgrain Width',
  zip_from_top: 'Zipper Placement from Top',
};

function deriveErrors(errors: BuildPatternError[]): Record<string, string> {
  const result: Record<string, string> = {};
  for (const e of errors) {
    result[e.field] = e.message;
  }
  return result;
}

export function ZipPouchPage({ project, updateInputs, resetProject, importProject }: ZipPouchPageProps) {
  const validationResult = useMemo(() => validateInputs(project.inputs), [project.inputs]);
  const errors = useMemo(
    () => validationResult.ok ? {} : deriveErrors(validationResult.errors),
    [validationResult],
  );
  const hasErrors = !validationResult.ok;

  const built = useMemo(() => {
    if (hasErrors) return null;
    const r = buildPattern(project.inputs);
    return r.ok ? r.value : null;
  }, [project.inputs, hasErrors]);
  const steps = built?.steps ?? [];
  const pattern3d = useMemo<Pattern | null>(
    () => (built ? { id: 'zip-pouch', name: 'Zip Pouch', pieces: built.pieces } : null),
    [built],
  );

  // 3D check: the two panels face to face round a block the finished size, seamed down both
  // sides and across the bottom. Boxing the corners takes half the depth from each side and
  // from the bottom, so the block stands half a depth above the bottom seam.
  const fold3d = useMemo<{ object: FoldObject; placements: Record<string, PiecePlacement>; seams: SeamSpec[] } | null>(() => {
    if (!built || !built.pieces.some((p) => p.id === 'front') || !built.pieces.some((p) => p.id === 'back')) return null;
    try {
      const r = resolveInputs(project.inputs);
      const { cutWidth, cutHeight } = computeCutDimensions(r);
      const sa = r.seam_allowance;
      const side = { left: sa, right: cutWidth - sa, bottom: cutHeight - sa, top: 0 };
      const line = (pieceId: string, from: { x: number; y: number }, to: { x: number; y: number }) => ({ pieceId, from, to });
      return {
        object: {
          width: r.finished_length, depth: r.finished_depth, height: r.finished_width, label: 'contents', pin: 'footprint',
          base: { pieceId: 'back', point: { x: cutWidth / 2, y: side.bottom - r.finished_depth / 2 }, direction: { x: 0, y: -1 } },
        },
        placements: { front: { dx: 0, dy: 0, dz: r.finished_depth + 2 } },
        seams: [
          { label: 'left side', a: line('front', { x: side.left, y: side.top }, { x: side.left, y: side.bottom }), b: line('back', { x: side.left, y: side.top }, { x: side.left, y: side.bottom }) },
          { label: 'right side', a: line('front', { x: side.right, y: side.top }, { x: side.right, y: side.bottom }), b: line('back', { x: side.right, y: side.top }, { x: side.right, y: side.bottom }) },
          { label: 'bottom', a: line('front', { x: side.left, y: side.bottom }, { x: side.right, y: side.bottom }), b: line('back', { x: side.left, y: side.bottom }, { x: side.right, y: side.bottom }) },
        ],
      };
    } catch {
      return null;
    }
  }, [built, project.inputs]);

  function handleReset() {
    if (window.confirm('Reset will discard all changes and restore default Zip Pouch settings. Continue?')) {
      resetProject();
    }
  }

  function handleImport(jsonText: string) {
    const parsed = parseProjectJson<typeof project>(jsonText, 'zip-pouch');
    importProject(parsed);
  }

  function handleExport() {
    downloadProjectJson(project);
  }

  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Zip Pouch Generator"
      onReset={handleReset}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Zip Pouch project (.json)"
      exportTooltip="Download this project as JSON"
      banner={<ValidationBanner errors={errors} fieldLabels={FIELD_LABELS} title="Fix these before exporting" />}
      settings={
        <ZipPouchSettingsPanel
          inputs={project.inputs}
          errors={errors}
          onChange={updateInputs}
        />
      }
      preview={
        <div className="space-y-3">
          <PatternPreview inputs={project.inputs} hasErrors={hasErrors} />
          {pattern3d && <FoldPreview3D pattern={pattern3d} object={fold3d?.object} placements={fold3d?.placements} seams={fold3d?.seams} />}
        </div>
      }
      sidebar={
        <>
          <PatternEngineLegend />
          <ExportPanel
            inputs={project.inputs}
            project={project}
            hasErrors={hasErrors}
          />
          {steps.length > 0 && <ConstructionSteps steps={steps} title="Assembly Instructions" />}
        </>
      }
    />
  );
}
