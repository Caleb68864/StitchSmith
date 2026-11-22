import type { BeanieInputs } from '../../generators/beanie/types.js';
import type { BeanieProject } from '../../state/useBeanieProject.js';
import { buildPattern, buildBom } from '../../generators/beanie/index.js';
import { PatternExportPanel, type ExportAdapter } from '../shared/export/index.js';

interface Props {
  inputs: BeanieInputs;
  project: BeanieProject;
  hasErrors: boolean;
}

/** Thin adapter over the shared export panel. */
export function ExportPanel({ inputs, project, hasErrors }: Props) {
  const build = () => { const r = buildPattern(inputs); return r.ok ? r.value : null; };
  const adapter: ExportAdapter = {
    generatorId: 'beanie',
    projectName: project.projectName,
    hasErrors,
    defaultSeamAllowance: 0,
    buildPattern: () => { const r = build(); return r ? { id: 'beanie', name: project.projectName, pieces: r.pieces } : null; },
    steps: () => build()?.steps ?? null,
    bom: () => buildBom(inputs),
  };
  return <PatternExportPanel adapter={adapter} />;
}
