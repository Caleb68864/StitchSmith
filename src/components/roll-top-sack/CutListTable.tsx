import type { Bom } from '../../generators/roll-top-sack/types.js';

interface Props {
  bom: Bom;
}

export function CutListTable({ bom }: Props) {
  return (
    <div className="space-y-4 text-sm">
      {bom.materials.length > 0 && (
        <div>
          <h3 className="font-semibold text-xs mb-2">Materials</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1 pr-2">Item</th>
                <th className="text-left py-1">Notes</th>
              </tr>
            </thead>
            <tbody>
              {bom.materials.map(m => (
                <tr key={m.id} className="border-b border-border/50">
                  <td className="py-1 pr-2 font-medium">{m.name}</td>
                  <td className="py-1 text-muted-foreground">{m.notes ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bom.hardware.length > 0 && (
        <div>
          <h3 className="font-semibold text-xs mb-2">Hardware</h3>
          <table className="w-full text-xs border-collapse">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left py-1 pr-2">Item</th>
                <th className="text-right py-1">Qty</th>
              </tr>
            </thead>
            <tbody>
              {bom.hardware.map(h => (
                <tr key={h.id} className="border-b border-border/50">
                  <td className="py-1 pr-2 font-medium">{h.name}</td>
                  <td className="py-1 text-right">{h.quantity}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {bom.notes.length > 0 && (
        <div>
          <h3 className="font-semibold text-xs mb-2">Notes</h3>
          <ul className="space-y-1">
            {bom.notes.map((n, i) => (
              <li key={i} className="text-xs text-muted-foreground">
                {n}
              </li>
            ))}
          </ul>
        </div>
      )}

      {bom.materials.length === 0 && bom.hardware.length === 0 && (
        <p className="text-xs text-muted-foreground">No items in cut list.</p>
      )}
    </div>
  );
}
