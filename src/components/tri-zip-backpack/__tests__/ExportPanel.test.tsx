import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExportPanel } from '../ExportPanel.js';
import { makeDefaultTriZipProject } from '../../../state/useTriZipProject.js';

const defaultInputs = {
  height: 450,
  width: 300,
  depth: 150,
  units: 'mm' as const,
  stylePreset: 'urban_assault' as const,
};

const defaultProject = makeDefaultTriZipProject();

function makeProps(hasErrors = false) {
  return {
    inputs: defaultInputs,
    project: defaultProject,
    hasErrors,
    onImportProject: vi.fn(),
  };
}

describe('ExportPanel', () => {
  it('renders all six export actions', () => {
    render(<ExportPanel {...makeProps()} />);
    expect(screen.getByRole('button', { name: /SVG/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /tiled printable HTML/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /PDF/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /DXF/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cut List/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Instructions/i })).toBeTruthy();
  });

  it('does NOT show Save/Import Project buttons (now owned by PatternPageShell)', () => {
    render(<ExportPanel {...makeProps()} />);
    expect(screen.queryByRole('button', { name: /Save Project/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /Import Project/i })).toBeNull();
  });

  it('disables all export buttons when hasErrors is true', () => {
    render(<ExportPanel {...makeProps(true)} />);
    const svgBtn = screen.getByRole('button', { name: /SVG/i });
    expect(svgBtn).toHaveProperty('disabled', true);
    const pdfBtn = screen.getByRole('button', { name: /PDF/i });
    expect(pdfBtn).toHaveProperty('disabled', true);
    const dxfBtn = screen.getByRole('button', { name: /DXF/i });
    expect(dxfBtn).toHaveProperty('disabled', true);
  });

  it('enables export buttons when hasErrors is false', () => {
    render(<ExportPanel {...makeProps(false)} />);
    const svgBtn = screen.getByRole('button', { name: /SVG/i });
    expect(svgBtn).toHaveProperty('disabled', false);
  });

  it('shows error message when hasErrors is true', () => {
    render(<ExportPanel {...makeProps(true)} />);
    expect(screen.getByText(/Fix validation errors/i)).toBeTruthy();
  });

  it('shows Export heading', () => {
    render(<ExportPanel {...makeProps()} />);
    expect(screen.getByText(/^Export$/i)).toBeTruthy();
  });
});
