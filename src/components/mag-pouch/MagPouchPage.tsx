import { useMemo } from 'react';
import type { MagPouchProject } from '../../state/useMagPouchProject.js';
import type { MagPouchInputs, MagPouchBuildResult, MagPouchDerived } from '../../generators/mag-pouch/types.js';
import { validateInputs } from '../../generators/mag-pouch/inputs.js';
import { buildPattern } from '../../generators/mag-pouch/buildPattern.js';
import { PLATFORM_LABELS } from '../../generators/mag-pouch/magazines.js';
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

function inches(v: number): string {
  return `${(Math.round(v * 100) / 100).toString()}"`;
}

function DerivedSummary({ d }: { d: MagPouchDerived }) {
  const rows: [string, string][] = [
    ['Construction', d.construction === 'pleated_card' ? `Pleated card, ${d.cellCount} cell${d.cellCount === 1 ? '' : 's'}` : 'Folded-T single'],
    ['Platform', PLATFORM_LABELS[d.platform]],
    ['Cell span', `${inches(d.cellSpanIn)} (${d.palsColumns} PALS column${d.palsColumns === 1 ? '' : 's'} total)`],
    ...(d.facePerCellIn !== undefined && d.puckerPerSideIn !== undefined
      ? [['Face per cell', `${inches(d.facePerCellIn)} — pucker ${inches(d.puckerPerSideIn)} each side`] as [string, string]]
      : []),
    ['Pouch height', `${inches(d.pouchHeightIn)}; ${inches(d.exposedHeightIn)} of mag stands proud`],
    ...(d.flapLengthIn > 0 ? [['Lid length', inches(d.flapLengthIn)] as [string, string]] : []),
    ...(d.palsRows > 0 ? [['Back PALS rows', String(d.palsRows)] as [string, string]] : []),
    ['Worst stack', `${d.maxLayers} layers — sew forward only, turn the work`],
    ...(d.caliberLocked ? [['Caliber', 'Locked by bungee retention'] as [string, string]] : []),
  ];
  return (
    <div className="rounded border border-border p-3 space-y-2" data-testid="derived-summary">
      <h3 className="text-xs font-semibold">Derived numbers</h3>
      <table className="w-full text-xs">
        <tbody>
          {rows.map(([k, v]) => (
            <tr key={k} className="border-b border-border/50">
              <td className="py-1 pr-2 text-muted-foreground whitespace-nowrap align-top">{k}</td>
              <td className="py-1 tabular-nums">{v}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
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

  const allWarnings = useMemo<UiWarning[]>(() => {
    const engineWarnings: string[] = result?.warnings ?? [];
    return engineWarnings.filter(Boolean).map((message, i) => ({
      id: `mag-pouch-warning-${i}`,
      severity: 'warning' as const,
      message,
    }));
  }, [result]);

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
      settings={<MagPouchSettingsPanel inputs={inputs} errors={errors} onChange={updateInputs} derived={result?.derived ?? null} />}
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
          {result && <DerivedSummary d={result.derived} />}
          <ConstructionSteps steps={result?.steps ?? []} title="Assembly Instructions" />
          {result && (
            <div className="rounded border border-border p-3 space-y-2">
              <h3 className="text-xs font-semibold">Cut list & bill of materials</h3>
              <CutListTable bom={result.bom} cutPieces={result.cutPieces} />
            </div>
          )}
        </>
      }
    />
  );
}
