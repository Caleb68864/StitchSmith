import type { BomRow } from '../../generators/zip-pouch/types.js';

interface Props {
  bom: BomRow[];
}

export function CutListTable({ bom }: Props) {
  if (bom.length === 0) {
    return <p className="text-xs text-muted-foreground">No items in cut list.</p>;
  }

  return (
    <div className="space-y-2 text-xs">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-border">
            <th className="text-left py-1 pr-2">Item</th>
            <th className="text-right py-1 pr-2">Qty</th>
            <th className="text-left py-1">Unit</th>
          </tr>
        </thead>
        <tbody>
          {bom.map(row => (
            <tr key={row.id} className="border-b border-border/50">
              <td className="py-1 pr-2 font-medium">
                {row.description}
                {row.notes && (
                  <span className="ml-1 text-muted-foreground font-normal">({row.notes})</span>
                )}
              </td>
              <td className="py-1 pr-2 text-right">{row.quantity}</td>
              <td className="py-1 text-muted-foreground">{row.unit}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
