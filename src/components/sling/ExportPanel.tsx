import type { SlingInputs } from '../../generators/sling/types.js';
import type { SlingProject } from '../../state/useSlingProject.js';
import { buildPattern, buildBom } from '../../generators/sling/index.js';
import { PatternExportPanel, type ExportAdapter } from '../shared/export/index.js';

interface Props {
  inputs: SlingInputs;
  project: SlingProject;
  hasErrors: boolean;
}

/** Thin adapter over the shared export panel. */
export function ExportPanel({ inputs, project, hasErrors }: Props) {
  const build = () => { const r = buildPattern(inputs); return r.ok ? r.value : null; };
  const adapter: ExportAdapter = {
    generatorId: 'sling',
    projectName: project.projectName,
    hasErrors,
    defaultSeamAllowance: 0,
    buildPattern: () => { const r = build(); return r ? { id: 'sling', name: project.projectName, pieces: r.pieces } : null; },
    steps: () => build()?.steps ?? null,
    bom: () => buildBom(inputs),
  };
  return <PatternExportPanel adapter={adapter} />;
}
