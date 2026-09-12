import type { PaddedStrapInputs } from '../../generators/padded-strap/types.js';
import type { PaddedStrapProject } from '../../state/usePaddedStrapProject.js';
import { buildPattern, buildBom } from '../../generators/padded-strap/index.js';
import { PatternExportPanel, type ExportAdapter } from '../shared/export/index.js';

interface Props {
  inputs: PaddedStrapInputs;
  project: PaddedStrapProject;
  hasErrors: boolean;
}

/** Thin adapter over the shared export panel. */
export function ExportPanel({ inputs, project, hasErrors }: Props) {
  const build = () => { const r = buildPattern(inputs); return r.ok ? r.value : null; };
  const adapter: ExportAdapter = {
    generatorId: 'padded-strap',
    projectName: project.projectName,
    hasErrors,
    defaultSeamAllowance: inputs.seam_allowance ?? 10,
    buildPattern: () => { const r = build(); return r ? { id: 'padded-strap', name: project.projectName, pieces: r.pieces } : null; },
    steps: () => build()?.steps ?? null,
    bom: () => buildBom(inputs),
  };
  return <PatternExportPanel adapter={adapter} />;
}
