import type { SimpleBomRow, StructuredBom } from './exportAdapter.js';

/** Flat BOM rows: item, quantity, unit (most generators). */
export function SimpleBomTable({ bom }: { bom: SimpleBomRow[] }) {
  if (bom.length === 0) return <p className="text-xs text-muted-foreground">No items in cut list.</p>;
  return (
    <table className="w-full border-collapse text-xs" data-testid="bom-table">
      <thead>
        <tr className="border-b border-border">
          <th className="text-left py-1 pr-2">Item</th>
          <th className="text-right py-1 pr-2">Qty</th>
          <th className="text-left py-1">Unit</th>
        </tr>
      </thead>
      <tbody>
        {bom.map((row) => (
          <tr key={row.id} className="border-b border-border/50">
            <td className="py-1 pr-2 font-medium">
              {row.description}
              {row.notes && <span className="ml-1 text-muted-foreground font-normal">({row.notes})</span>}
            </td>
            <td className="py-1 pr-2 text-right tabular-nums">{row.quantity}</td>
            <td className="py-1 text-muted-foreground">{row.unit}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** Materials / hardware / notes BOM (Roll-Top, Book Cover). */
export function StructuredBomTable({ bom }: { bom: StructuredBom }) {
  const notes = bom.notes ?? [];
  if (bom.materials.length === 0 && bom.hardware.length === 0 && notes.length === 0) {
    return <p className="text-xs text-muted-foreground">No items in BOM.</p>;
  }
  return (
    <div className="space-y-3 text-xs" data-testid="bom-table">
      {bom.materials.length > 0 && (
        <div>
          <h3 className="font-semibold mb-1">Materials</h3>
          <table className="w-full border-collapse">
            <tbody>
              {bom.materials.map((m, i) => (
                <tr key={m.id ?? i} className="border-b border-border/50">
                  <td className="py-1 pr-2 font-medium">{m.name}{m.widthMm ? ` (${m.widthMm} mm wide)` : ''}</td>
                  <td className="py-1 text-muted-foreground">{m.notes ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {bom.hardware.length > 0 && (
        <div>
          <h3 className="font-semibold mb-1">Hardware</h3>
          <table className="w-full border-collapse">
            <tbody>
              {bom.hardware.map((h, i) => (
                <tr key={h.id ?? i} className="border-b border-border/50">
                  <td className="py-1 pr-2 font-medium">{h.name}</td>
                  <td className="py-1 pr-2 text-right tabular-nums">{h.quantity}</td>
                  <td className="py-1 text-muted-foreground">{h.notes ?? ''}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {notes.length > 0 && (
        <div>
          <h3 className="font-semibold mb-1">Notes</h3>
          <ul className="list-disc pl-4 text-muted-foreground space-y-0.5">
            {notes.map((n, i) => <li key={i}>{n}</li>)}
          </ul>
        </div>
      )}
    </div>
  );
}
