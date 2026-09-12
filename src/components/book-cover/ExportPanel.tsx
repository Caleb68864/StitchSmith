import type { BookCoverProjectInputs } from '../../state/useBookCoverProject.js';
import type { BookCoverProject } from '../../state/useBookCoverProject.js';
import { buildPattern } from '../../generators/book-cover/index.js';
import { PatternExportPanel, type ExportAdapter } from '../shared/export/index.js';

interface Props {
  inputs: BookCoverProjectInputs;
  project: BookCoverProject;
  hasErrors: boolean;
}

/** Thin adapter over the shared export panel. */
export function ExportPanel({ inputs, project, hasErrors }: Props) {
  const build = () => { const r = buildPattern(inputs); return r.ok ? r.value : null; };
  const adapter: ExportAdapter = {
    generatorId: 'book-cover',
    projectName: project.projectName,
    hasErrors,
    defaultSeamAllowance: inputs.seam_allowance ?? 9.5,
    buildPattern: () => { const r = build(); return r ? { id: 'book-cover', name: project.projectName, pieces: r.pieces } : null; },
    steps: () => build()?.steps ?? null,
    bom: () => build()?.bom ?? null,
  };
  return <PatternExportPanel adapter={adapter} />;
}
