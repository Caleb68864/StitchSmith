import type { QuiltInputs } from '../../generators/quilt/types.js';
import type { QuiltProject } from '../../state/useQuiltProject.js';
import { buildPattern, buildBom } from '../../generators/quilt/index.js';
import { PatternExportPanel, type ExportAdapter } from '../shared/export/index.js';

interface Props {
  inputs: QuiltInputs;
  project: QuiltProject;
  hasErrors: boolean;
}

/** Thin adapter over the shared export panel. */
export function ExportPanel({ inputs, project, hasErrors }: Props) {
  const build = () => { const r = buildPattern(inputs); return r.ok ? r.value : null; };
  const adapter: ExportAdapter = {
    generatorId: 'quilt',
    projectName: project.projectName,
    hasErrors,
    groupByAssembly: true,
    defaultSeamAllowance: 0,
    buildPattern: () => { const r = build(); return r ? { id: 'quilt', name: project.projectName, pieces: r.pieces } : null; },
    steps: () => build()?.steps ?? null,
    bom: () => buildBom(inputs),
  };
  return <PatternExportPanel adapter={adapter} />;
}
