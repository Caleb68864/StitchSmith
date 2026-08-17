import type { Pattern } from '../graph/Pattern.js';
import type { Edge } from '../graph/Edge.js';
import { PDFDocument, rgb } from 'pdf-lib';
import type { Piece } from '../graph/Piece.js';
import { bboxFromPieceWithSa } from '../geometry/saBbox.js';
import { computeSeamAllowancePolygon } from '../geometry/offset.js';

const MM_TO_PT = 72 / 25.4;

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
    if (!path.closed) continue;
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

function drawScaleCheckSquare(
  page: ReturnType<PDFDocument['addPage']>,
  pageHeight: number,
): void {
  const squareSizeMm = 50;
  const offsetMm = 10;
  const x = mm(offsetMm);
  const y = pageHeight - mm(offsetMm + squareSizeMm);
  const size = mm(squareSizeMm);

  page.drawRectangle({
    x,
    y,
    width: size,
    height: size,
    borderColor: rgb(0, 0, 0),
    borderWidth: 0.5,
    color: rgb(1, 1, 1),
    opacity: 0,
    borderOpacity: 1,
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
}

export async function exportPatternToPdf(
  pattern: Pattern,
  options: PdfOptions = {},
): Promise<Blob> {
  const pageSize = options.pageSizeMm ?? { width: 210, height: 297 };
  const margin = options.marginMm ?? 15;
  const defaultSa = options.defaultSeamAllowance ?? 0;

  const pdfDoc = await PDFDocument.create();
  const pageWidthPt = mm(pageSize.width);
  const pageHeightPt = mm(pageSize.height);

  if (pattern.pieces.length === 0) {
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
    drawCropMarks(page, pageWidthPt, pageHeightPt);
    drawScaleCheckSquare(page, pageHeightPt);
  }

  for (const piece of pattern.pieces) {
    const page = pdfDoc.addPage([pageWidthPt, pageHeightPt]);
    drawCropMarks(page, pageWidthPt, pageHeightPt);
    drawScaleCheckSquare(page, pageHeightPt);

    const bbox = bboxFromPieceWithSa(piece, defaultSa);
    const ox = margin - bbox.minX;
    const oy = margin - bbox.minY;

    // SA outer cut line drawn first so the body cut line strokes on top.
    drawSeamAllowance(page, piece, defaultSa, ox, oy, pageHeightPt);

    for (const path of piece.paths) {
      for (const edge of path.edges) {
        edgeToPdfCommands(page, edge, ox, oy, pageHeightPt);
      }
    }
  }

  const bytes = await pdfDoc.save();
  return new Blob([bytes.buffer as ArrayBuffer], { type: 'application/pdf' });
}
