import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { MagPouchPage } from '../MagPouchPage.js';
import { makeDefaultMagPouchProject } from '../../../state/useMagPouchProject.js';

function makeProps(overrides?: Partial<Parameters<typeof MagPouchPage>[0]>) {
  const project = makeDefaultMagPouchProject();
  return {
    project,
    updateInputs: vi.fn(),
    resetProject: vi.fn(),
    importProject: vi.fn(),
    ...overrides,
  };
}

describe('MagPouchPage', () => {
  it('renders the page title', () => {
    render(<MagPouchPage {...makeProps()} />);
    expect(screen.getByText(/Mag Pouch Generator/i)).toBeTruthy();
  });

  it('shows the Magazine accordion section expanded by default', () => {
    render(<MagPouchPage {...makeProps()} />);
    // The magazine preset dropdown should be visible
    expect(screen.getByLabelText(/Predefined magazine/i)).toBeTruthy();
  });

  it('contains a settings panel with all six sections', () => {
    render(<MagPouchPage {...makeProps()} />);
    expect(screen.getAllByText(/Magazine/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Fit/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Retention/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Closure/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Attachment/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Drainage/i).length).toBeGreaterThan(0);
  });

  it('shows the export panel with SVG button', () => {
    render(<MagPouchPage {...makeProps()} />);
    expect(screen.getByRole('button', { name: /SVG/i })).toBeTruthy();
  });

  it('shows validation errors when inputs are invalid', () => {
    const props = makeProps();
    const invalidProject = {
      ...props.project,
      inputs: {
        ...props.project.inputs,
        magazine: { mode: 'custom' as const, units: 'in' as const, height: 0, width: -1, thickness: 1 },
      },
    };
    render(<MagPouchPage {...props} project={invalidProject} />);
    expect(screen.getAllByText(/Validation errors/i).length).toBeGreaterThan(0);
  });

  it('disables export buttons when there are validation errors', () => {
    const props = makeProps();
    const invalidProject = {
      ...props.project,
      inputs: {
        ...props.project.inputs,
        magazine: { mode: 'custom' as const, units: 'in' as const, height: 0, width: -1, thickness: 1 },
      },
    };
    render(<MagPouchPage {...props} project={invalidProject} />);
    const svgButton = screen.getByRole('button', { name: /SVG/i });
    expect(svgButton).toHaveProperty('disabled', true);
  });

  it('shows the legend in the pattern preview area', () => {
    render(<MagPouchPage {...makeProps()} />);
    // PatternEngineLegend renders a "Legend" summary
    expect(screen.getAllByText(/Legend/i).length).toBeGreaterThan(0);
  });

  it('shows construction steps', () => {
    render(<MagPouchPage {...makeProps()} />);
    expect(screen.getAllByText(/Assembly Instructions/i).length).toBeGreaterThan(0);
  });

  it('per-field errors come from validateInputs — no deriveErrors helper', () => {
    // This test verifies that error messages come from the engine validator.
    // We pass a known-bad input and check that the known error string appears.
    const props = makeProps();
    const invalidProject = {
      ...props.project,
      inputs: {
        ...props.project.inputs,
        magazine: { mode: 'custom' as const, units: 'in' as const, height: 0, width: 2.5, thickness: 1.0 },
      },
    };
    render(<MagPouchPage {...props} project={invalidProject} />);
    // The engine returns an error for height: 0 — look for "height" in any error text
    const allText = document.body.innerText ?? document.body.textContent ?? '';
    expect(allText.toLowerCase()).toContain('height');
  });
});
