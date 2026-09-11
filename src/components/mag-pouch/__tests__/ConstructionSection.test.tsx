import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ConstructionSection } from '../sections/ConstructionSection.js';
import { MagPouchPage } from '../MagPouchPage.js';
import { makeDefaultMagPouchProject } from '../../../state/useMagPouchProject.js';
import type { MagPouchInputs } from '../../../generators/mag-pouch/types.js';

function inputs(overrides: Partial<MagPouchInputs> = {}): MagPouchInputs {
  return { ...makeDefaultMagPouchProject().inputs, ...overrides };
}

describe('ConstructionSection', () => {
  it('disables the cell count for the folded-T and enables it for the card', () => {
    const onChange = vi.fn();
    const { rerender } = render(<ConstructionSection inputs={inputs()} errors={{}} onChange={onChange} />);
    expect((screen.getByLabelText(/Cells/i) as HTMLInputElement).disabled).toBe(true);
    rerender(<ConstructionSection inputs={inputs({ construction: 'pleated_card' })} errors={{}} onChange={onChange} />);
    expect((screen.getByLabelText(/Cells/i) as HTMLInputElement).disabled).toBe(false);
    expect(screen.getByLabelText(/Cell bottom/i)).toBeTruthy();
    expect(screen.getByLabelText(/Back hem/i)).toBeTruthy();
  });

  it('switching to the folded-T resets the cell count to 1', () => {
    const onChange = vi.fn();
    render(<ConstructionSection inputs={inputs({ construction: 'pleated_card', cell_count: 4 })} errors={{}} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText(/^Construction$/i), { target: { value: 'folded_t' } });
    expect(onChange).toHaveBeenCalledWith({ construction: 'folded_t', cell_count: 1 });
  });

  it('shows the derived span as the override placeholder and surfaces field errors', () => {
    render(
      <ConstructionSection
        inputs={inputs({ construction: 'pleated_card' })}
        errors={{ cell_count: 'cell_count must be a whole number' }}
        onChange={vi.fn()}
        derived={{
          construction: 'pleated_card', platform: 'rifle_556', cellCount: 1, cellSpanIn: 3, palsColumns: 2,
          facePerCellIn: 4.8625, puckerPerSideIn: 0.93, pouchHeightIn: 5.25, exposedHeightIn: 2.25,
          flapLengthIn: 0, palsRows: 2, maxLayers: 8, caliberLocked: false,
        }}
      />,
    );
    expect((screen.getByLabelText(/Cell span/i) as HTMLInputElement).placeholder).toContain('3.00');
    expect(screen.getByText(/cell_count must be a whole number/)).toBeTruthy();
  });
});

describe('MagPouchPage — card build', () => {
  it('renders the derived summary and the cut list for a 4-cell card', () => {
    const project = makeDefaultMagPouchProject();
    project.inputs = { ...project.inputs, construction: 'pleated_card', cell_count: 4, retention: 'velcro_dot' };
    render(<MagPouchPage project={project} updateInputs={vi.fn()} resetProject={vi.fn()} importProject={vi.fn()} />);
    expect(screen.getByTestId('derived-summary').textContent).toContain('Pleated card, 4 cells');
    expect(screen.getByText(/Cut Pieces/i)).toBeTruthy();
    expect(screen.getAllByText(/Cradle strip/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/^Drainage$/)).toBeNull();
  });

  it('shows the Construction section and the Drainage section for the folded-T default', () => {
    const project = makeDefaultMagPouchProject();
    render(<MagPouchPage project={project} updateInputs={vi.fn()} resetProject={vi.fn()} importProject={vi.fn()} />);
    expect(screen.getAllByText(/Construction/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Drainage/i).length).toBeGreaterThan(0);
    expect(screen.getByTestId('derived-summary').textContent).toContain('Folded-T single');
  });
});
