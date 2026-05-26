import { useState } from 'react';
import { Download, FileJson, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { RollTopSackInputs } from '../../generators/roll-top-sack/types.js';
import type { RollTopSackProject } from '../../state/useRollTopSackProject.js';
import { buildPattern } from '../../generators/roll-top-sack/index.js';
import { patternToSvg } from '../../lib/pattern-engine/exports/svg.js';
import { downloadTextFile } from '../../utils/download.js';
import { CutListTable } from './CutListTable.js';
import type { Bom } from '../../generators/roll-top-sack/types.js';
import type { Pattern } from '../../lib/pattern-engine/graph/Pattern.js';

interface Props {
  inputs: RollTopSackInputs;
  project: RollTopSackProject;
  hasErrors: boolean;
}

export function ExportPanel({ inputs, project, hasErrors }: Props) {
  const [showCutList, setShowCutList] = useState(false);
  const [bomData, setBomData] = useState<Bom | null>(null);

  function getResult() {
    if (hasErrors) return null;
    const r = buildPattern(inputs);
    if (!r.ok) return null;
    return r.value;
  }

  function handleSvg() {
    const r = getResult();
    if (!r) return;
    const pattern: Pattern = {
      id: 'roll-top-sack',
      name: project.projectName,
      pieces: r.pieces,
    };
    const svg = patternToSvg(pattern, {
      defaultSeamAllowance: inputs.seam_allowance ?? 9.5,
      showLabels: true,
    });
    downloadTextFile(`${project.projectName}.svg`, svg, 'image/svg+xml');
  }

  function handleCutListJson() {
    const r = getResult();
    if (!r) return;
    const json = JSON.stringify(r.bom, null, 2);
    downloadTextFile(`${project.projectName}-cut-list.json`, json, 'application/json');
  }

  function handleToggleCutList() {
    const r = getResult();
    if (!r) return;
    setBomData(r.bom);
    setShowCutList(v => !v);
  }

  const disabled = hasErrors;

  return (
    <div className="rounded border border-border p-3 space-y-2">
      <h2 className="text-xs font-semibold">Export</h2>
      <div className="flex flex-col gap-2">
        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={disabled}
          onClick={handleSvg}
          title="Download the pattern as a full-dimension SVG file."
        >
          <Download className="h-3 w-3 mr-2" />
          Download SVG
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={disabled}
          onClick={handleCutListJson}
          title="Download cut list as JSON."
        >
          <FileJson className="h-3 w-3 mr-2" />
          Download Cut List (JSON)
        </Button>

        <Button
          variant="outline"
          size="sm"
          className="w-full justify-start text-xs"
          disabled={disabled}
          onClick={handleToggleCutList}
          title="Show cut list and BOM."
        >
          <List className="h-3 w-3 mr-2" />
          {showCutList ? 'Hide Cut List' : 'Show Cut List'}
        </Button>

        {showCutList && bomData && (
          <div className="rounded border border-border p-2 bg-muted/20">
            <CutListTable bom={bomData} />
          </div>
        )}
      </div>

      {disabled && (
        <p className="text-xs text-muted-foreground">
          Fix validation errors to enable exports.
        </p>
      )}
    </div>
  );
}
