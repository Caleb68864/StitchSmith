import type { RollTopSackInputs } from '../../generators/roll-top-sack/types.js';
import type { RollTopSackProject } from '../../state/useRollTopSackProject.js';
import { buildPattern } from '../../generators/roll-top-sack/index.js';
import { PatternExportPanel, type ExportAdapter } from '../shared/export/index.js';

interface Props {
  inputs: RollTopSackInputs;
  project: RollTopSackProject;
  hasErrors: boolean;
}

/** Thin adapter over the shared export panel. */
export function ExportPanel({ inputs, project, hasErrors }: Props) {
  const build = () => { const r = buildPattern(inputs); return r.ok ? r.value : null; };
  const adapter: ExportAdapter = {
    generatorId: 'roll-top-sack',
    projectName: project.projectName,
    hasErrors,
    defaultSeamAllowance: inputs.seam_allowance ?? 9.5,
    buildPattern: () => { const r = build(); return r ? { id: 'roll-top-sack', name: project.projectName, pieces: r.pieces } : null; },
    steps: () => build()?.steps ?? null,
    bom: () => build()?.bom ?? null,
  };
  return <PatternExportPanel adapter={adapter} />;
}
