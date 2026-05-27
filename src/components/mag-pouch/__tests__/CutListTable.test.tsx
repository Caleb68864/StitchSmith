import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { CutListTable } from '../CutListTable.js';
import type { CutPieceRow } from '../CutListTable.js';
import type { MagPouchBom } from '../../../generators/mag-pouch/types.js';

/**
 * M14 — BOM Discipline: every structured field (widthMm, sizeMm, quantity, notes)
 * must render in the DOM.
 */

const FIXTURE_CUT_PIECES: CutPieceRow[] = [
  {
    id: 'body-front',
    name: 'Body Front Panel',
    widthMm: 76.2,
    sizeMm: 203.2,
    quantity: 1,
    notes: 'Cut from Cordura 500D',
  },
  {
    id: 'body-back',
    name: 'Body Back Panel',
    widthMm: 76.2,
    sizeMm: 203.2,
    quantity: 1,
    notes: 'Cut with seam allowance',
  },
];

const FIXTURE_BOM: MagPouchBom = {
  materials: [
    {
      id: 'main-fabric',
      name: 'Cordura 500D',
      type: 'fabric',
      notes: 'OD green colorway',
    },
    {
      id: 'webbing',
      name: '1-inch Nylon Webbing',
      type: 'webbing',
    },
  ],
  hardware: [
    {
      id: 'snap-1',
      name: 'Line 24 T-post Snap',
      type: 'snap',
      quantity: 4,
      notes: 'Nickel finish',
    },
  ],
};

describe('CutListTable (M14)', () => {
  it('renders widthMm values for all cut pieces', () => {
    render(<CutListTable bom={FIXTURE_BOM} cutPieces={FIXTURE_CUT_PIECES} />);
    // Both cut pieces have widthMm 76.2
    const cells = screen.getAllByText('76.2');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('renders sizeMm values for all cut pieces', () => {
    render(<CutListTable bom={FIXTURE_BOM} cutPieces={FIXTURE_CUT_PIECES} />);
    const cells = screen.getAllByText('203.2');
    expect(cells.length).toBeGreaterThan(0);
  });

  it('renders quantity for cut pieces', () => {
    render(<CutListTable bom={FIXTURE_BOM} cutPieces={FIXTURE_CUT_PIECES} />);
    const quantityCells = screen.getAllByText('1');
    expect(quantityCells.length).toBeGreaterThan(0);
  });

  it('renders notes for cut pieces', () => {
    render(<CutListTable bom={FIXTURE_BOM} cutPieces={FIXTURE_CUT_PIECES} />);
    expect(screen.getByText('Cut from Cordura 500D')).toBeTruthy();
    expect(screen.getByText('Cut with seam allowance')).toBeTruthy();
  });

  it('renders material names from BOM', () => {
    render(<CutListTable bom={FIXTURE_BOM} cutPieces={FIXTURE_CUT_PIECES} />);
    expect(screen.getByText('Cordura 500D')).toBeTruthy();
    expect(screen.getByText('1-inch Nylon Webbing')).toBeTruthy();
  });

  it('renders hardware with quantity and notes', () => {
    render(<CutListTable bom={FIXTURE_BOM} cutPieces={FIXTURE_CUT_PIECES} />);
    expect(screen.getByText('Line 24 T-post Snap')).toBeTruthy();
    expect(screen.getByText('4')).toBeTruthy();
    expect(screen.getByText('Nickel finish')).toBeTruthy();
  });

  it('renders material notes', () => {
    render(<CutListTable bom={FIXTURE_BOM} cutPieces={FIXTURE_CUT_PIECES} />);
    expect(screen.getByText('OD green colorway')).toBeTruthy();
  });

  it('shows BOM sections even without cut pieces', () => {
    render(<CutListTable bom={FIXTURE_BOM} />);
    expect(screen.getByText('Materials')).toBeTruthy();
    expect(screen.getByText('Hardware BOM')).toBeTruthy();
  });

  it('shows empty state when bom is empty', () => {
    const emptyBom: MagPouchBom = { materials: [], hardware: [] };
    render(<CutListTable bom={emptyBom} />);
    expect(screen.getByText(/No items in BOM/i)).toBeTruthy();
  });
});
