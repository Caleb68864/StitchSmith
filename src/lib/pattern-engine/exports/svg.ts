import type { Pattern } from '../graph/Pattern.js';
import type { Piece } from '../graph/Piece.js';
import type { Path } from '../graph/Path.js';
import type { Edge } from '../graph/Edge.js';
import { bboxFromPiece, bboxFromPoints, unionBbox } from '../geometry/bbox.js';
import type { BoundingBox } from '../geometry/bbox.js';
import { computeSeamAllowancePolygon } from '../geometry/offset.js';

/**
 * Bbox that includes the SA outer cut polygon, so pieces don't overlap when
 * laid out side-by-side with non-zero seam allowance.
 */
function bboxFromPieceWithSa(piece: Piece, defaultSa: number): BoundingBox {
  let box = bboxFromPiece(piece);
  if (!piece.seamAllowances && defaultSa <= 0) return box;
  for (const path of piece.paths) {
    if (!path.closed) continue;
    const sa = computeSeamAllowancePolygon(piece, path, defaultSa);
    if (sa.ok && sa.value) {
      box = unionBbox(box, bboxFromPoints(sa.value));
    }
  }
  return box;
}

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
    .map((edge, i) => edgeToSvgCommands(edge, i === 0))
    .join(' ');
  const close = path.closed ? ' Z' : '';
  const stroke = role === 'fold' ? '#0066cc' : role === 'seam' ? '#cc0000' : '#000000';
  const strokeDash = role === 'fold' ? ' stroke-dasharray="5,3"' : '';
  return `<path d="${d}${close}" fill="none" stroke="${stroke}" stroke-width="0.5"${strokeDash}/>`;
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
): string {
  const parts: string[] = [];

  // SA outer cut line drawn first so the body cut line strokes on top.
  if (piece.seamAllowances || defaultSa > 0) {
    for (const path of piece.paths) {
      if (!path.closed) continue;
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
    // Scale label font with piece size so it stays readable on big pieces
    // without being huge on small ones. Clamp to [8, 28] mm.
    const fontSize = Math.max(8, Math.min(28, Math.min(bbox.width, bbox.height) / 12));
    const centerX = bbox.minX + bbox.width / 2;
    const centerY = bbox.minY + bbox.height / 2;
    const lines: string[] = [piece.name];
    // Tell the cutter how many copies and whether the piece is cut as a
    // mirrored pair (e.g. shoulder straps) or on a fold (the engine doesn't
    // currently emit cut-on-fold pieces, but the Piece type reserves the flag).
    const qtyParts: string[] = [`Cut ${piece.quantity}`];
    if (piece.cutOnFold) qtyParts.push('on fold');
    else if (piece.mirror) qtyParts.push('(mirrored pair)');
    lines.push(qtyParts.join(' '));
    const labelText = lines
      .map((line, i) => {
        const dy = i === 0 ? '0' : '1.2em';
        return `<tspan x="${centerX}" dy="${dy}">${escXml(line)}</tspan>`;
      })
      .join('');
    parts.push(
      `<text x="${centerX}" y="${centerY}" font-size="${fontSize}" font-family="sans-serif" text-anchor="middle" dominant-baseline="middle" fill="#374151" opacity="0.7" pointer-events="none">${labelText}</text>`,
    );
  }

  return `<g id="piece-${escXml(piece.id)}" transform="translate(${offsetX},${offsetY})">\n  ${parts.join('\n  ')}\n</g>`;
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
}

/**
 * Converts a Pattern to an SVG string with all pieces laid out in a row.
 * Coordinates and dimensions are in mm (1 SVG user unit = 1 mm).
 */
export function patternToSvg(pattern: Pattern, options: SvgOptions = {}): string {
  const margin = options.margin ?? 10;
  const gap = options.pieceGap ?? 5;
  const defaultSa = options.defaultSeamAllowance ?? 0;
  const showLabels = options.showLabels ?? true;

  if (pattern.pieces.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"></svg>`;
  }

  const bboxes = pattern.pieces.map((p) => bboxFromPieceWithSa(p, defaultSa));

  // Layout: arrange pieces left-to-right
  let cursorX = margin;
  const rowHeight = Math.max(...bboxes.map((b) => b.height));
  const groups: string[] = [];

  for (let i = 0; i < pattern.pieces.length; i++) {
    const piece = pattern.pieces[i];
    const bbox = bboxes[i];
    const ox = cursorX - bbox.minX;
    const oy = margin - bbox.minY;
    groups.push(pieceToSvgGroup(piece, ox, oy, defaultSa, showLabels, bbox));
    cursorX += bbox.width + gap;
  }

  const totalWidth = cursorX - gap + margin;
  const totalHeight = rowHeight + 2 * margin;

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
