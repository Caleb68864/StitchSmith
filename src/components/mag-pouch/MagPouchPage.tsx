import { useMemo } from 'react';
import type { MagPouchProject } from '../../state/useMagPouchProject.js';
import type { MagPouchInputs, MagPouchBuildResult } from '../../generators/mag-pouch/types.js';
import { validateInputs } from '../../generators/mag-pouch/inputs.js';
import { buildPattern, detectAkProfile } from '../../generators/mag-pouch/buildPattern.js';
import { MagPouchSettingsPanel } from './MagPouchSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { ExportPanel } from './ExportPanel.js';
import { CutListTable } from './CutListTable.js';
import { ConstructionSteps } from '../shared/ConstructionSteps.js';
// Same WarningsPanel primitive used by other generators (structural requirement)
import { WarningsPanel } from '../tool-roll/WarningsPanel.js';
import type { PatternWarning } from '../../generators/tool-roll/types.js';

interface Props {
  project: MagPouchProject;
  updateInputs: (changes: Partial<MagPouchInputs>) => void;
  resetProject: () => void;
  importProject: (p: MagPouchProject) => void;
}

export function MagPouchPage({ project, updateInputs, resetProject, importProject }: Props) {
  const { inputs } = project;

  const validation = useMemo(() => validateInputs(inputs), [inputs]);
  const errors: Record<string, string> = validation.ok ? {} : validation.errors;
  const hasErrors = !validation.ok;

  const result = useMemo<MagPouchBuildResult | null>(() => {
    if (hasErrors) return null;
    try {
      return buildPattern(inputs);
    } catch {
      return null;
    }
  }, [inputs, hasErrors]);

  // Detect AK warning even if no validation errors
  const akWarning = useMemo(() => {
    if (inputs.magazine.mode === 'custom') {
      const { width, thickness, height } = inputs.magazine;
      if (width !== undefined && thickness !== undefined && height !== undefined) {
        return detectAkProfile({ width, thickness, height });
      }
    }
    return undefined;
  }, [inputs.magazine]);

  // Combine engine warnings with any UI-level warnings; convert to PatternWarning shape
  // used by the shared WarningsPanel primitive.
  const allWarnings = useMemo<PatternWarning[]>(() => {
    const engineWarnings: string[] = result?.warnings ?? [];
    const allStrings = [...(akWarning ? [akWarning] : []), ...engineWarnings].filter(Boolean);
    return allStrings.map((message, i) => ({
      id: `mag-pouch-warning-${i}`,
      severity: 'warning' as const,
      message,
    }));
  }, [result, akWarning]);

  return (
    <div className="flex flex-col gap-4 max-w-6xl mx-auto px-4 py-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">Mag Pouch Generator</h1>
        <button
          onClick={resetProject}
          className="text-xs text-muted-foreground underline underline-offset-2 hover:text-foreground transition-colors"
        >
          Reset to defaults
        </button>
      </div>

      {hasErrors && (
        <div className="rounded border border-destructive/30 bg-destructive/10 p-3 space-y-1">
          <p className="text-xs font-semibold text-destructive">Validation errors</p>
          <ul className="space-y-0.5">
            {Object.entries(errors).map(([field, msg]) => (
              <li key={field} className="text-xs text-destructive">
                <span className="font-medium">{field}:</span> {msg}
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Shared WarningsPanel — same primitive as Tool Roll and Tri-Zip */}
      {allWarnings.length > 0 && (
        <WarningsPanel warnings={allWarnings} />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-4">
        {/* Left panel: settings */}
        <div className="space-y-2">
          <MagPouchSettingsPanel inputs={inputs} errors={errors} onChange={updateInputs} />
        </div>

        {/* Right panel: preview + export + steps */}
        <div className="space-y-4">
          <PatternPreview result={result} errors={errors} />

          <ExportPanel
            inputs={inputs}
            project={project}
            result={result}
            hasErrors={hasErrors}
            onImportProject={importProject}
          />

          {result && (
            <div className="rounded border border-border p-3 space-y-3">
              <h3 className="text-xs font-semibold">Bill of Materials</h3>
              <CutListTable bom={result.bom} />
            </div>
          )}

          <ConstructionSteps steps={result?.steps ?? []} title="Assembly Instructions" />
        </div>
      </div>
    </div>
  );
}
