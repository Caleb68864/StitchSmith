import type { ZipPouchInputs } from '../../generators/zip-pouch/types.js';
import type { ZipPouchProject } from '../../state/useZipPouchProject.js';
import { buildPattern } from '../../generators/zip-pouch/buildPattern.js';
import { PatternExportPanel, type ExportAdapter } from '../shared/export/index.js';

interface Props {
  inputs: ZipPouchInputs;
  project: ZipPouchProject;
  hasErrors: boolean;
}

/** Thin adapter over the shared export panel. */
export function ExportPanel({ inputs, project, hasErrors }: Props) {
  const build = () => { const r = buildPattern(inputs); return r.ok ? r.value : null; };
  const adapter: ExportAdapter = {
    generatorId: 'zip-pouch',
    projectName: project.projectName,
    hasErrors,
    defaultSeamAllowance: inputs.seam_allowance ?? 10,
    buildPattern: () => { const r = build(); return r ? { id: 'zip-pouch', name: project.projectName, pieces: r.pieces } : null; },
    steps: () => build()?.steps ?? null,
    bom: () => build()?.bom ?? null,
  };
  return <PatternExportPanel adapter={adapter} />;
}
