import type { Pattern } from '../graph/Pattern.js';
import type { Material } from '../materials/Material.js';
import type { Hardware } from '../materials/Hardware.js';
import { bboxFromPiece } from '../geometry/bbox.js';

export interface MaterialCutEntry {
  materialId: string;
  totalAreaMm2: number;
  pieces: string[];
}

export interface HardwareBomEntry {
  hardwareId: string;
  count: number;
}

export interface ExportCutList {
  byMaterial: MaterialCutEntry[];
  byHardware: HardwareBomEntry[];
}

export function exportCutList(
  pattern: Pattern,
  _materials: Material[],
  hardware: Hardware[],
): ExportCutList {
  const byMaterialMap = new Map<string, { totalAreaMm2: number; pieces: string[] }>();

  for (const piece of pattern.pieces) {
    const matId = piece.materialId ?? 'unspecified';
    const bbox = bboxFromPiece(piece);
    const areaMm2 = bbox.width * bbox.height * piece.quantity;

    const existing = byMaterialMap.get(matId);
    if (existing) {
      existing.totalAreaMm2 += areaMm2;
      existing.pieces.push(piece.id);
    } else {
      byMaterialMap.set(matId, { totalAreaMm2: areaMm2, pieces: [piece.id] });
    }
  }

  const byMaterial: MaterialCutEntry[] = Array.from(byMaterialMap.entries()).map(
    ([materialId, entry]) => ({
      materialId,
      totalAreaMm2: entry.totalAreaMm2,
      pieces: entry.pieces,
    }),
  );

  const byHardware: HardwareBomEntry[] = hardware.map((hw) => ({
    hardwareId: hw.id,
    count: hw.quantity,
  }));

  return { byMaterial, byHardware };
}

/** RFC 4180 field quoting: wrap in quotes when the value contains , " or newlines. */
function csvField(value: string | number): string {
  const s = String(value);
  return /[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function exportCutListCsv(
  cutList: ExportCutList,
  materials: Material[],
): string {
  const matMap = new Map(materials.map((m) => [m.id, m]));
  const lines = ['Material ID,Material Name,Total Area (mm²),Pieces'];
  for (const entry of cutList.byMaterial) {
    const name = matMap.get(entry.materialId)?.name ?? entry.materialId;
    lines.push(
      [entry.materialId, name, entry.totalAreaMm2.toFixed(2), entry.pieces.join('; ')]
        .map(csvField)
        .join(','),
    );
  }
  lines.push('');
  lines.push('Hardware ID,Count');
  for (const entry of cutList.byHardware) {
    lines.push([entry.hardwareId, entry.count].map(csvField).join(','));
  }
  return lines.join('\n');
}
