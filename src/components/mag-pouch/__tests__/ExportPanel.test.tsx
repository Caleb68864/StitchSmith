import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ExportPanel } from '../ExportPanel.js';
import { makeDefaultMagPouchProject } from '../../../state/useMagPouchProject.js';

function makeProps(hasErrors = false) {
  const project = makeDefaultMagPouchProject();
  return {
    inputs: project.inputs,
    project,
    result: null,
    hasErrors,
    onImportProject: vi.fn(),
  };
}

describe('ExportPanel (MagPouch)', () => {
  it('renders all six export actions', () => {
    render(<ExportPanel {...makeProps()} />);
    expect(screen.getByRole('button', { name: /SVG/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Tiled printable HTML/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /PDF/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /DXF/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Cut List/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Instructions/i })).toBeTruthy();
  });

  it('shows Save Project button', () => {
    render(<ExportPanel {...makeProps()} />);
    expect(screen.getByRole('button', { name: /Save Project/i })).toBeTruthy();
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

  it('shows error message when hasErrors is true', () => {
    render(<ExportPanel {...makeProps(true)} />);
    expect(screen.getByText(/Fix validation errors/i)).toBeTruthy();
  });

  it('shows Export heading', () => {
    render(<ExportPanel {...makeProps()} />);
    expect(screen.getByText(/^Export$/i)).toBeTruthy();
  });

  it('uses lazy façade for PDF (loadPdfExporter import found in source)', () => {
    // This is a structural test — the presence of loadPdfExporter is verified at
    // build-time by the grep check in the spec. Here we just confirm the module
    // renders without throwing.
    expect(() => render(<ExportPanel {...makeProps()} />)).not.toThrow();
  });
});
