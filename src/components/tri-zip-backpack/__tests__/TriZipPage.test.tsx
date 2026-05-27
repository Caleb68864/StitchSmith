import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TriZipPage } from '../TriZipPage.js';
import { makeDefaultTriZipProject } from '../../../state/useTriZipProject.js';

function makeProps(overrides?: Partial<Parameters<typeof TriZipPage>[0]>) {
  const project = makeDefaultTriZipProject();
  return {
    project,
    updateInputs: () => undefined,
    resetProject: () => undefined,
    importProject: () => undefined,
    ...overrides,
  };
}

describe('TriZipPage', () => {
  it('renders the page title', () => {
    render(<TriZipPage {...makeProps()} />);
    expect(screen.getByText(/Tri-Zip Backpack Generator/i)).toBeTruthy();
  });

  it('shows the computed volume readout', () => {
    render(<TriZipPage {...makeProps()} />);
    expect(screen.getByText(/Computed volume:/i)).toBeTruthy();
  });

  it('updates volume when dimensions change', () => {
    const props = makeProps();
    const { rerender } = render(<TriZipPage {...props} />);

    const updatedProject = {
      ...props.project,
      inputs: { ...props.project.inputs, height: 500, width: 350, depth: 200 },
    };
    rerender(<TriZipPage {...props} project={updatedProject} />);

    const expected = ((500 * 350 * 200) / 1_000_000).toFixed(1);
    expect(screen.getByText(new RegExp(`${expected} L`))).toBeTruthy();
  });

  it('shows validation errors for zero height', () => {
    const props = makeProps();
    const invalidProject = {
      ...props.project,
      inputs: { ...props.project.inputs, height: 0 },
    };
    render(<TriZipPage {...props} project={invalidProject} />);
    expect(screen.getAllByText(/Validation errors/i).length).toBeGreaterThan(0);
  });

  it('shows validation errors for negative width', () => {
    const props = makeProps();
    const invalidProject = {
      ...props.project,
      inputs: { ...props.project.inputs, width: -10 },
    };
    render(<TriZipPage {...props} project={invalidProject} />);
    expect(screen.getAllByText(/Validation errors/i).length).toBeGreaterThan(0);
  });

  it('shows Style & Dimensions section by default', () => {
    render(<TriZipPage {...makeProps()} />);
    expect(screen.getByText(/Style & Dimensions/i)).toBeTruthy();
  });

  it('shows accordion sections for geometry, zipper, back panel etc', () => {
    render(<TriZipPage {...makeProps()} />);
    expect(screen.getAllByText(/Tri-Zip Geometry/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Zipper System/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Back Panel/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Shoulder Straps/i).length).toBeGreaterThan(0);
  });

  it('shows export panel with SVG button', () => {
    render(<TriZipPage {...makeProps()} />);
    expect(screen.getByRole('button', { name: /SVG/i })).toBeTruthy();
  });

  it('export buttons are disabled when there are validation errors', () => {
    const props = makeProps();
    const invalidProject = {
      ...props.project,
      inputs: { ...props.project.inputs, height: 0 },
    };
    render(<TriZipPage {...props} project={invalidProject} />);
    const svgButton = screen.getByRole('button', { name: /SVG/i });
    expect(svgButton).toHaveProperty('disabled', true);
  });
});
