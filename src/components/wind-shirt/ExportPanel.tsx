import type { WindShirtInputs } from '../../generators/wind-shirt/types.js';
import type { WindShirtProject } from '../../state/useWindShirtProject.js';
import { buildPattern, buildBom } from '../../generators/wind-shirt/index.js';
import { PatternExportPanel, type ExportAdapter } from '../shared/export/index.js';

interface Props {
  inputs: WindShirtInputs;
  project: WindShirtProject;
  hasErrors: boolean;
}

/** Thin adapter over the shared export panel. */
export function ExportPanel({ inputs, project, hasErrors }: Props) {
  const build = () => { const r = buildPattern(inputs); return r.ok ? r.value : null; };
  const adapter: ExportAdapter = {
    generatorId: 'wind-shirt',
    projectName: project.projectName,
    hasErrors,
    defaultSeamAllowance: 0,
    buildPattern: () => { const r = build(); return r ? { id: 'wind-shirt', name: project.projectName, pieces: r.pieces } : null; },
    steps: () => build()?.steps ?? null,
    bom: () => buildBom(inputs),
  };
  return <PatternExportPanel adapter={adapter} />;
}
