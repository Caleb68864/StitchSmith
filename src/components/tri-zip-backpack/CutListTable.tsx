import type { ExportCutList } from '../../lib/pattern-engine/exports/cutList.js';

interface Props {
  cutList: ExportCutList;
}

export function CutListTable({ cutList }: Props) {
  return (
    <div className="space-y-4 text-sm">
      {cutList.byMaterial.length > 0 && (
        <div>
          <h3 className="font-semibold text-xs mb-2">Fabric Pieces</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1 pr-2">Material</th>
                <th className="text-right py-1 pr-2">Area (cm²)</th>
                <th className="text-left py-1">Pieces</th>
              </tr>
            </thead>
            <tbody>
              {cutList.byMaterial.map(entry => (
                <tr key={entry.materialId} className="border-b border-border/50">
                  <td className="py-1 pr-2 font-medium">{entry.materialId}</td>
                  <td className="py-1 pr-2 text-right">
                    {(entry.totalAreaMm2 / 100).toFixed(1)}
                  </td>
                  <td className="py-1 text-muted-foreground">
                    {entry.pieces.join(', ')}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cutList.byHardware.length > 0 && (
        <div>
          <h3 className="font-semibold text-xs mb-2">Hardware BOM</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1 pr-2">Item</th>
                <th className="text-right py-1">Quantity</th>
              </tr>
            </thead>
            <tbody>
              {cutList.byHardware.map(entry => (
                <tr key={entry.hardwareId} className="border-b border-border/50">
                  <td className="py-1 pr-2 font-medium">{entry.hardwareId}</td>
                  <td className="py-1 text-right">{entry.count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {cutList.byMaterial.length === 0 && cutList.byHardware.length === 0 && (
        <p className="text-xs text-muted-foreground">No items in cut list.</p>
      )}
    </div>
  );
}
