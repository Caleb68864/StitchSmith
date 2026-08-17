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
import { PatternEngineLegend } from '../shared/PatternEngineLegend.js';
import { PatternPageShell } from '../shared/PatternPageShell.js';
import { ValidationBanner } from '../shared/ValidationBanner.js';
import { parseProjectJson, downloadProjectJson } from '../../export/projectEnvelopeIO.js';
import { WarningsPanel, type UiWarning } from '../shared/WarningsPanel.js';

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
    try { return buildPattern(inputs); } catch { return null; }
  }, [inputs, hasErrors]);

  const akWarning = useMemo(() => {
    if (inputs.magazine.mode === 'custom') {
      const { width, thickness, height } = inputs.magazine;
      if (width !== undefined && thickness !== undefined && height !== undefined) {
        return detectAkProfile({ width, thickness, height });
      }
    }
    return undefined;
  }, [inputs.magazine]);

  const allWarnings = useMemo<UiWarning[]>(() => {
    const engineWarnings: string[] = result?.warnings ?? [];
    const allStrings = [...(akWarning ? [akWarning] : []), ...engineWarnings].filter(Boolean);
    return allStrings.map((message, i) => ({
      id: `mag-pouch-warning-${i}`,
      severity: 'warning' as const,
      message,
    }));
  }, [result, akWarning]);

  const banner = (
    <>
      <ValidationBanner errors={errors} />
      {allWarnings.length > 0 && <WarningsPanel warnings={allWarnings} />}
    </>
  );

  function handleImport(jsonText: string) {
    const parsed = parseProjectJson<MagPouchProject>(jsonText, 'mag-pouch');
    importProject(parsed);
  }

  function handleExport() {
    downloadProjectJson(project);
  }

  return (
    <PatternPageShell
      title={project.projectName}
      subtitle="Mag Pouch Generator"
      onReset={resetProject}
      resetLabel="Reset"
      onImport={handleImport}
      onExport={handleExport}
      importTooltip="Load a previously-exported Mag Pouch project (.json)"
      exportTooltip="Download this project as JSON"
      banner={banner}
      settings={<MagPouchSettingsPanel inputs={inputs} errors={errors} onChange={updateInputs} />}
      preview={<PatternPreview inputs={inputs} result={result} errors={errors} />}
      sidebar={
        <>
          <PatternEngineLegend />
          <ExportPanel
            inputs={inputs}
            project={project}
            result={result}
            hasErrors={hasErrors}
            onImportProject={importProject}
          />
          <ConstructionSteps steps={result?.steps ?? []} title="Assembly Instructions" />
          {result && (
            <div className="rounded border border-border p-3 space-y-2">
              <h3 className="text-xs font-semibold">Bill of Materials</h3>
              <CutListTable bom={result.bom} />
            </div>
          )}
        </>
      }
    />
  );
}
