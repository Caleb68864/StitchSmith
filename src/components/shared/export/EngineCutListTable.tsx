import type { ExportCutList } from '../../../lib/pattern-engine/exports/cutList.js';

interface Props {
  cutList: ExportCutList;
}

/**
 * The engine's cut list: fabric by material (area and pieces), hardware, and
 * strip stock by material × width with the drawer length that serves each cut
 * (SOE's 3 / 3.5 / 6.5 / 8 / 10" pre-cuts).
 */
export function EngineCutListTable({ cutList }: Props) {
  const empty = cutList.byMaterial.length === 0 && cutList.byHardware.length === 0 && cutList.strips.length === 0;
  if (empty) return <p className="text-xs text-muted-foreground">No pieces to cut.</p>;
  return (
    <div className="space-y-4 text-xs" data-testid="engine-cut-list">
      {cutList.byMaterial.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Fabric by material</h3>
          <div className="overflow-x-auto"><table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1 pr-2">Material</th>
                <th className="text-right py-1 pr-2">Area (cm²)</th>
                <th className="text-left py-1">Pieces</th>
              </tr>
            </thead>
            <tbody>
              {cutList.byMaterial.map((entry) => (
                <tr key={entry.materialId} className="border-b border-border/50">
                  <td className="py-1 pr-2 font-medium">{entry.materialId}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{(entry.totalAreaMm2 / 100).toFixed(1)}</td>
                  <td className="py-1 text-muted-foreground break-words">{entry.pieces.join(', ')}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
      {cutList.strips.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Strip stock (webbing, Velcro, binding)</h3>
          <div className="overflow-x-auto"><table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1 pr-2">Material</th>
                <th className="text-right py-1 pr-2">Width (mm)</th>
                <th className="text-right py-1 pr-2">Length (mm)</th>
                <th className="text-right py-1 pr-2">Qty</th>
                <th className="text-left py-1">Drawer</th>
              </tr>
            </thead>
            <tbody>
              {cutList.strips.flatMap((strip) =>
                strip.cuts.map((cut, i) => (
                  <tr key={`${strip.materialId}-${strip.widthMm}-${i}`} className="border-b border-border/50">
                    <td className="py-1 pr-2 font-medium">{i === 0 ? strip.materialId : ''}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{strip.widthMm.toFixed(1)}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{cut.lengthMm.toFixed(1)}</td>
                    <td className="py-1 pr-2 text-right tabular-nums">{cut.quantity}</td>
                    <td className="py-1 text-muted-foreground">{cut.drawerIn === null ? 'cut to length' : `${cut.drawerIn}" pre-cut`}</td>
                  </tr>
                )),
              )}
            </tbody>
          </table></div>
        </div>
      )}
      {cutList.byHardware.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Hardware</h3>
          <div className="overflow-x-auto"><table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1 pr-2">Item</th>
                <th className="text-right py-1">Qty</th>
              </tr>
            </thead>
            <tbody>
              {cutList.byHardware.map((entry) => (
                <tr key={entry.hardwareId} className="border-b border-border/50">
                  <td className="py-1 pr-2 font-medium">{entry.hardwareId}</td>
                  <td className="py-1 text-right tabular-nums">{entry.count}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      )}
    </div>
  );
}
