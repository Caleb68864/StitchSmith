/**
 * PALS field primitive — rows of 1" webbing at a 2" pitch, bartacked into
 * 1.5" columns (vault plate-carriers/pals-spec-1in-spacing.md,
 * pals-sewn-webbing.md, pals-laser-cut-laminate.md; the modular LBV's 1.5"
 * rows are the documented divergence, `rowWidth` carries it). Emits the
 * stitch (or laser-cut slot) paths on a host piece plus the webbing to cut,
 * so every generator draws the same field and counts the same strips.
 *
 * Rows are cut long and trimmed after sewing; the column bartacks run
 * outboard of the edge margin so a malice clip clears the seam.
 */
import type { Path } from '../graph/Path.js';
import type { Edge, EdgeId } from '../graph/Edge.js';
import type { Point } from '../graph/Point.js';

const IN = 25.4;
export const PALS_ROW_WIDTH_MM = 1 * IN;
export const PALS_ROW_PITCH_MM = 2 * IN;
export const PALS_COL_PITCH_MM = 1.5 * IN;
export const PALS_EDGE_MARGIN_MM = 0.25 * IN;
/** Sewn rows are cut this much long and trimmed flush (reference/technique-stitch-shrinkage.md). */
export const PALS_ROW_OVERCUT_MM = 1 * IN;

export type PalsStyle = 'sewn' | 'laser' | 'fabricated';

export interface PalsFieldSpec {
  /** Top-left of the area the field may occupy, in the host piece's flat mm. */
  origin: Point;
  width: number;
  height: number;
  /** Webbing width, mm. Default 1". */
  rowWidth?: number;
  /** Row pitch, mm. Default 2" (1" gap). */
  rowPitch?: number;
  /** Column pitch, mm. Default 1.5" — immutable for PALS compatibility. */
  colPitch?: number;
  /** Margin kept clear of the area's edges, mm. Default 1/4". */
  edgeMargin?: number;
  /** Rows to emit; default as many as fit. */
  rows?: number;
  /** Columns (cells) across; default as many as fit. */
  cols?: number;
  style?: PalsStyle;
  /** Centre the rows and columns in the area (default) or hang them from the top-left. */
  centred?: boolean;
  idPrefix: string;
  eid: () => EdgeId;
}

export interface PalsFieldResult {
  paths: Path[];
  rows: number;
  cols: number;
  /** Top y of each row (mm). */
  rowY: number[];
  /** x of each bartack column line, cols + 1 of them (mm). */
  colX: number[];
  /** Span of the sewn field: first to last column line. */
  fieldWidth: number;
  fieldHeight: number;
  /** Webbing to cut for sewn/fabricated fields (none for laser). */
  webbing: { lengthMm: number; quantity: number; widthMm: number };
  warnings: string[];
}

function seg(eid: () => EdgeId, role: Edge['role'], a: Point, b: Point): Edge {
  return { kind: 'straight', id: eid(), role, start: a, end: b };
}

export function buildPalsField(spec: PalsFieldSpec): PalsFieldResult {
  const rowWidth = spec.rowWidth ?? PALS_ROW_WIDTH_MM;
  const rowPitch = spec.rowPitch ?? PALS_ROW_PITCH_MM;
  const colPitch = spec.colPitch ?? PALS_COL_PITCH_MM;
  const margin = spec.edgeMargin ?? PALS_EDGE_MARGIN_MM;
  const style = spec.style ?? 'sewn';
  const warnings: string[] = [];
  const usableW = spec.width - 2 * margin;
  const usableH = spec.height - 2 * margin;
  const maxCols = Math.max(0, Math.floor(usableW / colPitch + 1e-9));
  const maxRows = Math.max(0, Math.floor((usableH - rowWidth) / rowPitch + 1e-9) + 1);
  let cols = spec.cols ?? maxCols;
  let rows = spec.rows ?? maxRows;
  if (cols > maxCols) { warnings.push(`${cols} PALS columns at 1.5" need ${((cols * colPitch + 2 * margin) / IN).toFixed(2)}" of width; ${(spec.width / IN).toFixed(2)}" fits ${maxCols}. Off-grid spans will not mount up in spec spacing.`); cols = maxCols; }
  if (rows > maxRows) { warnings.push(`${rows} PALS rows need ${((rows * rowPitch - (rowPitch - rowWidth) + 2 * margin) / IN).toFixed(2)}" of height; ${(spec.height / IN).toFixed(2)}" fits ${maxRows}.`); rows = maxRows; }
  if (Math.abs(colPitch - PALS_COL_PITCH_MM) > 1e-6) warnings.push('Column pitch is not 1.5": pouches built to the PALS spec will not mount.');
  if (Math.abs(rowWidth - PALS_ROW_WIDTH_MM) > 1e-6) warnings.push(`Rows are ${(rowWidth / IN).toFixed(2)}" wide, not the 1" spec: slot pitch stays compatible, webbing width does not.`);
  const fieldWidth = cols * colPitch;
  const fieldHeight = rows > 0 ? (rows - 1) * rowPitch + rowWidth : 0;
  const centred = spec.centred ?? true;
  const x0 = spec.origin.x + (centred ? (spec.width - fieldWidth) / 2 : margin);
  const y0 = spec.origin.y + (centred ? (spec.height - fieldHeight) / 2 : margin);
  const colX = Array.from({ length: cols + 1 }, (_, i) => x0 + i * colPitch);
  const rowY = Array.from({ length: rows }, (_, r) => y0 + r * rowPitch);
  const paths: Path[] = [];
  if (rows > 0 && cols > 0) {
    for (let r = 0; r < rows; r++) {
      const y = rowY[r];
      if (style === 'laser') {
        // Slots between bridges: each cell is a slot the width of the pitch less a 1/4" bridge.
        for (let c = 0; c < cols; c++) {
          const sx = colX[c] + 0.125 * IN, ex = colX[c + 1] - 0.125 * IN;
          const sy = y + (rowWidth - 0.375 * IN) / 2, ey = sy + 0.375 * IN;
          paths.push({ id: `${spec.idPrefix}-slot-${r}-${c}`, closed: true, label: r === 0 && c === 0 ? `Laser-cut PALS slots, ${cols} × ${rows}` : undefined, edges: [seg(spec.eid, 'cut', { x: sx, y: sy }, { x: ex, y: sy }), seg(spec.eid, 'cut', { x: ex, y: sy }, { x: ex, y: ey }), seg(spec.eid, 'cut', { x: ex, y: ey }, { x: sx, y: ey }), seg(spec.eid, 'cut', { x: sx, y: ey }, { x: sx, y: sy })] });
        }
      } else {
        // Row edges (the webbing outline) and a bartack at every column line, all columns sewn in one direction.
        paths.push({ id: `${spec.idPrefix}-row-${r}`, closed: false, label: r === 0 ? `${style === 'fabricated' ? 'Fabricated' : 'Webbing'} PALS rows: ${rows} × ${(rowWidth / IN).toFixed(2)}" at a ${(rowPitch / IN).toFixed(0)}" pitch, ${cols} columns at 1.5"` : undefined, edges: [seg(spec.eid, 'stitch', { x: colX[0], y }, { x: colX[cols], y }), seg(spec.eid, 'stitch', { x: colX[cols], y: y + rowWidth }, { x: colX[0], y: y + rowWidth })] });
        for (let c = 0; c <= cols; c++) paths.push({ id: `${spec.idPrefix}-bartack-${r}-${c}`, closed: false, edges: [seg(spec.eid, 'stitch', { x: colX[c], y }, { x: colX[c], y: y + rowWidth })] });
      }
    }
  }
  return {
    paths, rows, cols, rowY, colX, fieldWidth, fieldHeight,
    webbing: style === 'laser' || rows === 0 ? { lengthMm: 0, quantity: 0, widthMm: rowWidth } : { lengthMm: fieldWidth + PALS_ROW_OVERCUT_MM, quantity: rows, widthMm: rowWidth },
    warnings,
  };
}
