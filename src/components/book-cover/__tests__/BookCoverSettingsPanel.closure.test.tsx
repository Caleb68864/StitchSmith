import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import { BookCoverSettingsPanel } from '../BookCoverSettingsPanel.js';
import type { BookCoverProjectInputs } from '../../../state/useBookCoverProject.js';

vi.mock('@/components/ui/select', () => ({
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Select: ({ value, onValueChange, children, ...rest }: any) => (
    <select value={value ?? ''} onChange={(e: React.ChangeEvent<HTMLSelectElement>) => onValueChange?.(e.target.value)} {...rest}>
      {children}
    </select>
  ),
  SelectTrigger: (_props: unknown) => null,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="">{placeholder ?? ''}</option>,
  SelectContent: ({ children }: { children: React.ReactNode }) => <>{children}</>,
  SelectItem: ({ value, children }: { value: string; children: React.ReactNode }) => (
    <option value={value}>{children}</option>
  ),
}));

const BASE_INPUTS: BookCoverProjectInputs = {
  book_height: 240,
  book_width: 165,
  spine_width: 20,
  flap_depth: 30,
  seam_allowance: 9.5,
  top_bottom_hem: 12,
  units: 'mm',
};

function makeProps(overrides?: Partial<BookCoverProjectInputs>) {
  const inputs: BookCoverProjectInputs = { ...BASE_INPUTS, ...overrides };
  return {
    inputs,
    errors: {},
    onChange: vi.fn(),
    onToggleOuterPocket: vi.fn(),
    onToggleInnerPocket: vi.fn(),
    onTogglePenHolder: vi.fn(),
  };
}

function getClosureSelectEl() {
  const wrapper = screen.getByTestId('closure-select');
  return within(wrapper).getByRole('combobox') as HTMLSelectElement;
}

describe('BookCoverSettingsPanel — closure dropdown', () => {
  it('renders a closure select with 5 options', () => {
    render(<BookCoverSettingsPanel {...makeProps()} />);
    const closureSelect = getClosureSelectEl();
    const options = closureSelect.querySelectorAll('option');
    const labeledOptions = Array.from(options).filter(o => o.value !== '');
    expect(labeledOptions).toHaveLength(5);
  });

  it('closure select has option "None (wrap)"', () => {
    render(<BookCoverSettingsPanel {...makeProps()} />);
    const closureSelect = getClosureSelectEl();
    expect(within(closureSelect).getByRole('option', { name: 'None (wrap)' })).toBeTruthy();
  });

  it('closure select has option "Zipper"', () => {
    render(<BookCoverSettingsPanel {...makeProps()} />);
    const closureSelect = getClosureSelectEl();
    expect(within(closureSelect).getByRole('option', { name: 'Zipper' })).toBeTruthy();
  });

  it('closure select has option "Elastic"', () => {
    render(<BookCoverSettingsPanel {...makeProps()} />);
    const closureSelect = getClosureSelectEl();
    expect(within(closureSelect).getByRole('option', { name: 'Elastic' })).toBeTruthy();
  });

  it('closure select has option "Snap"', () => {
    render(<BookCoverSettingsPanel {...makeProps()} />);
    const closureSelect = getClosureSelectEl();
    expect(within(closureSelect).getByRole('option', { name: 'Snap' })).toBeTruthy();
  });

  it('closure select has option "Flap & Buckle"', () => {
    render(<BookCoverSettingsPanel {...makeProps()} />);
    const closureSelect = getClosureSelectEl();
    expect(within(closureSelect).getByRole('option', { name: 'Flap & Buckle' })).toBeTruthy();
  });
});

describe('BookCoverSettingsPanel — closure: none hides closure fields', () => {
  it('no closure input hides zipper gauge field', () => {
    render(<BookCoverSettingsPanel {...makeProps()} />);
    expect(screen.queryByLabelText(/gauge/i)).toBeNull();
  });

  it('closure: none hides all closure-specific fields', () => {
    render(<BookCoverSettingsPanel {...makeProps({ closure: { kind: 'none' } })} />);
    expect(screen.queryByLabelText(/gauge/i)).toBeNull();
    expect(screen.queryByLabelText(/corner radius/i)).toBeNull();
  });
});

describe('BookCoverSettingsPanel — closure: zipper reveals fields', () => {
  it('zipper closure reveals gauge select wrapper', () => {
    render(
      <BookCoverSettingsPanel
        {...makeProps({ closure: { kind: 'zipper', gauge: '#5' } })}
      />
    );
    expect(screen.getByTestId('zipper-gauge-select')).toBeTruthy();
  });

  it('zipper closure reveals corner_radius input', () => {
    render(
      <BookCoverSettingsPanel
        {...makeProps({ closure: { kind: 'zipper', gauge: '#5' } })}
      />
    );
    expect(screen.getByLabelText(/corner radius/i)).toBeTruthy();
  });

  it('zipper #5 corner_radius placeholder is "1.25 in"', () => {
    render(
      <BookCoverSettingsPanel
        {...makeProps({ closure: { kind: 'zipper', gauge: '#5' }, units: 'in' })}
      />
    );
    const input = screen.getByLabelText(/corner radius/i) as HTMLInputElement;
    expect(input.placeholder).toMatch(/1\.25/);
  });

  it('zipper #10 corner_radius placeholder shows a larger value than #5', () => {
    render(
      <BookCoverSettingsPanel
        {...makeProps({ closure: { kind: 'zipper', gauge: '#10' }, units: 'in' })}
      />
    );
    const input = screen.getByLabelText(/corner radius/i) as HTMLInputElement;
    // #10 default is 50.8 mm = 2.00 in
    expect(input.placeholder).toMatch(/2\./);
  });
});

describe('BookCoverSettingsPanel — closure: elastic reveals fields', () => {
  it('elastic closure hides zipper gauge', () => {
    render(
      <BookCoverSettingsPanel
        {...makeProps({ closure: { kind: 'elastic' } })}
      />
    );
    expect(screen.queryByTestId('zipper-gauge-select')).toBeNull();
  });

  it('elastic closure reveals elastic width field', () => {
    render(
      <BookCoverSettingsPanel
        {...makeProps({ closure: { kind: 'elastic' } })}
      />
    );
    expect(screen.getByLabelText(/elastic width/i)).toBeTruthy();
  });
});

describe('BookCoverSettingsPanel — closure: snap reveals fields', () => {
  it('snap closure reveals snap count field', () => {
    render(
      <BookCoverSettingsPanel
        {...makeProps({ closure: { kind: 'snap' } })}
      />
    );
    expect(screen.getByLabelText(/snap count/i)).toBeTruthy();
  });
});

describe('BookCoverSettingsPanel — closure: flap-buckle reveals fields', () => {
  it('flap-buckle closure reveals strap width field', () => {
    render(
      <BookCoverSettingsPanel
        {...makeProps({ closure: { kind: 'flap-buckle' } })}
      />
    );
    expect(screen.getByLabelText(/strap width/i)).toBeTruthy();
  });
});

describe('BookCoverSettingsPanel — selecting zipper from dropdown', () => {
  it('onChange called with zipper closure when selecting Zipper', () => {
    const props = makeProps();
    render(<BookCoverSettingsPanel {...props} />);
    const closureSelect = getClosureSelectEl();
    fireEvent.change(closureSelect, { target: { value: 'zipper' } });
    expect(props.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ closure: expect.objectContaining({ kind: 'zipper' }) })
    );
  });

  it('onChange called with none closure when selecting None', () => {
    const props = makeProps({ closure: { kind: 'zipper', gauge: '#5' } });
    render(<BookCoverSettingsPanel {...props} />);
    const closureSelect = getClosureSelectEl();
    fireEvent.change(closureSelect, { target: { value: 'none' } });
    expect(props.onChange).toHaveBeenCalledWith(
      expect.objectContaining({ closure: expect.objectContaining({ kind: 'none' }) })
    );
  });
});
