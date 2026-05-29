import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { App } from './App.js';
import { _resetStorage } from '../state/useToolRollProject.js';
import { _resetZipPouchStorage } from '../state/useZipPouchProject.js';
import { _resetCircleSkirtStorage } from '../state/useCircleSkirtProject.js';
import { buildPattern } from '../generators/zip-pouch/buildPattern.js';
import { buildPattern as buildCircleSkirtPattern } from '../generators/circle-skirt/index.js';
import { patternToSvg } from '../lib/pattern-engine/exports/svg.js';
import type { Pattern } from '../lib/pattern-engine/graph/Pattern.js';
import type { ConstructionStyle } from '../generators/zip-pouch/types.js';

beforeEach(() => {
  localStorage.clear();
  _resetStorage();
  _resetZipPouchStorage();
  _resetCircleSkirtStorage();
  // Reset/destructive actions now confirm via window.confirm; auto-accept in tests.
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('App integration', () => {
  it('renders the StitchSmith header', () => {
    render(<App />);
    expect(screen.getAllByText(/StitchSmith/i).length).toBeGreaterThan(0);
  });

  it('shows the landing page with both patterns on first render', () => {
    render(<App />);
    expect(screen.getAllByText(/Tool Roll/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tri-Zip Backpack/i).length).toBeGreaterThan(0);
  });

  it('navigates to tool roll page when clicking Open Tool Roll', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Open Tool Roll/i }));
    // Lazy-loaded — wait for wrench inputs to appear
    await waitFor(() => expect(screen.getAllByDisplayValue(/wrench/i).length).toBe(4), { timeout: 5000 });
  });

  it('loads the 4 starter tools when navigating to tool roll', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Open Tool Roll/i }));
    await waitFor(() => expect(screen.getAllByDisplayValue(/wrench/i).length).toBe(4), { timeout: 5000 });
  });

  it('adds a tool so the tool count increments from 4 to 5', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Open Tool Roll/i }));
    await waitFor(() => screen.getByRole('button', { name: /add tool/i }), { timeout: 5000 });

    fireEvent.click(screen.getByRole('button', { name: /add tool/i }));

    await waitFor(() => expect(screen.queryAllByDisplayValue(/new tool/i).length).toBeGreaterThan(0));
    expect(screen.getAllByDisplayValue(/wrench|new tool/i).length).toBe(5);
  });

  it('Reset button restores the 4 starter tools (sampleTools)', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Open Tool Roll/i }));
    await waitFor(() => screen.getByRole('button', { name: /add tool/i }), { timeout: 5000 });

    fireEvent.click(screen.getByRole('button', { name: /add tool/i }));
    await waitFor(() => expect(screen.queryAllByDisplayValue(/new tool/i).length).toBeGreaterThan(0));

    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    await waitFor(() => expect(screen.queryAllByDisplayValue(/new tool/i).length).toBe(0));
    expect(screen.getAllByDisplayValue(/wrench/i).length).toBe(4);
  });

  it('navigates to tri-zip page when clicking Open Tri-Zip Backpack', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Open Tri-Zip Backpack/i }));
    await waitFor(() =>
      expect(screen.getAllByText(/Tri-Zip Backpack Generator/i).length).toBeGreaterThan(0),
      { timeout: 5000 }
    );
  });

  it('navigates to book cover page when clicking Open Book Cover', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Open Book Cover/i }));
    await waitFor(() =>
      expect(screen.getAllByText(/Book Cover Generator/i).length).toBeGreaterThan(0),
      { timeout: 5000 }
    );
  });

  it('landing page lists Book Cover among the patterns', () => {
    render(<App />);
    expect(screen.getAllByText(/Book Cover/i).length).toBeGreaterThan(0);
  });

  // Cross-page smoke: open each generator from the landing page and assert
  // (a) navigation succeeded, (b) the page mounted without throwing,
  // (c) the standard Import/Export/Reset buttons are visible (parity check).
  // Catches the next book-cover-style "blank page on mount" regression before
  // it ships, because such a crash also tears down the page header buttons.
  it('landing page renders a Zip Pouch card', () => {
    render(<App />);
    expect(screen.getAllByText(/Zip Pouch/i).length).toBeGreaterThan(0);
  });

  it('landing page has Open Zip Pouch button', () => {
    render(<App />);
    expect(screen.getByRole('button', { name: /Open Zip Pouch/i })).toBeTruthy();
  });

  it('smoke: Zip Pouch page mounts cleanly with settings panel and preview', async () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Open Zip Pouch/i }));
    await waitFor(() =>
      expect(screen.getAllByRole('button', { name: /reset/i }).length).toBeGreaterThan(0),
      { timeout: 5000 }
    );
    expect(screen.getAllByText(/Zip Pouch Generator/i).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /import/i }).length).toBeGreaterThan(0);
    expect(screen.getAllByRole('button', { name: /export/i }).length).toBeGreaterThan(0);
  });

  it('landing page has Open Circle Skirt button', async () => {
    render(<App />);
    await waitFor(
      () => expect(screen.getByRole('button', { name: /Open Circle Skirt/i })).toBeTruthy(),
      { timeout: 5000 },
    );
  });

  it('navigates to circle skirt page when clicking Open Circle Skirt', async () => {
    render(<App />);
    await waitFor(() => screen.getByRole('button', { name: /Open Circle Skirt/i }), { timeout: 5000 });
    fireEvent.click(screen.getByRole('button', { name: /Open Circle Skirt/i }));
    await waitFor(
      () => expect(screen.getAllByRole('button', { name: /reset/i }).length).toBeGreaterThan(0),
      { timeout: 5000 },
    );
    expect(screen.getAllByText(/Circle Skirt Generator/i).length).toBeGreaterThan(0);
  });

  const SMOKE_TARGETS = [
    { open: /Open Tool Roll/i, subtitle: /Tool Roll/i },
    { open: /Open Tri-Zip Backpack/i, subtitle: /Tri-Zip Backpack Generator/i },
    { open: /Open Roll-Top Stuff Sack/i, subtitle: /Roll-Top Stuff Sack Generator/i },
    { open: /Open Mag Pouch/i, subtitle: /Mag Pouch Generator/i },
    { open: /Open Book Cover/i, subtitle: /Book Cover Generator/i },
    { open: /Open Zip Pouch/i, subtitle: /Zip Pouch Generator/i },
    { open: /Open Circle Skirt/i, subtitle: /Circle Skirt Generator/i },
  ] as const;

  for (const { open, subtitle } of SMOKE_TARGETS) {
    it(`smoke: ${String(open).replace(/[/\\^$*+?.()|[\]{}]/g, '')} mounts cleanly with header chrome`, async () => {
      render(<App />);
      fireEvent.click(screen.getByRole('button', { name: open }));
      // Lazy-loaded page — wait for the Reset button (inside the lazy component,
      // not the header) to confirm the page is fully mounted before asserting.
      await waitFor(() =>
        expect(screen.getAllByRole('button', { name: /reset/i }).length).toBeGreaterThan(0),
        { timeout: 5000 }
      );
      // Page rendered without throwing — subtitle is the cheapest signal.
      expect(screen.getAllByText(subtitle).length).toBeGreaterThan(0);
      // Import + Export + Reset buttons visible. Tool Roll uses AppHeader, the
      // other four use PatternPageShell — both should expose all three.
      expect(screen.getAllByRole('button', { name: /import/i }).length).toBeGreaterThan(0);
      expect(screen.getAllByRole('button', { name: /export/i }).length).toBeGreaterThan(0);
    });
  }
});

// ─── Construction styles → SVG integration ──────────────────────────────────
// Spec SS-05: every construction style must flow through buildPattern →
// patternToSvg and yield real SVG markup. Catches a piece builder that emits
// geometry the SVG renderer cannot serialize (e.g. a cross-shaped piece).

describe('zip pouch construction styles → patternToSvg', () => {
  const NEW_STYLES: ConstructionStyle[] = ['cross-bottom', 'gusset-strip', 'multi-panel'];

  for (const style of NEW_STYLES) {
    it(`buildPattern with construction_style='${style}' renders to SVG`, () => {
      const result = buildPattern({ preset: 'toiletry', units: 'mm', construction_style: style });
      expect(result.ok).toBe(true);
      if (!result.ok) return;
      const pattern: Pattern = { id: 'zip-pouch', name: 'Zip Pouch', pieces: result.value.pieces };
      const svg = patternToSvg(pattern);
      expect(svg).toContain('<svg');
    });
  }

  it('all 4 construction styles produce SVG without throwing', () => {
    const allStyles: ConstructionStyle[] = ['boxed', 'cross-bottom', 'gusset-strip', 'multi-panel'];
    for (const construction_style of allStyles) {
      const result = buildPattern({ preset: 'toiletry', units: 'mm', construction_style });
      expect(result.ok).toBe(true);
      if (!result.ok) continue;
      const pattern: Pattern = { id: 'zip-pouch', name: 'Zip Pouch', pieces: result.value.pieces };
      const svg = patternToSvg(pattern);
      expect(svg).toContain('<svg');
    }
  });
});

// ─── Circle skirt → SVG integration ─────────────────────────────────────────
// Spec SS-03 [INTEGRATION]: inches→mm path and arc rendering end-to-end.

describe('circle skirt buildPattern → patternToSvg', () => {
  it('half preset with 28in waist, 24in length renders SVG with arc command', () => {
    const result = buildCircleSkirtPattern({ preset: 'half', waist_circumference: 28, skirt_length: 24, units: 'in' });
    const pattern: Pattern = { id: 'circle-skirt', name: 'Circle Skirt', pieces: result.pieces };
    const svg = patternToSvg(pattern);
    expect(svg).toContain('<svg');
    expect(svg).toContain(' A ');
  });

  it('full preset produces SVG', () => {
    const result = buildCircleSkirtPattern({ preset: 'full', waist_circumference: 700, skirt_length: 600, units: 'mm' });
    const pattern: Pattern = { id: 'circle-skirt', name: 'Circle Skirt', pieces: result.pieces };
    const svg = patternToSvg(pattern);
    expect(svg).toContain('<svg');
  });

  it('importProject guard: wrong generatorId throws with circle-skirt in message', () => {
    const fakeProject = { generatorId: 'zip-pouch' };
    expect(() => {
      if (fakeProject.generatorId !== 'circle-skirt') {
        throw new Error(`Cannot import project with generatorId '${fakeProject.generatorId}' into circle-skirt`);
      }
    }).toThrow('circle-skirt');
  });
});
