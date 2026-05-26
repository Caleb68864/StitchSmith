import type { Piece } from '../graph/Piece.js';
import type { Material } from './Material.js';
import type { Hardware } from './Hardware.js';

export interface CutEntry {
  pieceId: string;
  pieceName: string;
  materialId: string;
  materialName: string;
  quantity: number;
  mirror: boolean;
}

export interface CutList {
  entries: CutEntry[];
  hardware: Hardware[];
}

export function buildCutList(
  pieces: Piece[],
  materials: Material[],
  hardware: Hardware[],
): CutList {
  const matMap = new Map(materials.map((m) => [m.id, m]));
  const entries: CutEntry[] = pieces.map((piece) => {
    const mat = piece.materialId ? matMap.get(piece.materialId) : undefined;
    return {
      pieceId: piece.id,
      pieceName: piece.name,
      materialId: piece.materialId ?? 'unspecified',
      materialName: mat?.name ?? 'Unspecified',
      quantity: piece.quantity,
      mirror: piece.mirror,
    };
  });
  return { entries, hardware };
}

export function renderCutListMarkdown(cutList: CutList): string {
  const lines: string[] = ['# Cut List', ''];
  lines.push('## Fabric Pieces', '');
  lines.push('| Piece | Material | Qty | Mirror |');
  lines.push('|-------|----------|-----|--------|');
  for (const e of cutList.entries) {
    const qty = e.mirror ? `${e.quantity} + ${e.quantity} mirrored` : String(e.quantity);
    lines.push(`| ${e.pieceName} | ${e.materialName} | ${qty} | ${e.mirror ? 'Yes' : 'No'} |`);
  }
  if (cutList.hardware.length > 0) {
    lines.push('', '## Hardware', '');
    lines.push('| Item | Type | Qty |');
    lines.push('|------|------|-----|');
    for (const hw of cutList.hardware) {
      lines.push(`| ${hw.name} | ${hw.type} | ${hw.quantity} |`);
    }
  }
  return lines.join('\n');
}
