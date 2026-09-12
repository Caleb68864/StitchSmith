import type { Pattern } from '../graph/Pattern.js';
import { assertFinitePattern } from '../graph/validate.js';
import type { Edge } from '../graph/Edge.js';
import { PDFDocument, StandardFonts, degrees, rgb } from 'pdf-lib';
import type { Piece } from '../graph/Piece.js';
import { bboxFromPieceWithSa } from '../geometry/saBbox.js';
import { computeSeamAllowancePolygon } from '../geometry/offset.js';
import { isCutOutline } from './svg.js';
import { type LabelRect, placeLabel, fitName, textWidth } from './labels.js';
import { computeTiles, SCALE_RULE_MM } from './tiledHtml.js';

const MM_TO_PT = 72 / 25.4;

/**
 * pdf-lib's standard fonts encode WinAnsi (CP1252) only, and label text is full
 * of typographic glyphs: arrows, approximately-equal, fractions. Map the ones
 * that carry meaning to ASCII and drop anything else, so a label never fails
 * the whole export.
 */
const GLYPHS: Record<string, string> = {
  '\u2192': '->', '\u2190': '<-', '\u2194': '<->', '\u21d2': '=>',
  '\u2248': '~', '\u2264': '<=', '\u2265': '>=', '\u2260': '!=',
  '\u2032': "'", '\u2033': '"', '\u2044': '/', '\u2212': '-',
  '\u00d8': 'dia ', '\u2300': 'dia ',
  '\u215b': '1/8', '\u215c': '3/8', '\u215d': '5/8', '\u215e': '7/8', '\u2153': '1/3', '\u2154': '2/3',
};
/** CP1252: ASCII, Latin-1 supplement, and the handful of typographic extras it carries. */
const WIN_ANSI_SAFE = /[\u0020-\u007e\u00a0-\u00ff\u2013\u2014\u2018\u2019\u201a\u201c\u201d\u201e\u2020\u2021\u2022\u2026\u2030\u2039\u203a\u20ac\u2122\u0152\u0153\u0160\u0161\u0178\u017d\u017e\u0192\u02c6\u02dc]/;

export function toWinAnsi(text: string): string {
  let out = '';
  for (const ch of text) {
    if (GLYPHS[ch]) { out += GLYPHS[ch]; continue; }
    out += WIN_ANSI_SAFE.test(ch) ? ch : '';
  }
  return out;
}

function mm(v: number): number {
  return v * MM_TO_PT;
}

/**
 * Draws the SA-offset cut line for every closed path of a piece as a thin,
 * dashed, green polygon — visually distinct from the solid black body line
 * (mirrors the SVG exporter's styling).
 */
function drawSeamAllowance(
  page: ReturnType<PDFDocument['addPage']>,
  piece: Piece,
  defaultSa: number,
  layerOffsetX: number,
  layerOffsetY: number,
  pageHeight: number,
): void {
  if (!piece.seamAllowances && defaultSa <= 0) return;
  const green = rgb(0.18, 0.49, 0.2);
  for (const path of piece.paths) {
    if (!path.closed || !isCutOutline(path)) continue;
    const saResult = computeSeamAllowancePolygon(piece, path, defaultSa);
    if (!saResult.ok || !saResult.value) continue;
    const verts = saResult.value;
    for (let i = 0; i < verts.length; i++) {
      const a = verts[i];
      const b = verts[(i + 1) % verts.length];
      page.drawLine({
        start: { x: mm(layerOffsetX + a.x), y: pageHeight - mm(layerOffsetY + a.y) },
        end: { x: mm(layerOffsetX + b.x), y: pageHeight - mm(layerOffsetY + b.y) },
        color: green,
        thickness: 0.4,
        dashArray: [mm(3), mm(2)],
      });
    }
  }
}

function edgeToPdfCommands(
  page: ReturnType<PDFDocument['addPage']>,
  edge: Edge,
  layerOffsetX: number,
  layerOffsetY: number,
  pageHeight: number,
): void {
  const black = rgb(0, 0, 0);
  const ox = layerOffsetX;
  const oy = layerOffsetY;

  function toPageY(y: number): number {
    return pageHeight - mm(oy + y);
  }

  switch (edge.kind) {
    case 'straight':
      page.drawLine({
        start: { x: mm(ox + edge.start.x), y: toPageY(edge.start.y) },
        end: { x: mm(ox + edge.end.x), y: toPageY(edge.end.y) },
        color: black,
        thickness: 0.5,
      });
      break;
    case 'arc': {
      const segments = 24;
      const startAngle = Math.atan2(
        edge.start.y - edge.center.y,
        edge.start.x - edge.center.x,
      );
      const endAngle = Math.atan2(
        edge.end.y - edge.center.y,
        edge.end.x - edge.center.x,
      );
      let angleSpan = edge.clockwise
        ? startAngle - endAngle
        : endAngle - startAngle;
      if (angleSpan < 0) angleSpan += 2 * Math.PI;
      for (let i = 0; i < segments; i++) {
        const t0 = i / segments;
        const t1 = (i + 1) / segments;
        const a0 = edge.clockwise
          ? startAngle - t0 * angleSpan
          : startAngle + t0 * angleSpan;
        const a1 = edge.clockwise
          ? startAngle - t1 * angleSpan
          : startAngle + t1 * angleSpan;
        const x0 = edge.center.x + edge.radius * Math.cos(a0);
        const y0 = edge.center.y + edge.radius * Math.sin(a0);
        const x1 = edge.center.x + edge.radius * Math.cos(a1);
        const y1 = edge.center.y + edge.radius * Math.sin(a1);
        page.drawLine({
          start: { x: mm(ox + x0), y: toPageY(y0) },
          end: { x: mm(ox + x1), y: toPageY(y1) },
          color: black,
          thickness: 0.5,
        });
      }
      break;
    }
    case 'bezier': {
      const segments = 32;
      for (let i = 0; i < segments; i++) {
        const t0 = i / segments;
        const t1 = (i + 1) / segments;
        const p0 = sampleCubicBezier(
          edge.start, edge.cp1, edge.cp2, edge.end, t0,
        );
        const p1 = sampleCubicBezier(
          edge.start, edge.cp1, edge.cp2, edge.end, t1,
        );
        page.drawLine({
          start: { x: mm(ox + p0.x), y: toPageY(p0.y) },
          end: { x: mm(ox + p1.x), y: toPageY(p1.y) },
          color: black,
          thickness: 0.5,
        });
      }
      break;
    }
  }
}

function sampleCubicBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  };
}

function drawCropMarks(
  page: ReturnType<PDFDocument['addPage']>,
  pageWidth: number,
  pageHeight: number,
): void {
  const markLen = mm(5);
  const offset = mm(3);
  const color = rgb(0.4, 0.4, 0.4);
  const thickness = 0.3;

  const corners = [
    { x: 0, y: 0 },
    { x: pageWidth, y: 0 },
    { x: 0, y: pageHeight },
    { x: pageWidth, y: pageHeight },
  ];

  for (const c of corners) {
    const dx = c.x === 0 ? 1 : -1;
    const dy = c.y === 0 ? 1 : -1;
    page.drawLine({
      start: { x: c.x + dx * offset, y: c.y },
      end: { x: c.x + dx * (offset + markLen), y: c.y },
      color,
      thickness,
    });
    page.drawLine({
      start: { x: c.x, y: c.y + dy * offset },
      end: { x: c.x, y: c.y + dy * (offset + markLen) },
      color,
      thickness,
    });
  }
}

/**
 * A 50 mm rule printed in the bottom margin, where it cannot cover the pattern.
 * Measure it before cutting: if it is short, the printer scaled the page.
 */
function drawScaleRule(
  page: ReturnType<PDFDocument['addPage']>,
  marginMm: number,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
): void {
  const x = mm(marginMm);
  const y = mm(Math.max(3, marginMm - 6));
  const len = mm(SCALE_RULE_MM);
  const tick = mm(2.5);
  const black = rgb(0, 0, 0);
  page.drawLine({ start: { x, y }, end: { x: x + len, y }, color: black, thickness: 0.6 });
  page.drawLine({ start: { x, y }, end: { x, y: y + tick }, color: black, thickness: 0.6 });
  page.drawLine({ start: { x: x + len, y }, end: { x: x + len, y: y + tick }, color: black, thickness: 0.6 });
  page.drawText(`${SCALE_RULE_MM} mm - measure before cutting; if short, the printer scaled the page`, {
    x: x + len + mm(3),
    y: y - mm(0.6),
    size: 7,
    font,
    color: rgb(0.2, 0.2, 0.2),
  });
}

export interface PdfOptions {
  pageSizeMm?: { width: number; height: number };
  marginMm?: number;
  /**
   * Default seam allowance (mm) applied to closed paths whose Piece has no
   * `seamAllowances` entry. 0 disables SA rendering unless per-edge SA is set.
   */
  defaultSeamAllowance?: number;
  /** Draw the piece name, cut count and fold/stitch labels. Default true. */
  showLabels?: boolean;
  /** Draw piece notes. Default true. */
  showAnnotations?: boolean;
  /**
   * Overlap between tiles, mm, for pieces larger than one page. Default 10.
   * Pieces are never scaled: a pattern printed at anything but 1:1 is useless.
   */
  overlapMm?: number;
}

export async function exportPatternToPdf(
  pattern: Pattern,
  options: PdfOptions = {},
): Promise<Blob> {
  assertFinitePattern(pattern);
  const pageSize = options.pageSizeMm ?? { width: 210, height: 297 };
  const margin = options.marginMm ?? 15;
  const defaultSa = options.defaultSeamAllowance ?? 0;
  const labels = options.showLabels ?? true;
  const annotations = options.showAnnotations ?? true;
  const overlap = options.overlapMm ?? 10;

  const pdfDoc = await PDFDocument.create();
  const pageWidthPt = mm(pageSize.width);
  const pageHeightPt = mm(pageSize.height);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const ink = rgb(0.22, 0.25, 0.29);

  if (pattern.pieces.length === 0) {
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
    drawCropMarks(page, pageWidthPt, pageHeightPt);
    drawScaleRule(page, margin, font);
  }

  for (const piece of pattern.pieces) {
    const bbox = bboxFromPieceWithSa(piece, defaultSa);
    // A piece bigger than the printable area is tiled, never scaled: a sewing
    // pattern printed at anything but 1:1 is worthless. Geometry that runs past
    // a page edge is clipped by the page, so each tile shows its own region.
    const tiles = computeTiles(bbox.width, bbox.height, {
      paperWidthMm: pageSize.width, paperHeightMm: pageSize.height, marginMm: margin,
      overlapMm: overlap, title: pattern.name, defaultSeamAllowance: defaultSa,
    });
    const rows = Math.max(...tiles.map((t) => t.row)) + 1;
    const cols = Math.max(...tiles.map((t) => t.col)) + 1;

    for (const tile of tiles) {
      const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
      drawCropMarks(page, pageWidthPt, pageHeightPt);
      drawScaleRule(page, margin, font);

      const ox = margin - bbox.minX - tile.viewX;
      const oy = margin - bbox.minY - tile.viewY;

      if (tiles.length > 1) {
        page.drawText(toWinAnsi(`${piece.name} - row ${tile.row + 1} of ${rows}, column ${tile.col + 1} of ${cols}`), {
          x: mm(margin), y: pageHeightPt - mm(Math.max(3, margin - 4)), size: 8, font, color: ink,
        });
      }

      // SA outer cut line drawn first so the body cut line strokes on top.
      drawSeamAllowance(page, piece, defaultSa, ox, oy, pageHeightPt);

      for (const path of piece.paths) {
        for (const edge of path.edges) {
          edgeToPdfCommands(page, edge, ox, oy, pageHeightPt);
        }
      }

      // Text, laid out exactly as the SVG exporter lays it out: the printed
      // sheet is useless without the piece's name, cut count and fold labels.
      if (labels || annotations) {
        const occupied: LabelRect[] = [];
        const px = (x: number) => mm(x + ox);
        const py = (y: number) => pageHeightPt - mm(y + oy);
        const centerX = bbox.minX + bbox.width / 2;
        const centerY = bbox.minY + bbox.height / 2;
        const isVertical = bbox.height > bbox.width * 2;
        const qtyParts: string[] = [`Cut ${piece.quantity}`];
        if (piece.cutOnFold) qtyParts.push('on fold');
        else if (piece.mirror) qtyParts.push('(mirrored pair)');
        const name = fitName(piece.name, qtyParts.join(' '), bbox, isVertical);

        if (labels) {
          const longest = Math.max(...name.lines.map((l) => textWidth(l, name.size)));
          const blockH = name.lines.length * name.size * 1.3;
          const w = isVertical ? blockH : longest;
          const h = isVertical ? longest : blockH;
          occupied.push({ x0: centerX - w / 2 - 1, y0: centerY - h / 2 - 1, x1: centerX + w / 2 + 1, y1: centerY + h / 2 + 1 });

          const lineStep = name.size * 1.3;
          const top = centerY - ((name.lines.length - 1) * lineStep) / 2;
          name.lines.forEach((line, i) => {
            const width = font.widthOfTextAtSize(toWinAnsi(line), mm(name.size));
            if (isVertical) {
              page.drawText(toWinAnsi(line), {
                x: px(centerX - (name.lines.length - 1) * lineStep / 2 + i * lineStep) + mm(name.size) / 3,
                y: py(centerY) - width / 2,
                size: mm(name.size), font, color: ink, opacity: 0.75, rotate: degrees(90),
              });
            } else {
              page.drawText(toWinAnsi(line), {
                x: px(centerX) - width / 2,
                y: py(top + i * lineStep) - mm(name.size) / 3,
                size: mm(name.size), font, color: ink, opacity: 0.75,
              });
            }
          });

          for (const path of piece.paths) {
            if (!path.label) continue;
            const first = path.edges[0];
            if (!first || first.kind !== 'straight') continue;
            const role = path.edges[0]?.role;
            const color = role === 'fold' ? rgb(0, 0.4, 0.8) : role === 'seam' || role === 'stitch' ? rgb(0.8, 0, 0) : role === 'notch' ? rgb(0.49, 0.23, 0.93) : rgb(0, 0, 0);
            const size = Math.max(3, Math.min(5, Math.min(bbox.width, bbox.height) / 22));
            const placed = placeLabel(path.label, first.start.x + 4, first.start.y - 1, bbox, occupied, { size, maxLines: 3 });
            if (!placed) continue;
            placed.lines.forEach((line, i) => {
              page.drawText(toWinAnsi(line), { x: px(placed.x), y: py(placed.y + i * size * 1.25), size: mm(size), font, color, opacity: 0.85 });
            });
          }
        }

        if (annotations) {
          for (const a of piece.annotations ?? []) {
            if (a.kind !== 'label' || !a.label) continue;
            const point = a.point ?? { x: centerX, y: centerY };
            const size = Math.max(3, Math.min(5, Math.min(bbox.width, bbox.height) / 22));
            const placed = placeLabel(a.label, point.x, bbox.minY + bbox.height * 0.72, bbox, occupied, { size, maxLines: 4, anchor: 'middle' });
            if (!placed) continue;
            placed.lines.forEach((line, i) => {
              const width = font.widthOfTextAtSize(toWinAnsi(line), mm(size));
              page.drawText(toWinAnsi(line), { x: px(placed.x) - width / 2, y: py(placed.y + i * size * 1.25), size: mm(size), font, color: ink, opacity: 0.8 });
            });
          }
        }
      }
    }
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
