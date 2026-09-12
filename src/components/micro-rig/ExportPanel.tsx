import type { MicroRigInputs } from '../../generators/micro-rig/types.js';
import type { MicroRigProject } from '../../state/useMicroRigProject.js';
import { buildPattern, buildBom } from '../../generators/micro-rig/index.js';
import { PatternExportPanel, type ExportAdapter } from '../shared/export/index.js';

interface Props {
  inputs: MicroRigInputs;
  project: MicroRigProject;
  hasErrors: boolean;
}

/** Thin adapter over the shared export panel. */
export function ExportPanel({ inputs, project, hasErrors }: Props) {
  const build = () => { const r = buildPattern(inputs); return r.ok ? r.value : null; };
  const adapter: ExportAdapter = {
    generatorId: 'micro-rig',
    projectName: project.projectName,
    hasErrors,
    defaultSeamAllowance: inputs.seam_allowance ?? 9.5,
    buildPattern: () => { const r = build(); return r ? { id: 'micro-rig', name: project.projectName, pieces: r.pieces } : null; },
    steps: () => build()?.steps ?? null,
    bom: () => buildBom(inputs),
  };
  return <PatternExportPanel adapter={adapter} />;
}
