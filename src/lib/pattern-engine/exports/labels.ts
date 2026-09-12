/**
 * Text layout shared by the SVG and PDF exporters. Pattern labels are read off
 * a printed sheet, so they must wrap to the piece that owns them, shrink when
 * that piece is small, and never land on top of each other.
 *
 * All sizes are in pattern millimetres.
 */
import type { BoundingBox } from '../geometry/bbox.js';

/** A laid-out text block, in pattern mm, used to keep labels from colliding. */
export interface LabelRect { x0: number; y0: number; x1: number; y1: number }

/** Rough advance width of sans-serif text at `size`, in the same units as `size`. */
export function textWidth(text: string, size: number): number {
  return text.length * size * 0.55;
}

/** Greedy word wrap to `maxChars`, at most `maxLines` lines, ellipsis when it runs out. */
export function wrapText(text: string, maxChars: number, maxLines: number): string[] {
  if (maxChars < 4) return [text.slice(0, 3) + '…'];
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let cur = '';
  for (const w of words) {
    const next = cur ? `${cur} ${w}` : w;
    if (next.length <= maxChars) { cur = next; continue; }
    if (cur) lines.push(cur);
    cur = w.length > maxChars ? `${w.slice(0, maxChars - 1)}…` : w;
    if (lines.length === maxLines) break;
  }
  if (cur && lines.length < maxLines) lines.push(cur);
  if (lines.length === maxLines) {
    const used = lines.join(' ').replace(/…$/, '').length;
    if (used < text.replace(/\s+/g, ' ').length - 1) lines[maxLines - 1] = `${lines[maxLines - 1].slice(0, Math.max(1, maxChars - 1))}…`;
  }
  return lines.length ? lines : [text];
}

export function overlaps(a: LabelRect, b: LabelRect): boolean {
  return a.x0 < b.x1 && b.x0 < a.x1 && a.y0 < b.y1 && b.y0 < a.y1;
}

/**
 * Place a wrapped text block inside `bbox` near (x, y), nudging it down a line
 * at a time until it clears everything already placed. Labels are the thing a
 * sewer reads off the printed sheet, so they must not run off the piece or
 * stack on top of each other.
 */
export function placeLabel(
  text: string,
  x: number,
  y: number,
  bbox: BoundingBox,
  occupied: LabelRect[],
  opts: { size: number; maxLines: number; anchor?: 'start' | 'middle' },
): { lines: string[]; x: number; y: number; size: number } | null {
  const size = opts.size;
  const lineHeight = size * 1.25;
  const pad = 1;
  const anchor = opts.anchor ?? 'start';
  const inner = { x0: bbox.minX + pad, x1: bbox.minX + bbox.width - pad, y0: bbox.minY + pad, y1: bbox.minY + bbox.height - pad };
  const avail = Math.max(size * 4, inner.x1 - inner.x0);
  const maxChars = Math.max(4, Math.floor(avail / (size * 0.55)));
  const lines = wrapText(text, maxChars, opts.maxLines);
  const width = Math.min(avail, Math.max(...lines.map((l) => textWidth(l, size))));
  let left = anchor === 'middle' ? x - width / 2 : x;
  left = Math.min(Math.max(left, inner.x0), Math.max(inner.x0, inner.x1 - width));
  const height = lines.length * lineHeight;
  let top = Math.min(Math.max(y - height, inner.y0), Math.max(inner.y0, inner.y1 - height));
  for (let attempt = 0; attempt < 12; attempt++) {
    const rect = { x0: left, y0: top, x1: left + width, y1: top + height };
    if (!occupied.some((o) => overlaps(rect, o))) {
      occupied.push(rect);
      return { lines, x: anchor === 'middle' ? left + width / 2 : left, y: top + size, size };
    }
    top += lineHeight;
    if (top + height > inner.y1) top = inner.y0;
  }
  return null;
}


/**
 * Fit a piece's name and cut count inside the piece: wrap it, then shrink the
 * type until the longest line fits along the piece and the block fits across
 * it. A name that runs off its own rectangle is worse than a small one — on a
 * dense cut sheet the overflowing names of neighbouring pieces overlap into
 * mush.
 */
export function fitName(pieceName: string, qtyLine: string, bbox: BoundingBox, isVertical: boolean): { lines: string[]; size: number } {
  const along = Math.max(8, (isVertical ? bbox.height : bbox.width) - 2);
  const across = Math.max(6, (isVertical ? bbox.width : bbox.height) - 2);
  let size = Math.min(28, Math.max(2.5, along / 10));
  let lines = [pieceName, qtyLine];
  for (let i = 0; i < 40; i++) {
    const maxChars = Math.max(6, Math.floor(along / (size * 0.55)));
    lines = [...wrapText(pieceName, maxChars, 3), ...wrapText(qtyLine, maxChars, 2)];
    const widest = Math.max(...lines.map((l) => textWidth(l, size)));
    if ((widest <= along && lines.length * size * 1.3 <= across) || size <= 2.5) break;
    size = Math.max(2.5, size * 0.9);
  }
  return { lines, size };
}

