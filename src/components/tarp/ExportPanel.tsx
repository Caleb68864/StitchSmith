import type { TarpInputs } from '../../generators/tarp/types.js';
import type { TarpProject } from '../../state/useTarpProject.js';
import { buildPattern, buildBom } from '../../generators/tarp/index.js';
import { PatternExportPanel, type ExportAdapter } from '../shared/export/index.js';

interface Props {
  inputs: TarpInputs;
  project: TarpProject;
  hasErrors: boolean;
}

/** Thin adapter over the shared export panel. */
export function ExportPanel({ inputs, project, hasErrors }: Props) {
  const build = () => { const r = buildPattern(inputs); return r.ok ? r.value : null; };
  const adapter: ExportAdapter = {
    generatorId: 'tarp',
    projectName: project.projectName,
    hasErrors,
    defaultSeamAllowance: 0,
    buildPattern: () => { const r = build(); return r ? { id: 'tarp', name: project.projectName, pieces: r.pieces } : null; },
    steps: () => build()?.steps ?? null,
    bom: () => buildBom(inputs),
  };
  return <PatternExportPanel adapter={adapter} />;
}
