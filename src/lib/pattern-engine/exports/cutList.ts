import type { Pattern } from '../graph/Pattern.js';
import type { Piece } from '../graph/Piece.js';
import type { Material } from '../materials/Material.js';
import type { Hardware } from '../materials/Hardware.js';
import { bboxFromPieceWithSa } from '../geometry/saBbox.js';

export interface MaterialCutEntry {
  materialId: string;
  totalAreaMm2: number;
  pieces: string[];
}

export interface HardwareBomEntry {
  hardwareId: string;
  count: number;
}

/**
 * Strip stock (webbing, Velcro, binding, elastic) grouped by material and
 * width: what to pull from which drawer. Lengths round up to SOE's standard
 * pre-cut drawer lengths (3, 3.5, 6.5, 8, 10") when one fits, else to the
 * next half inch (reference/soe-production-principles.md).
 */
export interface StripCutEntry {
  materialId: string;
  widthMm: number;
  /** Each distinct cut length (mm) with its count and the drawer length that serves it. */
  cuts: { lengthMm: number; quantity: number; drawerIn: number | null; pieces: string[] }[];
  totalLengthMm: number;
}

export interface ExportCutList {
  byMaterial: MaterialCutEntry[];
  byHardware: HardwareBomEntry[];
  /** Strip stock by material × width; empty when nothing is strip-like. */
  strips: StripCutEntry[];
}

/** SOE's pre-cut drawer lengths, inches. */
export const DRAWER_LENGTHS_IN = [3, 3.5, 6.5, 8, 10] as const;
const STRIP_MATERIAL = /^(webbing|velcro|binding|elastic|grosgrain|cord|bungee|tape)(?![a-z])/i; // 'cord', not 'cordura'

/** Nearest drawer length at or above `lengthMm` (null when longer than the longest drawer). */
export function drawerLengthFor(lengthMm: number): number | null {
  const inches = lengthMm / 25.4;
  for (const d of DRAWER_LENGTHS_IN) if (inches <= d + 1e-6) return d;
  return null;
}

/** True when a piece is strip stock: a strip-like material id or a rectangle at least 6× longer than wide. */
export function isStripPiece(piece: Piece, bbox: { width: number; height: number }): boolean {
  if (piece.materialId && STRIP_MATERIAL.test(piece.materialId)) return true;
  const long = Math.max(bbox.width, bbox.height), short = Math.min(bbox.width, bbox.height);
  return short > 0 && long / short >= 6 && piece.paths.length === 1;
}

export function stripSummary(pattern: Pattern): StripCutEntry[] {
  const groups = new Map<string, StripCutEntry>();
  for (const piece of pattern.pieces) {
    const bbox = bboxFromPieceWithSa(piece, 0);
    if (!isStripPiece(piece, bbox)) continue;
    const widthMm = Math.round(Math.min(bbox.width, bbox.height) * 10) / 10;
    const lengthMm = Math.round(Math.max(bbox.width, bbox.height) * 10) / 10;
    const materialId = piece.materialId ?? 'unspecified';
    const key = `${materialId}|${widthMm}`;
    const entry = groups.get(key) ?? { materialId, widthMm, cuts: [], totalLengthMm: 0 };
    const cut = entry.cuts.find((c) => Math.abs(c.lengthMm - lengthMm) < 0.05);
    if (cut) { cut.quantity += piece.quantity; cut.pieces.push(piece.id); }
    else entry.cuts.push({ lengthMm, quantity: piece.quantity, drawerIn: drawerLengthFor(lengthMm), pieces: [piece.id] });
    entry.totalLengthMm += lengthMm * piece.quantity;
    groups.set(key, entry);
  }
  return [...groups.values()].map((e) => ({ ...e, cuts: e.cuts.sort((a, b) => a.lengthMm - b.lengthMm) })).sort((a, b) => a.materialId.localeCompare(b.materialId) || a.widthMm - b.widthMm);
}

export interface CutListOptions {
  /**
   * Default seam allowance (mm) for pieces without per-edge `seamAllowances`.
   * Yardage is computed on the SA-inclusive cut outline — the fabric a piece
   * actually consumes — so pass the same value the SVG/PDF exporters receive.
   */
  defaultSeamAllowance?: number;
}

export function exportCutList(
  pattern: Pattern,
  _materials: Material[],
  hardware: Hardware[],
  options: CutListOptions = {},
): ExportCutList {
  const byMaterialMap = new Map<string, { totalAreaMm2: number; pieces: string[] }>();
  const defaultSa = options.defaultSeamAllowance ?? 0;

  for (const piece of pattern.pieces) {
    const matId = piece.materialId ?? 'unspecified';
    const bbox = bboxFromPieceWithSa(piece, defaultSa);
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

  return { byMaterial, byHardware, strips: stripSummary(pattern) };
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
  if (cutList.strips.length > 0) {
    lines.push('');
    lines.push('Strip Material,Width (mm),Length (mm),Quantity,Drawer (in),Pieces');
    for (const strip of cutList.strips) {
      for (const cut of strip.cuts) {
        lines.push([strip.materialId, strip.widthMm, cut.lengthMm, cut.quantity, cut.drawerIn ?? 'cut to length', cut.pieces.join('; ')].map(csvField).join(','));
      }
    }
  }
  return lines.join('\n');
}
