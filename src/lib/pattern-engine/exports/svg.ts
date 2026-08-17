import type { Pattern } from '../graph/Pattern.js';
import type { Piece } from '../graph/Piece.js';
import type { Path } from '../graph/Path.js';
import type { Edge } from '../graph/Edge.js';
import type { BoundingBox } from '../geometry/bbox.js';
import { bboxFromPieceWithSa } from '../geometry/saBbox.js';
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

  // Expand each piece into N visual copies based on quantity so the preview
  // reflects what actually gets cut. Cap absurdly large quantities to keep the
  // SVG renderable; the label still says "Cut N" so users see the true count.
  const MAX_COPIES_PER_PIECE = 12;
  type Visual = { piece: Piece; copyIndex: number; bbox: BoundingBox };
  const visuals: Visual[] = [];
  for (const piece of pattern.pieces) {
    const copies = Math.max(1, Math.min(MAX_COPIES_PER_PIECE, piece.quantity ?? 1));
    const bbox = bboxFromPieceWithSa(piece, defaultSa);
    for (let c = 0; c < copies; c++) {
      visuals.push({ piece, copyIndex: c, bbox });
    }
  }

  let cursorX = margin;
  const rowHeight = Math.max(...visuals.map((v) => v.bbox.height));
  const groups: string[] = [];

  for (const v of visuals) {
    const ox = cursorX - v.bbox.minX;
    const oy = margin - v.bbox.minY;
    // Only the first copy renders the piece label so the preview isn't cluttered.
    const labelThisCopy = showLabels && v.copyIndex === 0;
    groups.push(pieceToSvgGroup(v.piece, ox, oy, defaultSa, labelThisCopy, v.bbox));
    cursorX += v.bbox.width + gap;
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
