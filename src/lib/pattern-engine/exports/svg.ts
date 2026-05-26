import type { Pattern } from '../graph/Pattern.js';
import type { Piece } from '../graph/Piece.js';
import type { Path } from '../graph/Path.js';
import type { Edge } from '../graph/Edge.js';
import { bboxFromPiece } from '../geometry/bbox.js';

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

function pieceToSvgGroup(piece: Piece, offsetX: number, offsetY: number): string {
  const parts: string[] = [];
  for (const path of piece.paths) {
    const role = path.edges[0]?.role;
    parts.push(pathToSvgPath(path, role));
  }
  const label = `<text x="${offsetX}" y="${offsetY - 3}" font-size="6" font-family="sans-serif">${escXml(piece.name)}</text>`;
  parts.push(label);
  return `<g id="piece-${escXml(piece.id)}" transform="translate(${offsetX},${offsetY})">\n  ${parts.join('\n  ')}\n</g>`;
}

function escXml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

export interface SvgOptions {
  margin?: number;
  pieceGap?: number;
}

/**
 * Converts a Pattern to an SVG string with all pieces laid out in a row.
 * Coordinates and dimensions are in mm (1 SVG user unit = 1 mm).
 */
export function patternToSvg(pattern: Pattern, options: SvgOptions = {}): string {
  const margin = options.margin ?? 10;
  const gap = options.pieceGap ?? 5;

  if (pattern.pieces.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100"></svg>`;
  }

  const bboxes = pattern.pieces.map(bboxFromPiece);

  // Layout: arrange pieces left-to-right
  let cursorX = margin;
  const rowHeight = Math.max(...bboxes.map((b) => b.height));
  const groups: string[] = [];

  for (let i = 0; i < pattern.pieces.length; i++) {
    const piece = pattern.pieces[i];
    const bbox = bboxes[i];
    const ox = cursorX - bbox.minX;
    const oy = margin - bbox.minY;
    groups.push(pieceToSvgGroup(piece, ox, oy));
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
