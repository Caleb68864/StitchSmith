import type { BivyInputs } from '../../generators/bivy/types.js';
import type { BivyProject } from '../../state/useBivyProject.js';
import { buildPattern, buildBom } from '../../generators/bivy/index.js';
import { PatternExportPanel, type ExportAdapter } from '../shared/export/index.js';

interface Props {
  inputs: BivyInputs;
  project: BivyProject;
  hasErrors: boolean;
}

/** Thin adapter over the shared export panel. */
export function ExportPanel({ inputs, project, hasErrors }: Props) {
  const build = () => { const r = buildPattern(inputs); return r.ok ? r.value : null; };
  const adapter: ExportAdapter = {
    generatorId: 'bivy',
    projectName: project.projectName,
    hasErrors,
    defaultSeamAllowance: 0,
    buildPattern: () => { const r = build(); return r ? { id: 'bivy', name: project.projectName, pieces: r.pieces } : null; },
    steps: () => build()?.steps ?? null,
    bom: () => buildBom(inputs),
  };
  return <PatternExportPanel adapter={adapter} />;
}
