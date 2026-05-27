import type { MagPouchBom } from '../../generators/mag-pouch/types.js';

export interface CutPieceRow {
  id: string;
  name: string;
  /** Width of the cut piece in mm. */
  widthMm: number;
  /** Height/length of the cut piece in mm (called sizeMm for BOM discipline). */
  sizeMm: number;
  quantity: number;
  notes?: string;
}

interface Props {
  bom: MagPouchBom;
  cutPieces?: CutPieceRow[];
}

export function CutListTable({ bom, cutPieces }: Props) {
  return (
    <div className="space-y-4 text-xs">
      {cutPieces && cutPieces.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Cut Pieces</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1 pr-2">Name</th>
                <th className="text-right py-1 pr-2">Width (mm)</th>
                <th className="text-right py-1 pr-2">Size (mm)</th>
                <th className="text-right py-1 pr-2">Qty</th>
                <th className="text-left py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {cutPieces.map(row => (
                <tr key={row.id} className="border-b border-border/50">
                  <td className="py-1 pr-2 font-medium">{row.name}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{row.widthMm.toFixed(1)}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{row.sizeMm.toFixed(1)}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{row.quantity}</td>
                  <td className="py-1 text-muted-foreground">{row.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bom.materials.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Materials</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1 pr-2">Material</th>
                <th className="text-left py-1 pr-2">Type</th>
                <th className="text-left py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {bom.materials.map(mat => (
                <tr key={mat.id} className="border-b border-border/50">
                  <td className="py-1 pr-2 font-medium">{mat.name}</td>
                  <td className="py-1 pr-2 text-muted-foreground">{mat.type}</td>
                  <td className="py-1 text-muted-foreground">{mat.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bom.hardware.length > 0 && (
        <div>
          <h3 className="font-semibold mb-2">Hardware BOM</h3>
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1 pr-2">Item</th>
                <th className="text-left py-1 pr-2">Type</th>
                <th className="text-right py-1 pr-2">Qty</th>
                <th className="text-left py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {bom.hardware.map(hw => (
                <tr key={hw.id} className="border-b border-border/50">
                  <td className="py-1 pr-2 font-medium">{hw.name}</td>
                  <td className="py-1 pr-2 text-muted-foreground">{hw.type}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{hw.quantity}</td>
                  <td className="py-1 text-muted-foreground">{hw.notes ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bom.materials.length === 0 && bom.hardware.length === 0 && (!cutPieces || cutPieces.length === 0) && (
        <p className="text-muted-foreground">No items in BOM.</p>
      )}
    </div>
  );
}
