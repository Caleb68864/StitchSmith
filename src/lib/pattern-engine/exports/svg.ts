import type { Pattern } from '../graph/Pattern.js';
import type { Piece, PieceAnnotation } from '../graph/Piece.js';
import type { Path } from '../graph/Path.js';
import type { Edge } from '../graph/Edge.js';
import type { BoundingBox } from '../geometry/bbox.js';
import { bboxFromPieceWithSa } from '../geometry/saBbox.js';
import { assertFinitePattern } from '../graph/validate.js';
import { computeSeamAllowancePolygon } from '../geometry/offset.js';

function edgeToSvgCommands(edge: Edge, isFirst: boolean): string {
  switch (edge.kind) {
    case 'straight': {
      const move = isFirst ? `M ${edge.start.x} ${edge.start.y} ` : '';
      return `${move}L ${edge.end.x} ${edge.end.y}`;
    }
    case 'arc': {
      const move = isFirst ? `M ${edge.start.x} ${edge.start.y} ` : '';
      const sweep = edge.clockwise ? 1 : 0;
      return `${move}A ${edge.radius} ${edge.radius} 0 0 ${sweep} ${edge.end.x} ${edge.end.y}`;
    }
    case 'bezier': {
      const move = isFirst ? `M ${edge.start.x} ${edge.start.y} ` : '';
      return `${move}C ${edge.cp1.x} ${edge.cp1.y}, ${edge.cp2.x} ${edge.cp2.y}, ${edge.end.x} ${edge.end.y}`;
    }
  }
}

function pathToSvgPath(path: Path, role?: string): string {
  if (path.edges.length === 0) return '';
  const d = path.edges
    .map((edge, i) => {
      const prevEdge = path.edges[i - 1];
      const needsMove =
        i === 0 ||
        prevEdge.end.x !== edge.start.x ||
        prevEdge.end.y !== edge.start.y;
      return edgeToSvgCommands(edge, needsMove);
    })
    .join(' ');
  const close = path.closed ? ' Z' : '';
  // Visual convention:
  //   cut    — black solid (the line the cutter follows)
  //   fold   — blue dashed  (crease here; label says which side folds)
  //   seam   — red solid    (continuous stitch line, e.g. the side seam)
  //   stitch — red dashed   (construction marker / stitch reference, e.g.
  //                          where the boxed-corner seam lands after folding)
  //   notch  — purple solid (small registration tick)
  let stroke = '#000000';
  if (role === 'fold') stroke = '#0066cc';
  else if (role === 'seam' || role === 'stitch') stroke = '#cc0000';
  else if (role === 'notch') stroke = '#7c3aed';
  let strokeDash = '';
  if (role === 'fold') strokeDash = ' stroke-dasharray="5,3"';
  else if (role === 'stitch') strokeDash = ' stroke-dasharray="3,2"';
  const pathEl = `<path d="${d}${close}" fill="none" stroke="${stroke}" stroke-width="0.5"${strokeDash}/>`;

  if (!path.label) return pathEl;

  // Draw the label near the start of the first edge, offset slightly along the
  // line's normal so it doesn't overlap the dashes. For open horizontal lines
  // (the typical fold/stitch case) the label sits 4 mm above the line.
  const first = path.edges[0];
  if (first.kind !== 'straight') return pathEl;
  const labelX = first.start.x + 8;
  const labelY = first.start.y - 4;
  const labelEl = `<text x="${labelX}" y="${labelY}" font-size="6" font-family="sans-serif" fill="${stroke}" opacity="0.85" pointer-events="none">${escXml(path.label)}</text>`;
  return `${pathEl}\n  ${labelEl}`;
}

/** A closed path made of cut edges — the only kind that carries a seam allowance. */
export function isCutOutline(path: Path): boolean {
  return path.closed && path.edges.length > 0 && path.edges.every((e) => e.role === 'cut' || e.role === undefined);
}

function saPolygonToSvgPath(vertices: { x: number; y: number }[]): string {
  if (vertices.length < 3) return '';
  const d = vertices
    .map((v, i) => (i === 0 ? `M ${v.x} ${v.y}` : `L ${v.x} ${v.y}`))
    .join(' ');
  return `<path d="${d} Z" fill="none" stroke="#2e7d32" stroke-width="0.4" stroke-dasharray="3,2"/>`;
}

function pieceToSvgGroup(
  piece: Piece,
  offsetX: number,
  offsetY: number,
  defaultSa: number,
  showLabels: boolean,
  bbox: BoundingBox,
  showAnnotations = true,
): string {
  const parts: string[] = [];

  // SA outer cut line drawn first so the body cut line strokes on top.
  if (piece.seamAllowances || defaultSa > 0) {
    for (const path of piece.paths) {
      // Only cut outlines take an allowance: a closed stitch/fold mark (a Velcro
      // outline, a grommet patch) must never grow a green line of its own.
      if (!path.closed || !isCutOutline(path)) continue;
      const saResult = computeSeamAllowancePolygon(piece, path, defaultSa);
      if (saResult.ok && saResult.value) {
        parts.push(saPolygonToSvgPath(saResult.value));
      }
    }
  }

  for (const path of piece.paths) {
    const role = path.edges[0]?.role;
    parts.push(pathToSvgPath(path, role));
  }

  if (showLabels) {
    const centerX = bbox.minX + bbox.width / 2;
    const centerY = bbox.minY + bbox.height / 2;
    // Pieces taller than ~2x their width get a rotated label so the text
    // runs along the piece (book-spine orientation) instead of spilling
    // out the sides. The narrow dimension still drives font size.
    const isVertical = bbox.height > bbox.width * 2;
    const narrowDim = Math.min(bbox.width, bbox.height);
    const fontSize = Math.max(8, Math.min(28, narrowDim / 8));

    const lines: string[] = [piece.name];
    const qtyParts: string[] = [`Cut ${piece.quantity}`];
    if (piece.cutOnFold) qtyParts.push('on fold');
    else if (piece.mirror) qtyParts.push('(mirrored pair)');
    lines.push(qtyParts.join(' '));

    // For rotated text, tspans stack along the rotated-X axis (which is the
    // piece's Y axis), so the anchor stays at the same x for every line.
    const anchorX = isVertical ? 0 : centerX;
    const labelText = lines
      .map((line, i) => {
        const dy = i === 0 ? '0' : '1.2em';
        return `<tspan x="${anchorX}" dy="${dy}">${escXml(line)}</tspan>`;
      })
      .join('');

    const transform = isVertical
      ? ` transform="translate(${centerX},${centerY}) rotate(-90)"`
      : '';
    const x = isVertical ? 0 : centerX;
    const y = isVertical ? 0 : centerY;
    parts.push(
      `<text x="${x}" y="${y}"${transform} font-size="${fontSize}" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle" fill="#374151" opacity="0.7" pointer-events="none">${labelText}</text>`,
    );
  }

  if (showAnnotations && piece.annotations) {
    for (const a of piece.annotations) parts.push(annotationToSvg(a, bbox));
  }

  return `<g id="piece-${escXml(piece.id)}" transform="translate(${offsetX},${offsetY})">\n  ${parts.join('\n  ')}\n</g>`;
}

/**
 * Annotations: a grain arrow (double-headed, along `angle`, 90 = up the piece),
 * a notch tick at `point`, or a note (wrapped, small, under the piece label).
 */
function annotationToSvg(a: PieceAnnotation, bbox: BoundingBox): string {
  const p = a.point ?? { x: bbox.minX + bbox.width / 2, y: bbox.minY + bbox.height / 2 };
  if (a.kind === 'grain') {
    const len = Math.max(12, Math.min(60, Math.min(bbox.width, bbox.height) * 0.35));
    const theta = ((a.angle ?? 90) * Math.PI) / 180;
    // Pattern y runs down the page, so +angle turns anticlockwise on paper.
    const dx = Math.cos(theta) * len / 2, dy = -Math.sin(theta) * len / 2;
    const x1 = p.x - dx, y1 = p.y - dy, x2 = p.x + dx, y2 = p.y + dy;
    const head = (x: number, y: number, ux: number, uy: number) =>
      `M ${x} ${y} L ${x - ux * 3 - uy * 1.5} ${y - uy * 3 + ux * 1.5} M ${x} ${y} L ${x - ux * 3 + uy * 1.5} ${y - uy * 3 - ux * 1.5}`;
    const ux = (x2 - x1) / len, uy = (y2 - y1) / len;
    return `<path class="grain" d="M ${x1} ${y1} L ${x2} ${y2} ${head(x2, y2, ux, uy)} ${head(x1, y1, -ux, -uy)}" fill="none" stroke="#374151" stroke-width="0.5" opacity="0.7"/>`;
  }
  if (a.kind === 'notch') {
    return `<path class="notch" d="M ${p.x - 2} ${p.y} L ${p.x + 2} ${p.y} M ${p.x} ${p.y - 2} L ${p.x} ${p.y + 2}" fill="none" stroke="#7c3aed" stroke-width="0.5"/>`;
  }
  if (!a.label) return '';
  // Note text: wrap at ~48 characters, at most four lines, below the piece label.
  const words = a.label.split(/\s+/);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    if ((cur + ' ' + w).trim().length > 48 && cur) { lines.push(cur); cur = w; } else cur = (cur + ' ' + w).trim();
    if (lines.length === 4) break;
  }
  if (cur && lines.length < 4) lines.push(cur);
  if (lines.length === 4 && words.join(' ').length > lines.join(' ').length) lines[3] = lines[3].replace(/\s?\S*$/, '…');
  const fontSize = Math.max(3, Math.min(5, Math.min(bbox.width, bbox.height) / 20));
  const y0 = bbox.minY + bbox.height * 0.68;
  const tspans = lines.map((l, i) => `<tspan x="${p.x}" dy="${i === 0 ? 0 : '1.25em'}">${escXml(l)}</tspan>`).join('');
  return `<text class="note" x="${p.x}" y="${y0}" font-size="${fontSize}" font-family="sans-serif" text-anchor="middle" fill="#4b5563" opacity="0.8" pointer-events="none">${tspans}</text>`;
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface SvgOptions {
  margin?: number;
  pieceGap?: number;
  /**
   * Default seam allowance (mm) applied to closed paths whose Piece has no
   * `seamAllowances` entry. 0 disables SA rendering unless per-edge SA is set.
   */
  defaultSeamAllowance?: number;
  /**
   * When true (default), draws each piece's name + quantity centered inside
   * the piece. Toggle off for a clean cut-line-only export.
   */
  showLabels?: boolean;
  /**
   * Wrap the layout into rows no wider than this (mm). Default 1400 mm — a
   * cutting-table width; a twelve-strip card no longer runs off the page.
   * Pass Infinity for the old single row.
   */
  maxRowWidth?: number;
  /**
   * Draw piece annotations (grain arrows, notch ticks, note text). Default true.
   */
  showAnnotations?: boolean;
  /** Only pieces with this materialId (a per-material cut sheet: foam and mesh take a different blade). */
  materialFilter?: string;
}

/**
 * Converts a Pattern to an SVG string with all pieces laid out in a row.
 * Coordinates and dimensions are in mm (1 SVG user unit = 1 mm).
 */
export function patternToSvg(pattern: Pattern, options: SvgOptions = {}): string {
  assertFinitePattern(pattern);
  const margin = options.margin ?? 10;
  const gap = options.pieceGap ?? 5;
  const defaultSa = options.defaultSeamAllowance ?? 0;
  const showLabels = options.showLabels ?? true;
  const showAnnotations = options.showAnnotations ?? true;
  const maxRowWidth = options.maxRowWidth ?? 1400;

  const pieces = options.materialFilter === undefined ? pattern.pieces : pattern.pieces.filter((p) => (p.materialId ?? 'unspecified') === options.materialFilter);
  if (pieces.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"></svg>`;
  }

  // Expand each piece into N visual copies based on quantity so the preview
  // reflects what actually gets cut. Cap absurdly large quantities to keep the
  // SVG renderable; the label still says "Cut N" so users see the true count.
  const MAX_COPIES_PER_PIECE = 12;
  type Visual = { piece: Piece; copyIndex: number; bbox: BoundingBox };
  const visuals: Visual[] = [];
  for (const piece of pieces) {
    const copies = Math.max(1, Math.min(MAX_COPIES_PER_PIECE, piece.quantity ?? 1));
    const bbox = bboxFromPieceWithSa(piece, defaultSa);
    for (let c = 0; c < copies; c++) {
      visuals.push({ piece, copyIndex: c, bbox });
    }
  }

  // Row-wrap: pieces flow left to right and start a new row when the next one
  // would cross `maxRowWidth`; a piece wider than the limit gets a row to itself.
  let cursorX = margin;
  let cursorY = margin;
  let rowHeight = 0;
  let totalWidth = 0;
  const groups: string[] = [];

  for (const v of visuals) {
    if (cursorX > margin && cursorX + v.bbox.width + margin > maxRowWidth) {
      totalWidth = Math.max(totalWidth, cursorX - gap + margin);
      cursorX = margin;
      cursorY += rowHeight + gap;
      rowHeight = 0;
    }
    const ox = cursorX - v.bbox.minX;
    const oy = cursorY - v.bbox.minY;
    // Only the first copy renders the piece label so the preview isn't cluttered.
    const labelThisCopy = showLabels && v.copyIndex === 0;
    groups.push(pieceToSvgGroup(v.piece, ox, oy, defaultSa, labelThisCopy, v.bbox, showAnnotations && v.copyIndex === 0));
    cursorX += v.bbox.width + gap;
    rowHeight = Math.max(rowHeight, v.bbox.height);
  }
  totalWidth = Math.max(totalWidth, cursorX - gap + margin);
  const totalHeight = cursorY + rowHeight + margin;

  const title = `<title>${escXml(pattern.name)}</title>`;
  const body = groups.join('\n');

  return [
    `<svg xmlns="http://www.w3.org/2000/svg"`,
    `     width="${totalWidth}mm" height="${totalHeight}mm"`,
    `     viewBox="0 0 ${totalWidth} ${totalHeight}"`,
    `     data-units="mm">`,
    `  ${title}`,
    body,
    `</svg>`,
  ].join('\n');
}

/** The distinct material ids a pattern cuts from, in first-seen order ('unspecified' for pieces without one). */
export function patternMaterials(pattern: Pattern): string[] {
  const seen: string[] = [];
  for (const p of pattern.pieces) { const m = p.materialId ?? 'unspecified'; if (!seen.includes(m)) seen.push(m); }
  return seen;
}

/** One SVG per material — separate cut sheets for fabric, foam, mesh, webbing. */
export function patternToSvgByMaterial(pattern: Pattern, options: SvgOptions = {}): Record<string, string> {
  const out: Record<string, string> = {};
  for (const m of patternMaterials(pattern)) out[m] = patternToSvg(pattern, { ...options, materialFilter: m });
  return out;
}
