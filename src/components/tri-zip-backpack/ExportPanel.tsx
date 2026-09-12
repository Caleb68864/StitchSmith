import type { TriZipInputs } from '../../generators/tri-zip-backpack/types.js';
import type { TriZipProject } from '../../state/useTriZipProject.js';
import { buildPattern } from '../../generators/tri-zip-backpack/buildPattern.js';
import { getPreset } from '../../generators/tri-zip-backpack/stylePresets.js';
import { PatternExportPanel, type ExportAdapter } from '../shared/export/index.js';

interface Props {
  inputs: TriZipInputs;
  project: TriZipProject;
  hasErrors: boolean;
  showLabels?: boolean;
  /** @deprecated PatternPageShell owns project JSON I/O. */
  onImportProject?: (p: TriZipProject) => void;
}

/** Thin adapter over the shared export panel; the Tri-Zip build carries its own hardware list. */
export function ExportPanel({ inputs, project, hasErrors, showLabels }: Props) {
  const build = () => { const r = buildPattern(inputs, getPreset(inputs.stylePreset)); return r.ok ? r.value : null; };
  const adapter: ExportAdapter = {
    generatorId: 'tri-zip-backpack',
    projectName: project.projectName,
    hasErrors,
    defaultSeamAllowance: inputs.seam_allowance ?? 10,
    buildPattern: () => { const r = build(); return r ? { ...r, name: project.projectName } : null; },
    steps: () => build()?.steps ?? null,
    hardware: () => build()?.hardware ?? [],
  };
  return <PatternExportPanel adapter={adapter} showLabels={showLabels} />;
}
