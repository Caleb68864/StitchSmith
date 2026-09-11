import { useMemo } from 'react';
import type { MagPouchProject } from '../../state/useMagPouchProject.js';
import type { MagPouchInputs, MagPouchBuildResult, MagPouchDerived } from '../../generators/mag-pouch/types.js';
import { validateInputs } from '../../generators/mag-pouch/inputs.js';
import { buildPattern } from '../../generators/mag-pouch/buildPattern.js';
import { PLATFORM_LABELS } from '../../generators/mag-pouch/magazines.js';
import { MagPouchSettingsPanel } from './MagPouchSettingsPanel.js';
import { PatternPreview } from './PatternPreview.js';
import { FoldPreview3D, type SeamSpec } from '../shared/FoldPreview3D.js';
import { resolveMagPouch, inToMm } from '../../generators/mag-pouch/resolve.js';
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

  // Where the magazine stands inside the folded pattern, in flat coordinates.
  const foldObject = useMemo(() => {
    if (!result) return undefined;
    try {
      const r = resolveMagPouch(inputs);
      const mag = { width: inToMm(r.magIn.width), depth: inToMm(r.magIn.thickness), height: inToMm(r.magIn.height), label: 'magazine' };
      if (r.construction === 'pleated_card') {
        // Back panel: hem, then lid, then the card. The mag stands on the card's bottom hem fold and grows toward the lid (−y in pattern coords).
        const cellCentreX = inToMm(r.backHemIn) + inToMm(r.cellSpanIn) * (Math.ceil(r.cellCount / 2) - 0.5);
        const baseY = inToMm(r.backHemIn) + inToMm(r.flapLengthIn) + inToMm(r.pouchHeightIn);
        return { ...mag, base: { pieceId: 'back', point: { x: cellCentreX, y: baseY }, direction: { x: 0, y: -1 } } };
      }
      // Folded-T body: SA | front | bottom band | back | lid (pattern y increases downward). The mag stands on the
      // bottom-band/back fold and grows along +y over the back toward the lid.
      const sa = inToMm(r.seamAllowanceIn);
      const w = inToMm(r.cellSpanIn) + 2 * inToMm(r.cellDepthIn) + 2 * sa;
      const baseY = sa + inToMm(r.pouchHeightIn) + inToMm(r.cellDepthIn);
      return { ...mag, base: { pieceId: 'body', point: { x: w / 2, y: baseY }, direction: { x: 0, y: 1 } } };
    } catch {
      return undefined;
    }
  }, [inputs, result]);

  // Assemble the card face over the back in the 3D view: fold it at the mouth and stand it one
  // magazine deep in front of the card, bottom edges aligned. Rigid, so the pucker does not show.
  const foldPlacements = useMemo(() => {
    if (!result || result.derived.construction !== 'pleated_card') return undefined;
    try {
      const r = resolveMagPouch(inputs);
      const backHem = inToMm(r.backHemIn);
      const cardH = inToMm(r.pouchHeightIn);
      const akHem = r.akFaceHem ? 0.75 * 25.4 : 0;
      const faceCutH = 2 * cardH + akHem;
      const faceEndHem = inToMm(r.faceEndHemIn);
      const cardBottomY = backHem + inToMm(r.flapLengthIn) + cardH;
      return {
        face: {
          // Root at the half that sits nearest the back; the other half folds 180° over it toward +z.
          rootPoint: { x: inToMm(r.facePerCellIn) / 2 + faceEndHem, y: akHem + cardH + cardH / 2 },
          dx: backHem - faceEndHem,
          dy: cardBottomY - faceCutH,
          dz: inToMm(r.magIn.thickness) + 1,
        },
      };
    } catch {
      return undefined;
    }
  }, [inputs, result]);

  // Seams for the cloth simulation, in flat pattern coordinates.
  const foldSeams = useMemo<SeamSpec[]>(() => {
    if (!result) return [];
    try {
      const r = resolveMagPouch(inputs);
      const seams: SeamSpec[] = [];
      const hook = inToMm(r.hookLengthIn);
      const overlap = inToMm(r.closureOverlapIn);
      if (r.construction === 'pleated_card') {
        const cells = r.cellCount;
        const backHem = inToMm(r.backHemIn);
        const faceEndHem = inToMm(r.faceEndHemIn);
        const span = inToMm(r.cellSpanIn);
        const fpc = inToMm(r.facePerCellIn);
        const cardH = inToMm(r.pouchHeightIn);
        const flap = inToMm(r.flapLengthIn);
        const akHem = r.akFaceHem ? 0.75 * 25.4 : 0;
        const faceCutH = 2 * cardH + akHem;
        const cardBottomY = backHem + flap + cardH;
        // Divisions and outer sides: face root half to the card, running the card height.
        // The face bottom gathers under the magazine and is not modelled as a seam.
        for (let k = 0; k <= cells; k++) {
          const xf = faceEndHem + k * fpc;
          const xb = backHem + k * span;
          const name = k === 0 || k === cells ? 'outer side' : `division ${k}`;
          // The division stitching runs through BOTH face layers and the back: seam the inner
          // (root) half and the outer half of the folded face to the same back line.
          seams.push(
            { label: name, a: { pieceId: 'face', from: { x: xf, y: faceCutH }, to: { x: xf, y: faceCutH - cardH } }, b: { pieceId: 'back', from: { x: xb, y: cardBottomY }, to: { x: xb, y: cardBottomY - cardH } } },
            { label: `${name} (outer layer)`, a: { pieceId: 'face', from: { x: xf, y: akHem }, to: { x: xf, y: akHem + cardH } }, b: { pieceId: 'back', from: { x: xb, y: cardBottomY }, to: { x: xb, y: cardBottomY - cardH } }, gap: 2.4 },
          );
        }
        if (r.hasFlap) {
          // Lid tip (hook) to the face's outer half (loop), one closure per cell.
          for (let k = 0; k < cells; k++) {
            const xf = faceEndHem + (k + 0.5) * fpc;
            const xb = backHem + (k + 0.5) * span;
            seams.push({
              label: `closure ${k + 1}`, samples: 3,
              a: { pieceId: 'back', from: { x: xb - 15, y: backHem + hook / 2 }, to: { x: xb + 15, y: backHem + hook / 2 } },
              b: { pieceId: 'face', from: { x: xf - 15, y: akHem + cardH - overlap + hook / 2 }, to: { x: xf + 15, y: akHem + cardH - overlap + hook / 2 } },
            });
          }
        }
        return seams;
      }
      // Folded-T: each front wing's outer edge sews to the back wing's seam line, mouth to mouth.
      const sa = inToMm(r.seamAllowanceIn);
      const ph = inToMm(r.pouchHeightIn);
      const cd = inToMm(r.cellDepthIn);
      const w = inToMm(r.cellSpanIn) + 2 * cd + 2 * sa;
      const mouthBack = sa + 2 * ph + cd;
      // Each wing wraps the side and its outer edge lands on the opposite panel one SA inside
      // that panel's wing fold, mouth to mouth (the wings overlap into a double-layer side).
      const xIn = sa + cd + sa;
      seams.push(
        { label: 'front wing, left', a: { pieceId: 'body', from: { x: 0, y: sa }, to: { x: 0, y: sa + ph } }, b: { pieceId: 'body', from: { x: xIn, y: mouthBack }, to: { x: xIn, y: mouthBack - ph } } },
        { label: 'front wing, right', a: { pieceId: 'body', from: { x: w, y: sa }, to: { x: w, y: sa + ph } }, b: { pieceId: 'body', from: { x: w - xIn, y: mouthBack }, to: { x: w - xIn, y: mouthBack - ph } } },
        { label: 'back wing, left', a: { pieceId: 'body', from: { x: 0, y: mouthBack }, to: { x: 0, y: mouthBack - ph } }, b: { pieceId: 'body', from: { x: xIn, y: sa }, to: { x: xIn, y: sa + ph } } },
        { label: 'back wing, right', a: { pieceId: 'body', from: { x: w, y: mouthBack }, to: { x: w, y: mouthBack - ph } }, b: { pieceId: 'body', from: { x: w - xIn, y: sa }, to: { x: w - xIn, y: sa + ph } } },
      );
      if (r.hasFlap) {
        const h = mouthBack + inToMm(r.flapLengthIn) + sa;
        seams.push({
          label: 'lid closure', samples: 3,
          a: { pieceId: 'body', from: { x: w / 2 - 15, y: h - sa - hook / 2 }, to: { x: w / 2 + 15, y: h - sa - hook / 2 } },
          b: { pieceId: 'body', from: { x: w / 2 - 15, y: sa + overlap - hook / 2 }, to: { x: w / 2 + 15, y: sa + overlap - hook / 2 } },
        });
      }
      return seams;
    } catch {
      return [];
    }
  }, [inputs, result]);

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
      preview={
        <div className="space-y-3">
          <PatternPreview inputs={inputs} result={result} errors={errors} />
          {result && (
            <FoldPreview3D
              pattern={result.pattern}
              object={foldObject}
              placements={foldPlacements}
              seams={foldSeams}
            />
          )}
        </div>
      }
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
