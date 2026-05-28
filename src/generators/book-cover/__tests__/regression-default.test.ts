import { describe, it, expect } from 'vitest';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { buildPattern } from '../buildPattern.js';
import type { BookCoverInputs, BookCoverBuildResult } from '../types.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

const MINIMAL: BookCoverInputs = {
  book_height: 200,
  book_width: 150,
  spine_width: 25,
  flap_depth: 70,
  units: 'mm',
};

function loadSnapshot(): BookCoverBuildResult {
  const raw = readFileSync(join(__dirname, 'snapshots/regression-minimal.json'), 'utf8');
  return JSON.parse(raw) as BookCoverBuildResult;
}

describe('regression-default — minimal inputs are bit-identical to frozen snapshot', () => {
  it('buildPattern(MINIMAL) matches frozen snapshot', () => {
    const result = buildPattern(MINIMAL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const snapshot = loadSnapshot();
    expect(result.value).toEqual(snapshot);
  });

  it('piece ids in minimal result match snapshot piece ids', () => {
    const result = buildPattern(MINIMAL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const snapshot = loadSnapshot();
    const ids = result.value.pieces.map(p => p.id);
    const snapIds = snapshot.pieces.map(p => p.id);
    expect(ids).toEqual(snapIds);
  });

  it('step ids in minimal result match snapshot step ids', () => {
    const result = buildPattern(MINIMAL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const snapshot = loadSnapshot();
    const ids = result.value.steps.map(s => s.id);
    const snapIds = snapshot.steps.map(s => s.id);
    expect(ids).toEqual(snapIds);
  });

  it('BOM material ids in minimal result match snapshot', () => {
    const result = buildPattern(MINIMAL);
    expect(result.ok).toBe(true);
    if (!result.ok) return;

    const snapshot = loadSnapshot();
    const ids = result.value.bom.materials.map(m => m.id);
    const snapIds = snapshot.bom.materials.map(m => m.id);
    expect(ids).toEqual(snapIds);
  });
});
