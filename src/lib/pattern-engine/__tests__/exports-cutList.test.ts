import { describe, it, expect } from 'vitest';
import { exportCutList, exportCutListCsv } from '../exports/cutList.js';
import type { Pattern } from '../graph/Pattern.js';
import type { Material } from '../materials/Material.js';
import type { Hardware } from '../materials/Hardware.js';

function makePattern(): Pattern {
  return {
    id: 'cut-list-test',
    name: 'Cut List Test Pattern',
    pieces: [
      {
        id: 'front-panel',
        name: 'Front Panel',
        mirror: false,
        quantity: 1,
        materialId: 'mat-cordura',
        paths: [
          {
            id: 'fp-outline',
            closed: true,
            edges: [
              { kind: 'straight', role: 'cut', start: { x: 0, y: 0 }, end: { x: 300, y: 0 } },
              { kind: 'straight', role: 'cut', start: { x: 300, y: 0 }, end: { x: 300, y: 400 } },
              { kind: 'straight', role: 'cut', start: { x: 300, y: 400 }, end: { x: 0, y: 400 } },
              { kind: 'straight', role: 'cut', start: { x: 0, y: 400 }, end: { x: 0, y: 0 } },
            ],
          },
        ],
      },
      {
        id: 'back-panel',
        name: 'Back Panel',
        mirror: false,
        quantity: 1,
        materialId: 'mat-cordura',
        paths: [
          {
            id: 'bp-outline',
            closed: true,
            edges: [
              { kind: 'straight', role: 'cut', start: { x: 0, y: 0 }, end: { x: 300, y: 0 } },
              { kind: 'straight', role: 'cut', start: { x: 300, y: 0 }, end: { x: 300, y: 400 } },
              { kind: 'straight', role: 'cut', start: { x: 300, y: 400 }, end: { x: 0, y: 0 } },
            ],
          },
        ],
      },
      {
        id: 'zipper-pocket',
        name: 'Zipper Pocket',
        mirror: false,
        quantity: 2,
        materialId: 'mat-mesh',
        paths: [
          {
            id: 'zp-outline',
            closed: true,
            edges: [
              { kind: 'straight', role: 'cut', start: { x: 0, y: 0 }, end: { x: 150, y: 0 } },
              { kind: 'straight', role: 'cut', start: { x: 150, y: 0 }, end: { x: 150, y: 200 } },
              { kind: 'straight', role: 'cut', start: { x: 150, y: 200 }, end: { x: 0, y: 0 } },
            ],
          },
        ],
      },
    ],
  };
}

const materials: Material[] = [
  { id: 'mat-cordura', name: '500D Cordura', type: 'fabric' },
  { id: 'mat-mesh', name: 'Air Mesh', type: 'lining' },
];

const hardware: Hardware[] = [
  { id: 'hw-zipper-main', name: 'Main Zipper 50cm', type: 'zipper', quantity: 1 },
  { id: 'hw-buckle-strap', name: 'Side Release Buckle', type: 'buckle', quantity: 2 },
];

describe('exportCutList', () => {
  it('returns an object with byMaterial and byHardware arrays', () => {
    const result = exportCutList(makePattern(), materials, hardware);
    expect(result).toHaveProperty('byMaterial');
    expect(result).toHaveProperty('byHardware');
    expect(Array.isArray(result.byMaterial)).toBe(true);
    expect(Array.isArray(result.byHardware)).toBe(true);
  });

  it('groups pieces by materialId', () => {
    const result = exportCutList(makePattern(), materials, hardware);
    expect(result.byMaterial.length).toBe(2);
    const cordura = result.byMaterial.find((e) => e.materialId === 'mat-cordura');
    const mesh = result.byMaterial.find((e) => e.materialId === 'mat-mesh');
    expect(cordura).toBeDefined();
    expect(mesh).toBeDefined();
  });

  it('byMaterial entries have materialId, totalAreaMm2, pieces', () => {
    const result = exportCutList(makePattern(), materials, hardware);
    for (const entry of result.byMaterial) {
      expect(typeof entry.materialId).toBe('string');
      expect(typeof entry.totalAreaMm2).toBe('number');
      expect(Array.isArray(entry.pieces)).toBe(true);
    }
  });

  it('totalAreaMm2 is positive for pieces with dimensions', () => {
    const result = exportCutList(makePattern(), materials, hardware);
    for (const entry of result.byMaterial) {
      expect(entry.totalAreaMm2).toBeGreaterThan(0);
    }
  });

  it('includes both piece ids in cordura entry', () => {
    const result = exportCutList(makePattern(), materials, hardware);
    const cordura = result.byMaterial.find((e) => e.materialId === 'mat-cordura');
    expect(cordura?.pieces).toContain('front-panel');
    expect(cordura?.pieces).toContain('back-panel');
  });

  it('byHardware entries have hardwareId and count', () => {
    const result = exportCutList(makePattern(), materials, hardware);
    expect(result.byHardware.length).toBe(2);
    for (const entry of result.byHardware) {
      expect(typeof entry.hardwareId).toBe('string');
      expect(typeof entry.count).toBe('number');
    }
  });

  it('maps hardware quantities to count', () => {
    const result = exportCutList(makePattern(), materials, hardware);
    const zipper = result.byHardware.find((e) => e.hardwareId === 'hw-zipper-main');
    const buckle = result.byHardware.find((e) => e.hardwareId === 'hw-buckle-strap');
    expect(zipper?.count).toBe(1);
    expect(buckle?.count).toBe(2);
  });

  it('handles pieces with no materialId (uses "unspecified")', () => {
    const patternNoMat: Pattern = {
      id: 'no-mat',
      name: 'No Material',
      pieces: [
        {
          id: 'piece-x',
          name: 'Piece X',
          mirror: false,
          quantity: 1,
          paths: [
            {
              id: 'px-path',
              closed: true,
              edges: [
                { kind: 'straight', role: 'cut', start: { x: 0, y: 0 }, end: { x: 50, y: 0 } },
                { kind: 'straight', role: 'cut', start: { x: 50, y: 0 }, end: { x: 50, y: 50 } },
                { kind: 'straight', role: 'cut', start: { x: 50, y: 50 }, end: { x: 0, y: 0 } },
              ],
            },
          ],
        },
      ],
    };
    const result = exportCutList(patternNoMat, [], []);
    expect(result.byMaterial[0]?.materialId).toBe('unspecified');
  });

  it('handles empty hardware list', () => {
    const result = exportCutList(makePattern(), materials, []);
    expect(result.byHardware).toHaveLength(0);
  });
});

describe('exportCutListCsv', () => {
  it('returns a string', () => {
    const result = exportCutList(makePattern(), materials, hardware);
    const csv = exportCutListCsv(result, materials);
    expect(typeof csv).toBe('string');
  });

  it('includes a CSV header row', () => {
    const result = exportCutList(makePattern(), materials, hardware);
    const csv = exportCutListCsv(result, materials);
    expect(csv).toContain('Material ID');
    expect(csv).toContain('Total Area');
  });

  it('includes material names in the CSV', () => {
    const result = exportCutList(makePattern(), materials, hardware);
    const csv = exportCutListCsv(result, materials);
    expect(csv).toContain('500D Cordura');
    expect(csv).toContain('Air Mesh');
  });
});
