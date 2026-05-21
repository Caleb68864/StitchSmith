import type { ToolRollSettings } from '../../generators/tool-roll/types.js';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from '../ui/accordion.js';
import { Input } from '../ui/input.js';
import { Label } from '../ui/label.js';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select.js';
import { Switch } from '../ui/switch.js';

interface SettingsPanelProps {
  settings: ToolRollSettings;
  units: 'mm' | 'in';
  onUpdate: (changes: Partial<ToolRollSettings>) => void;
  onUnitsChange: (u: 'mm' | 'in') => void;
}

function NumInput({
  id,
  value,
  units,
  onChange,
  min = 0,
}: {
  id: string;
  value: number;
  units: 'mm' | 'in';
  onChange: (v: number) => void;
  min?: number;
}) {
  const safe = Number.isFinite(value) ? value : 0;
  const display = units === 'in' ? (safe / 25.4).toFixed(3) : safe.toFixed(1);
  return (
    <Input
      id={id}
      className="h-7 text-xs w-24"
      defaultValue={display}
      key={`${id}-${units}`}
      inputMode="decimal"
      min={min}
      onBlur={e => {
        const n = parseFloat(e.target.value);
        if (isFinite(n)) onChange(units === 'in' ? n * 25.4 : n);
      }}
    />
  );
}

function Row({ label, tip, children }: { label: string; tip?: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <Label
        className={
          'text-xs text-muted-foreground flex-1 ' +
          (tip ? 'cursor-help underline decoration-dotted decoration-muted-foreground/40 underline-offset-2' : '')
        }
        title={tip}
      >
        {label}
      </Label>
      {children}
    </div>
  );
}

export function ToolRollSettingsPanel({ settings, units, onUpdate, onUnitsChange }: SettingsPanelProps) {
  return (
    <Accordion type="multiple" defaultValue={['units', 'pocket']} className="text-sm">
      {/* §23.1 — Units & Sorting */}
      <AccordionItem value="units">
        <AccordionTrigger className="text-xs font-semibold py-2">Units & Sorting</AccordionTrigger>
        <AccordionContent>
          <Row label="Unit system">
            <Select value={units} onValueChange={v => onUnitsChange(v as 'mm' | 'in')}>
              <SelectTrigger className="h-7 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="mm">mm</SelectItem>
                <SelectItem value="in">inches</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Sort mode">
            <Select
              value={settings.sortMode}
              onValueChange={v => onUpdate({ sortMode: v as ToolRollSettings['sortMode'] })}
            >
              <SelectTrigger className="h-7 text-xs w-36">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="manual">Manual</SelectItem>
                <SelectItem value="widthAscending">Width ↑</SelectItem>
                <SelectItem value="widthDescending">Width ↓</SelectItem>
                <SelectItem value="heightAscending">Height ↑</SelectItem>
                <SelectItem value="heightDescending">Height ↓</SelectItem>
                <SelectItem value="pocketDepthAscending">Pocket Depth ↑</SelectItem>
                <SelectItem value="pocketDepthDescending">Pocket Depth ↓</SelectItem>
              </SelectContent>
            </Select>
          </Row>
        </AccordionContent>
      </AccordionItem>

      {/* §23.2 — Pocket Geometry */}
      <AccordionItem value="pocket">
        <AccordionTrigger className="text-xs font-semibold py-2">Pocket Geometry</AccordionTrigger>
        <AccordionContent>
          <Row label="Pocket top style" tip="Shape of the pocket panel's top edge. Stepped = stair-steps at each pocket boundary. Sloped = straight diagonals. Smooth = S-curve per pocket. Arc = one continuous curve from leftmost to rightmost pocket.">
            <Select
              value={settings.pocketTopStyle}
              onValueChange={v => onUpdate({ pocketTopStyle: v as ToolRollSettings['pocketTopStyle'] })}
            >
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stepped">Stepped</SelectItem>
                <SelectItem value="sloped">Sloped (diagonals)</SelectItem>
                <SelectItem value="smooth">Smooth (per-pocket curves)</SelectItem>
                <SelectItem value="arc">Arc (single curve)</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Pocket height mode" tip="How depths are normalized across pockets. Individual = each pocket gets its own depth. Stepped = depths rounded up to the next increment for cleaner stair-steps. Same as tallest = every pocket uses the deepest value.">
            <Select
              value={settings.pocketHeightMode}
              onValueChange={v => onUpdate({ pocketHeightMode: v as ToolRollSettings['pocketHeightMode'] })}
            >
              <SelectTrigger className="h-7 text-xs w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="individual">Individual</SelectItem>
                <SelectItem value="steppedToIncrement">Stepped to Increment</SelectItem>
                <SelectItem value="sameAsTallest">Same as Tallest</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Pocket height increment" tip="When pocket height mode is 'Stepped to Increment', round each pocket's depth up to the nearest multiple of this value.">
            <NumInput id="pocketHeightIncrement" value={settings.pocketHeightIncrement} units={units} onChange={v => onUpdate({ pocketHeightIncrement: v })} />
          </Row>
          <Row label="Pocket depth mode" tip="Where each pocket's depth comes from. 'Visible amount' uses the per-tool field you set in the table (height − visible). '% of tool height' uses a global percentage of each tool's height.">
            <Select
              value={settings.pocketDepthMode}
              onValueChange={v => onUpdate({ pocketDepthMode: v as ToolRollSettings['pocketDepthMode'] })}
            >
              <SelectTrigger className="h-7 text-xs w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="visibleAmount">Visible amount (per tool)</SelectItem>
                <SelectItem value="heightPercentage">% of tool height</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          {settings.pocketDepthMode === 'heightPercentage' && (
            <Row label="Pocket depth (% of height)" tip="Fraction of each tool's height that becomes pocket depth. 75 means the pocket holds 75% of the tool's height; the remaining 25% sticks up visibly.">
              <Input
                id="pocketHeightPercentage"
                className="h-7 text-xs w-24"
                defaultValue={(settings.pocketHeightPercentage * 100).toFixed(0)}
                key={`pocketHeightPercentage-${settings.pocketHeightPercentage}`}
                inputMode="decimal"
                onBlur={e => {
                  const n = parseFloat(e.target.value);
                  if (isFinite(n) && n > 0 && n < 100) onUpdate({ pocketHeightPercentage: n / 100 });
                }}
              />
            </Row>
          )}
          <Row label="Group similar tools" tip="Merge multiple tools whose heights are within the tolerance into a single shared pocket. Pocket width = max width of group, thickness = sum, depth = shortest tool's height.">
            <Switch
              id="groupingEnabled"
              checked={settings.groupingEnabled}
              onCheckedChange={v => onUpdate({ groupingEnabled: v })}
            />
          </Row>
          {settings.groupingEnabled && (
            <>
              <Row label="Group height tolerance" tip="Tools whose heights span no more than this value can share a pocket. Higher values group more aggressively.">
                <NumInput
                  id="groupHeightTolerance"
                  value={settings.groupHeightTolerance}
                  units={units}
                  onChange={v => onUpdate({ groupHeightTolerance: v })}
                />
              </Row>
              <Row label="Max tools per pocket" tip="Cap on how many tools can be merged into one pocket. 2 pairs SAE+metric; 3 packs trios. 1 disables grouping effectively.">
                <Input
                  id="groupMaxSize"
                  className="h-7 text-xs w-24"
                  defaultValue={settings.groupMaxSize}
                  key={`groupMaxSize-${settings.groupMaxSize}`}
                  inputMode="numeric"
                  onBlur={e => {
                    const n = parseInt(e.target.value, 10);
                    if (Number.isFinite(n) && n >= 1 && n <= 8) onUpdate({ groupMaxSize: n });
                  }}
                />
              </Row>
            </>
          )}
          <Row label="Side gap">
            <NumInput id="sideGap" value={settings.sideGap} units={units} onChange={v => onUpdate({ sideGap: v })} />
          </Row>
          <Row label="Thickness ease factor">
            <Input
              id="thicknessEaseFactor"
              className="h-7 text-xs w-24"
              defaultValue={settings.thicknessEaseFactor}
              key={`thicknessEaseFactor-${settings.thicknessEaseFactor}`}
              inputMode="decimal"
              onBlur={e => { const n = parseFloat(e.target.value); if (isFinite(n)) onUpdate({ thicknessEaseFactor: n }); }}
            />
          </Row>
          <Row label="Minimum pocket width">
            <NumInput id="minimumPocketWidth" value={settings.minimumPocketWidth} units={units} onChange={v => onUpdate({ minimumPocketWidth: v })} />
          </Row>
          <Row label="Pocket bottom allowance">
            <NumInput id="pocketBottomAllowance" value={settings.pocketBottomAllowance} units={units} onChange={v => onUpdate({ pocketBottomAllowance: v })} />
          </Row>
        </AccordionContent>
      </AccordionItem>

      {/* §23.3 — Seam & Hems */}
      <AccordionItem value="seam">
        <AccordionTrigger className="text-xs font-semibold py-2">Seam & Hems</AccordionTrigger>
        <AccordionContent>
          <Row label="Seam allowance">
            <NumInput id="seamAllowance" value={settings.seamAllowance} units={units} onChange={v => onUpdate({ seamAllowance: v })} />
          </Row>
          <Row label="Top hem allowance">
            <NumInput id="topHemAllowance" value={settings.topHemAllowance} units={units} onChange={v => onUpdate({ topHemAllowance: v })} />
          </Row>
          <Row label="Bottom hem allowance">
            <NumInput id="bottomHemAllowance" value={settings.bottomHemAllowance} units={units} onChange={v => onUpdate({ bottomHemAllowance: v })} />
          </Row>
          <Row label="Side hem allowance">
            <NumInput id="sideHemAllowance" value={settings.sideHemAllowance} units={units} onChange={v => onUpdate({ sideHemAllowance: v })} />
          </Row>
          <Row label="Binding allowance">
            <NumInput id="bindingAllowance" value={settings.bindingAllowance} units={units} onChange={v => onUpdate({ bindingAllowance: v })} />
          </Row>
        </AccordionContent>
      </AccordionItem>

      {/* §23.4 — Layout Margins */}
      <AccordionItem value="margins">
        <AccordionTrigger className="text-xs font-semibold py-2">Layout Margins</AccordionTrigger>
        <AccordionContent>
          <Row label="Top margin">
            <NumInput id="topMargin" value={settings.topMargin} units={units} onChange={v => onUpdate({ topMargin: v })} />
          </Row>
          <Row label="Bottom margin">
            <NumInput id="bottomMargin" value={settings.bottomMargin} units={units} onChange={v => onUpdate({ bottomMargin: v })} />
          </Row>
        </AccordionContent>
      </AccordionItem>

      {/* §23.5 — Flap */}
      <AccordionItem value="flap">
        <AccordionTrigger className="text-xs font-semibold py-2">Flap</AccordionTrigger>
        <AccordionContent>
          <Row label="Enable flap" tip="Adds a flap piece that folds down over the tools to keep them from falling out when the roll is bundled.">
            <Switch checked={settings.flapEnabled} onCheckedChange={v => onUpdate({ flapEnabled: v })} />
          </Row>
          <Row label="Flap height mode" tip="How the flap's height/shape is determined. 'Match pocket profile' makes the flap follow the pocket tops so every tool gets the same overlap. 'Cover tallest tool' sizes a flat rectangle to the tallest tool's visible portion + overlap. 'Cover shortest tool' shorter; useful when you don't want extra fabric. 'Based on Pocket Depth' is the legacy heuristic. 'Fixed' uses a hand-set height.">
            <Select
              value={settings.flapHeightMode}
              onValueChange={v => onUpdate({ flapHeightMode: v as ToolRollSettings['flapHeightMode'] })}
            >
              <SelectTrigger className="h-7 text-xs w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="matchPockets">Match pocket profile</SelectItem>
                <SelectItem value="basedOnTallestTool">Cover tallest tool</SelectItem>
                <SelectItem value="shortestTool">Cover shortest tool</SelectItem>
                <SelectItem value="basedOnPocketDepth">Based on Pocket Depth</SelectItem>
                <SelectItem value="fixed">Fixed</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Flap overlap (past pocket top)" tip="How far past each pocket's top the flap reaches when folded over. Higher = more coverage, more fabric needed. Typical: 0.5″–1″ (12.7–25.4 mm).">
            <NumInput id="flapOverlap" value={settings.flapOverlap} units={units} onChange={v => onUpdate({ flapOverlap: v })} />
          </Row>
          {settings.flapHeightMode === 'matchPockets' && (
            <Row label="Flap edge style" tip="Shape of the flap's free edge when matching the pocket profile. Same four options as the pocket top style: Stepped / Sloped / Smooth / Arc.">
              <Select
                value={settings.flapTopStyle}
                onValueChange={v => onUpdate({ flapTopStyle: v as ToolRollSettings['flapTopStyle'] })}
              >
                <SelectTrigger className="h-7 text-xs w-40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="stepped">Stepped</SelectItem>
                  <SelectItem value="sloped">Sloped (diagonals)</SelectItem>
                  <SelectItem value="smooth">Smooth (per-pocket curves)</SelectItem>
                  <SelectItem value="arc">Arc (single curve)</SelectItem>
                </SelectContent>
              </Select>
            </Row>
          )}
          {settings.flapHeightMode === 'fixed' && (
            <Row label="Flap height" tip="Body height of the flap. The cut piece adds the flap hem + flap seam allowance on top of this.">
              <NumInput id="flapHeight" value={settings.flapHeight} units={units} onChange={v => onUpdate({ flapHeight: v })} />
            </Row>
          )}
          <Row label="Flap hem allowance" tip="Extra fabric folded under the flap's free edge for a finished hem. Typical: 3/8″ (9.5 mm).">
            <NumInput id="flapHemAllowance" value={settings.flapHemAllowance} units={units} onChange={v => onUpdate({ flapHemAllowance: v })} />
          </Row>
          <Row label="Flap seam allowance" tip="Extra fabric at the flap's attachment edge where it's sewn to the back panel. Typical: 3/8″ (9.5 mm).">
            <NumInput id="flapSeamAllowance" value={settings.flapSeamAllowance} units={units} onChange={v => onUpdate({ flapSeamAllowance: v })} />
          </Row>
        </AccordionContent>
      </AccordionItem>

      {/* §23.6 — Tie */}
      <AccordionItem value="tie">
        <AccordionTrigger className="text-xs font-semibold py-2">Tie</AccordionTrigger>
        <AccordionContent>
          <Row label="Enable tie">
            <Switch checked={settings.tieEnabled} onCheckedChange={v => onUpdate({ tieEnabled: v })} />
          </Row>
          <Row label="Tie placement">
            <Select
              value={settings.tiePlacementMode}
              onValueChange={v => onUpdate({ tiePlacementMode: v as ToolRollSettings['tiePlacementMode'] })}
            >
              <SelectTrigger className="h-7 text-xs w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="centered">Centered</SelectItem>
                <SelectItem value="basedOnRollDiameter">Based on Roll Diameter</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Tie width">
            <NumInput id="tieWidth" value={settings.tieWidth} units={units} onChange={v => onUpdate({ tieWidth: v })} />
          </Row>
          <Row label="Tie length">
            <NumInput id="tieLength" value={settings.tieLength} units={units} onChange={v => onUpdate({ tieLength: v })} />
          </Row>
          <Row label="Tie position X">
            <NumInput id="tiePositionX" value={settings.tiePositionX} units={units} onChange={v => onUpdate({ tiePositionX: v })} />
          </Row>
        </AccordionContent>
      </AccordionItem>

      {/* §23.7 — Print */}
      <AccordionItem value="print">
        <AccordionTrigger className="text-xs font-semibold py-2">Print</AccordionTrigger>
        <AccordionContent>
          <Row label="Paper size">
            <Select
              value={settings.printPaperSize}
              onValueChange={v => onUpdate({ printPaperSize: v as ToolRollSettings['printPaperSize'] })}
            >
              <SelectTrigger className="h-7 text-xs w-24">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="letter">Letter</SelectItem>
                <SelectItem value="a4">A4</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Orientation">
            <Select
              value={settings.printOrientation}
              onValueChange={v => onUpdate({ printOrientation: v as ToolRollSettings['printOrientation'] })}
            >
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="portrait">Portrait</SelectItem>
                <SelectItem value="landscape">Landscape</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Print margin">
            <NumInput id="printMargin" value={settings.printMargin} units={units} onChange={v => onUpdate({ printMargin: v })} />
          </Row>
          <Row label="Tile overlap">
            <NumInput id="tileOverlap" value={settings.tileOverlap} units={units} onChange={v => onUpdate({ tileOverlap: v })} />
          </Row>
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
