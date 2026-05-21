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
  const display = units === 'in' ? (value / 25.4).toFixed(3) : value.toFixed(1);
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

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 py-1">
      <Label className="text-xs text-muted-foreground flex-1">{label}</Label>
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
          <Row label="Pocket top style">
            <Select
              value={settings.pocketTopStyle}
              onValueChange={v => onUpdate({ pocketTopStyle: v as ToolRollSettings['pocketTopStyle'] })}
            >
              <SelectTrigger className="h-7 text-xs w-28">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="stepped">Stepped</SelectItem>
                <SelectItem value="sloped">Sloped</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Pocket height mode">
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
          <Row label="Pocket height increment">
            <NumInput id="pocketHeightIncrement" value={settings.pocketHeightIncrement} units={units} onChange={v => onUpdate({ pocketHeightIncrement: v })} />
          </Row>
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
          <Row label="Enable flap">
            <Switch checked={settings.flapEnabled} onCheckedChange={v => onUpdate({ flapEnabled: v })} />
          </Row>
          <Row label="Flap height mode">
            <Select
              value={settings.flapHeightMode}
              onValueChange={v => onUpdate({ flapHeightMode: v as ToolRollSettings['flapHeightMode'] })}
            >
              <SelectTrigger className="h-7 text-xs w-44">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="fixed">Fixed</SelectItem>
                <SelectItem value="basedOnTallestTool">Based on Tallest Tool</SelectItem>
                <SelectItem value="basedOnPocketDepth">Based on Pocket Depth</SelectItem>
              </SelectContent>
            </Select>
          </Row>
          <Row label="Flap height">
            <NumInput id="flapHeight" value={settings.flapHeight} units={units} onChange={v => onUpdate({ flapHeight: v })} />
          </Row>
          <Row label="Flap hem allowance">
            <NumInput id="flapHemAllowance" value={settings.flapHemAllowance} units={units} onChange={v => onUpdate({ flapHemAllowance: v })} />
          </Row>
          <Row label="Flap seam allowance">
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
