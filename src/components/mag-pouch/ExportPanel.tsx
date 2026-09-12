import type { MagPouchInputs, MagPouchBuildResult } from '../../generators/mag-pouch/types.js';
import type { MagPouchProject } from '../../state/useMagPouchProject.js';
import { PatternExportPanel, type ExportAdapter } from '../shared/export/index.js';
import { CutListTable } from './CutListTable.js';

interface Props {
  inputs: MagPouchInputs;
  project: MagPouchProject;
  result: MagPouchBuildResult | null;
  hasErrors: boolean;
  /** @deprecated PatternPageShell owns project JSON I/O. */
  onImportProject?: (p: MagPouchProject) => void;
}

/** Thin adapter over the shared export panel; the mag pouch BOM carries cut tags, so it renders its own table. */
export function ExportPanel({ inputs, project, result, hasErrors }: Props) {
  const adapter: ExportAdapter = {
    generatorId: 'mag-pouch',
    projectName: project.projectName,
    hasErrors: hasErrors || !result,
    // Inputs are inches; the engine draws in mm.
    defaultSeamAllowance: inputs.seamAllowance * 25.4,
    buildPattern: () => result?.pattern ?? null,
    steps: () => result?.steps ?? null,
    renderBom: () => (result ? <CutListTable bom={result.bom} cutPieces={result.cutPieces} /> : null),
  };
  return <PatternExportPanel adapter={adapter} />;
}
