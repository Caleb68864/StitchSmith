import type { CircleSkirtInputs } from '../../generators/circle-skirt/types.js';
import type { CircleSkirtProject } from '../../state/useCircleSkirtProject.js';
import { buildPattern, buildBom } from '../../generators/circle-skirt/index.js';
import { PatternExportPanel, type ExportAdapter } from '../shared/export/index.js';

interface Props {
  inputs: CircleSkirtInputs;
  project: CircleSkirtProject;
  hasErrors: boolean;
}

/** Thin adapter over the shared export panel. */
export function ExportPanel({ inputs, project, hasErrors }: Props) {
  const adapter: ExportAdapter = {
    generatorId: 'circle-skirt',
    projectName: project.projectName,
    hasErrors,
    defaultSeamAllowance: inputs.seam_allowance ?? 15,
    buildPattern: () => ({ id: 'circle-skirt', name: project.projectName, pieces: buildPattern(inputs).pieces }),
    steps: () => buildPattern(inputs).steps,
    bom: () => buildBom(inputs),
  };
  return <PatternExportPanel adapter={adapter} />;
}
