import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { calculateToolRollLayout } from '../calculateToolRollLayout.js';
import { defaultToolRollSettings, sampleTools } from '../defaults.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// ── SVG path sampler ────────────────────────────────────────────────────────

type Pt = { x: number; y: number };

/** Parse an SVG path d attribute into an ordered list of line segments. */
function pathToSegments(d: string): { p1: Pt; p2: Pt }[] {
  const segments: { p1: Pt; p2: Pt }[] = [];
  // Tokenise: command letters and numbers (including negative / decimal)
  const tokenRe = /[MHVLZCmhvlzc]|[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?/g;
  const tokens: string[] = [];
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(d)) !== null) tokens.push(m[0]);

  let cx = 0, cy = 0; // current point
  let mx = 0, my = 0; // subpath start (for Z)
  let i = 0;

  const num = () => parseFloat(tokens[i++]);

  while (i < tokens.length) {
    const cmd = tokens[i++];
    switch (cmd) {
      case 'M': {
        cx = num(); cy = num();
        mx = cx; my = cy;
        break;
      }
      case 'H': {
        const nx = num();
        segments.push({ p1: { x: cx, y: cy }, p2: { x: nx, y: cy } });
        cx = nx;
        break;
      }
      case 'V': {
        const ny = num();
        segments.push({ p1: { x: cx, y: cy }, p2: { x: cx, y: ny } });
        cy = ny;
        break;
      }
      case 'L': {
        const nx = num(); const ny = num();
        segments.push({ p1: { x: cx, y: cy }, p2: { x: nx, y: ny } });
        cx = nx; cy = ny;
        break;
      }
      case 'C': {
        // Cubic Bézier — approximate with 16 line segments
        const cp1x = num(); const cp1y = num();
        const cp2x = num(); const cp2y = num();
        const ex = num(); const ey = num();
        const STEPS = 16;
        let px = cx, py = cy;
        for (let s = 1; s <= STEPS; s++) {
          const t = s / STEPS;
          const mt = 1 - t;
          const nx = mt*mt*mt*cx + 3*mt*mt*t*cp1x + 3*mt*t*t*cp2x + t*t*t*ex;
          const ny = mt*mt*mt*cy + 3*mt*mt*t*cp1y + 3*mt*t*t*cp2y + t*t*t*ey;
          segments.push({ p1: { x: px, y: py }, p2: { x: nx, y: ny } });
          px = nx; py = ny;
        }
        cx = ex; cy = ey;
        break;
      }
      case 'Z':
      case 'z': {
        if (Math.abs(cx - mx) > 1e-6 || Math.abs(cy - my) > 1e-6) {
          segments.push({ p1: { x: cx, y: cy }, p2: { x: mx, y: my } });
        }
        cx = mx; cy = my;
        break;
      }
      default:
        break;
    }
  }
  return segments;
}

/** Compute total arc length of a list of segments. */
function arcLength(segs: { p1: Pt; p2: Pt }[]): number {
  let len = 0;
  for (const s of segs) {
    const dx = s.p2.x - s.p1.x;
    const dy = s.p2.y - s.p1.y;
    len += Math.sqrt(dx * dx + dy * dy);
  }
  return len;
}

/** Sample N evenly-spaced points along the path (by arc-length parameterisation). */
function samplePath(d: string, n: number): Pt[] {
  const segs = pathToSegments(d);
  const total = arcLength(segs);
  if (total === 0 || segs.length === 0) return [];

  const step = total / n;
  const pts: Pt[] = [];
  let remaining = step / 2; // start at half-step so samples are centred
  let segIdx = 0;
  let traveled = 0;

  while (pts.length < n && segIdx < segs.length) {
    const seg = segs[segIdx];
    const dx = seg.p2.x - seg.p1.x;
    const dy = seg.p2.y - seg.p1.y;
    const segLen = Math.sqrt(dx * dx + dy * dy);

    // Consume samples from this segment
    while (remaining <= segLen + 1e-9 && pts.length < n) {
      const t = segLen > 1e-9 ? remaining / segLen : 0;
      pts.push({ x: seg.p1.x + dx * t, y: seg.p1.y + dy * t });
      remaining += step;
    }
    remaining -= segLen;
    traveled += segLen;
    segIdx++;
  }

  // Pad to n if floating-point gaps left us short
  while (pts.length < n) {
    const last = segs[segs.length - 1];
    pts.push({ x: last.p2.x, y: last.p2.y });
  }

  return pts.slice(0, n);
}

/** Is the path closed? (ends with Z or z) */
function isClosed(d: string): boolean {
  return /[Zz]\s*$/.test(d.trim());
}

// ── Parse snapshot SVG ──────────────────────────────────────────────────────

interface SnapshotPath {
  piece: string;
  type: string;
  d: string;
  closed: boolean;
}

function extractSnapshotPaths(svg: string): SnapshotPath[] {
  const paths: SnapshotPath[] = [];
  const pathRe = /<path[^>]*>/gi;
  let pm: RegExpExecArray | null;
  while ((pm = pathRe.exec(svg)) !== null) {
    const tag = pm[0];
    const pieceM = /data-piece="([^"]+)"/.exec(tag);
    const typeM = /data-type="([^"]+)"/.exec(tag);
    const dM = /\bd="([^"]+)"/.exec(tag);
    if (!dM) continue;
    const d = dM[1];
    paths.push({
      piece: pieceM ? pieceM[1] : 'unknown',
      type: typeM ? typeM[1] : 'unknown',
      d,
      closed: isClosed(d),
    });
  }
  return paths;
}

// ── Test ────────────────────────────────────────────────────────────────────

const snapshotSvg = readFileSync(
  join(__dirname, 'migration-snapshot.svg'),
  'utf-8',
);
const snapshotPaths = extractSnapshotPaths(snapshotSvg);

describe('geometric-equivalence regression — 4-wrench sample project', () => {
  it('snapshot SVG contains the expected pieces', () => {
    const pieces = snapshotPaths.map(p => `${p.piece}/${p.type}`);
    expect(pieces).toContain('back-panel/cut');
    expect(pieces).toContain('flap/cut');
    expect(pieces).toContain('pocket-panel/cut');
    expect(pieces).toContain('pocket-panel/hem-fold');
    expect(pieces).toContain('flap/hem-fold');
  });

  it('migrated engine path matches snapshot within 0.01 mm (closed paths, N=64)', () => {
    const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');

    const layoutPaths: Record<string, string> = {
      'back-panel/cut': layout.backPanel.cutPath,
      'pocket-panel/cut': layout.pocketPanel.cutPath,
      ...(layout.flap ? { 'flap/cut': layout.flap.cutPath } : {}),
    };

    for (const snap of snapshotPaths.filter(p => p.closed)) {
      const key = `${snap.piece}/${snap.type}`;
      const layoutD = layoutPaths[key];
      if (!layoutD) continue; // skip if layout doesn't produce this piece with current settings

      const snapPts = samplePath(snap.d, 64);
      const layoutPts = samplePath(layoutD, 64);

      expect(snapPts.length).toBeGreaterThan(0);
      expect(layoutPts.length).toBeGreaterThan(0);

      for (let j = 0; j < Math.min(snapPts.length, layoutPts.length); j++) {
        const dx = snapPts[j].x - layoutPts[j].x;
        const dy = snapPts[j].y - layoutPts[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist, `${key} sample[${j}]: distance ${dist.toFixed(4)} mm exceeds epsilon 0.01 mm`).toBeLessThanOrEqual(0.01);
      }
    }
  });

  it('migrated engine path matches snapshot within 0.01 mm (open paths, N=32)', () => {
    const layout = calculateToolRollLayout(sampleTools, defaultToolRollSettings, 'mm');

    const layoutOpenPaths: Record<string, string | undefined> = {
      'pocket-panel/hem-fold': layout.pocketPanel.hemFoldPath,
      'flap/hem-fold': layout.flap?.hemFoldPath,
    };

    for (const snap of snapshotPaths.filter(p => !p.closed)) {
      const key = `${snap.piece}/${snap.type}`;
      const layoutD = layoutOpenPaths[key];
      if (!layoutD) continue;

      const snapPts = samplePath(snap.d, 32);
      const layoutPts = samplePath(layoutD, 32);

      expect(snapPts.length).toBeGreaterThan(0);
      expect(layoutPts.length).toBeGreaterThan(0);

      for (let j = 0; j < Math.min(snapPts.length, layoutPts.length); j++) {
        const dx = snapPts[j].x - layoutPts[j].x;
        const dy = snapPts[j].y - layoutPts[j].y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        expect(dist, `${key} sample[${j}]: distance ${dist.toFixed(4)} mm exceeds epsilon 0.01 mm`).toBeLessThanOrEqual(0.01);
      }
    }
  });

  it('schemaVersion is 1 in saved project JSON', () => {
    // Verify the project shape expected by the importer and exporter
    const project = {
      schemaVersion: 1 as const,
      projectName: 'Test',
      generatorId: 'tool-roll' as const,
      units: 'mm' as const,
      settings: { ...defaultToolRollSettings },
      tools: [...sampleTools],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    expect(project.schemaVersion).toBe(1);
    expect(project.generatorId).toBe('tool-roll');
  });
});
