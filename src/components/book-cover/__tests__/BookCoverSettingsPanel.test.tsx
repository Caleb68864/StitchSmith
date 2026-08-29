import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { BookCoverSettingsPanel } from '../BookCoverSettingsPanel.js';
import type { BookCoverProjectInputs } from '../../../state/useBookCoverProject.js';

vi.mock('@/components/ui/select', () => ({
  Select: ({ value, onValueChange, children }: { value?: string; onValueChange?: (v: string) => void; children: React.ReactNode }) => (
    <select value={value ?? ''} onChange={e => onValueChange?.(e.target.value)}>
      {children}
    </select>
  ),
  SelectTrigger: (_props: { children?: React.ReactNode; id?: string; className?: string }) => null,
  SelectValue: ({ placeholder }: { placeholder?: string }) => <option value="">{placeholder ?? 'Custom'}</option>,
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

describe('BookCoverSettingsPanel — preset dropdowns render', () => {
  it('renders the Book preset dropdown', () => {
    render(<BookCoverSettingsPanel {...makeProps()} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects.length).toBeGreaterThanOrEqual(2);
  });

  it('renders the Foldover preset dropdown', () => {
    render(<BookCoverSettingsPanel {...makeProps()} />);
    const selects = screen.getAllByRole('combobox');
    expect(selects[1]).toBeTruthy();
  });

  it('book preset dropdown includes "Bible — Compact" option', () => {
    render(<BookCoverSettingsPanel {...makeProps()} />);
    expect(screen.getByRole('option', { name: 'Bible — Compact' })).toBeTruthy();
  });

  it('foldover preset dropdown includes "Tactical" option', () => {
    render(<BookCoverSettingsPanel {...makeProps()} />);
    expect(screen.getByRole('option', { name: 'Tactical' })).toBeTruthy();
  });
});

describe('BookCoverSettingsPanel — book preset selection', () => {
  it('selecting "bible-compact" calls onChange with four dimensions and book_preset', () => {
    const props = makeProps();
    render(<BookCoverSettingsPanel {...props} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'bible-compact' } });
    expect(props.onChange).toHaveBeenCalledOnce();
    const call = props.onChange.mock.calls[0][0] as Partial<BookCoverProjectInputs>;
    expect(call.book_preset).toBe('bible-compact');
    expect(call.book_height).toBeCloseTo(6.5 * 25.4, 3);
    expect(call.book_width).toBeCloseTo(4.6 * 25.4, 3);
    expect(call.spine_width).toBeCloseTo(1.45 * 25.4, 3);
    expect(call.flap_depth).toBe(65);
  });

  it('selecting "bible-compact" in inch mode calls onChange with inch values', () => {
    const props = makeProps({ units: 'in' });
    render(<BookCoverSettingsPanel {...props} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: 'bible-compact' } });
    const call = props.onChange.mock.calls[0][0] as Partial<BookCoverProjectInputs>;
    expect(call.book_preset).toBe('bible-compact');
    expect(call.book_height).toBeCloseTo(6.5, 3);
    expect(call.book_width).toBeCloseTo(4.6, 3);
  });

  it('selecting empty string clears book_preset', () => {
    const props = makeProps({ book_preset: 'bible-compact' });
    render(<BookCoverSettingsPanel {...props} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[0], { target: { value: '' } });
    expect(props.onChange).toHaveBeenCalledWith({ book_preset: undefined });
  });
});

describe('BookCoverSettingsPanel — manual dimension clears preset', () => {
  it('editing book_width calls onChange with book_preset: undefined', () => {
    const props = makeProps({ book_preset: 'bible-compact' });
    render(<BookCoverSettingsPanel {...props} />);
    const bookWidthInput = screen.getByLabelText(/Width \(mm\)/);
    fireEvent.change(bookWidthInput, { target: { value: '170' } });
    const call = props.onChange.mock.calls[0][0] as Partial<BookCoverProjectInputs>;
    expect(call.book_width).toBe(170);
    expect(call.book_preset).toBeUndefined();
  });

  it('editing book_height clears book_preset', () => {
    const props = makeProps({ book_preset: 'a5-notebook' });
    render(<BookCoverSettingsPanel {...props} />);
    const heightInput = screen.getByLabelText(/Height \(mm\)/);
    fireEvent.change(heightInput, { target: { value: '250' } });
    const call = props.onChange.mock.calls[0][0] as Partial<BookCoverProjectInputs>;
    expect(call.book_preset).toBeUndefined();
    expect(call.book_height).toBe(250);
  });

  it('editing flap_depth clears both book_preset and foldover_preset', () => {
    const props = makeProps({ book_preset: 'a5-notebook', foldover_preset: 'tactical' });
    render(<BookCoverSettingsPanel {...props} />);
    const flapInput = screen.getByLabelText(/Flap Depth \(mm\)/);
    fireEvent.change(flapInput, { target: { value: '55' } });
    const call = props.onChange.mock.calls[0][0] as Partial<BookCoverProjectInputs>;
    expect(call.flap_depth).toBe(55);
    expect(call.book_preset).toBeUndefined();
    expect(call.foldover_preset).toBeUndefined();
  });
});

describe('BookCoverSettingsPanel — foldover preset selection', () => {
  it('selecting "tactical" calls onChange with flap_depth and foldover_preset', () => {
    const props = makeProps();
    render(<BookCoverSettingsPanel {...props} />);
    const selects = screen.getAllByRole('combobox');
    fireEvent.change(selects[1], { target: { value: 'tactical' } });
    const call = props.onChange.mock.calls[0][0] as Partial<BookCoverProjectInputs>;
    expect(call.foldover_preset).toBe('tactical');
    expect(call.flap_depth).toBe(100);
  });
});

describe('BookCoverSettingsPanel — width_ease and spine_bulge fields', () => {
  it('entering a width_ease value calls onChange with width_ease', () => {
    const props = makeProps();
    render(<BookCoverSettingsPanel {...props} />);
    const easeInput = screen.getByLabelText(/Width Ease/);
    fireEvent.change(easeInput, { target: { value: '15' } });
    const call = props.onChange.mock.calls[0][0] as Partial<BookCoverProjectInputs>;
    expect(call.width_ease).toBe(15);
  });

  it('entering a spine_bulge value calls onChange with spine_bulge', () => {
    const props = makeProps();
    render(<BookCoverSettingsPanel {...props} />);
    const bulgeInput = screen.getByLabelText(/Spine Bulge/);
    fireEvent.change(bulgeInput, { target: { value: '8' } });
    const call = props.onChange.mock.calls[0][0] as Partial<BookCoverProjectInputs>;
    expect(call.spine_bulge).toBe(8);
  });

  it('width_ease input shows auto placeholder when value is undefined', () => {
    const props = makeProps({ spine_width: 25 });
    render(<BookCoverSettingsPanel {...props} />);
    const easeInput = screen.getByLabelText(/Width Ease/) as HTMLInputElement;
    expect(easeInput.placeholder).toContain('auto');
    expect(easeInput.placeholder).toContain('12.5');
  });

  it('spine_bulge shows auto placeholder for hardcover preset', () => {
    const props = makeProps({ book_preset: 'moleskine-classic-pocket' });
    render(<BookCoverSettingsPanel {...props} />);
    const bulgeInput = screen.getByLabelText(/Spine Bulge/) as HTMLInputElement;
    expect(bulgeInput.placeholder).toContain('auto');
    // 6.35 formatted to 1 decimal — engine may round to 6.3 or 6.4
    expect(bulgeInput.placeholder).toMatch(/6\.[34]/);
  });
});

describe('BookCoverSettingsPanel — unit toggle converts dimensions', () => {
  it('switching mm → in converts the four book dims and keeps mm-stored fields untouched', () => {
    const props = makeProps({
      outer_pocket: { width: 120, height: 100, position: 'front' },
      pen_holder: { count: 3, slot_width: 15 },
    });
    render(<BookCoverSettingsPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /^in$/ }));
    expect(props.onChange).toHaveBeenCalledOnce();
    const call = props.onChange.mock.calls[0][0] as Partial<BookCoverProjectInputs>;
    expect(call.units).toBe('in');
    expect(call.book_height).toBeCloseTo(240 / 25.4, 3);
    expect(call.book_width).toBeCloseTo(165 / 25.4, 3);
    expect(call.spine_width).toBeCloseTo(20 / 25.4, 3);
    expect(call.flap_depth).toBeCloseTo(30 / 25.4, 3);
    // Pockets and pen slots are stored in mm (the generator reads them raw),
    // so the toggle must not rescale them.
    expect(call).not.toHaveProperty('outer_pocket');
    expect(call).not.toHaveProperty('pen_holder');
    expect(call).not.toHaveProperty('seam_allowance');
  });

  it('clicking the already-active unit is a no-op', () => {
    const props = makeProps();
    render(<BookCoverSettingsPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /^mm$/ }));
    expect(props.onChange).not.toHaveBeenCalled();
  });
});

describe('BookCoverSettingsPanel — accessory dimensions are shown and entered in the display unit', () => {
  it('in inch mode, a 127 mm pocket width displays as 5 and typing 4 stores 101.6 mm', () => {
    const props = makeProps({ units: 'in', outer_pocket: { width: 127, height: 254, position: 'front' } });
    render(<BookCoverSettingsPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Outer Pocket/i }));
    const width = document.getElementById('outer-pocket-width') as HTMLInputElement;
    expect(width.value).toBe('5');
    fireEvent.change(width, { target: { value: '4' } });
    const call = props.onChange.mock.calls[0][0] as Partial<BookCoverProjectInputs>;
    expect(call.outer_pocket?.width).toBeCloseTo(101.6, 6);
    expect(call.outer_pocket?.height).toBe(254);
  });

  it('in inch mode, a 12.7 mm pen slot displays as 0.5 and typing 1 stores 25.4 mm', () => {
    const props = makeProps({ units: 'in', pen_holder: { count: 2, slot_width: 12.7 } });
    render(<BookCoverSettingsPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Pen Holder/i }));
    const slot = document.getElementById('pen-holder-slot-width') as HTMLInputElement;
    expect(slot.value).toBe('0.5');
    fireEvent.change(slot, { target: { value: '1' } });
    const call = props.onChange.mock.calls[0][0] as Partial<BookCoverProjectInputs>;
    expect(call.pen_holder?.slot_width).toBeCloseTo(25.4, 6);
    expect(call.pen_holder?.count).toBe(2);
  });

  it('in mm mode, pocket values pass through unchanged', () => {
    const props = makeProps({ inner_pocket: { width: 120, height: 80, position: 'back' } });
    render(<BookCoverSettingsPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /Inner Pocket/i }));
    const height = document.getElementById('inner-pocket-height') as HTMLInputElement;
    expect(height.value).toBe('80');
    fireEvent.change(height, { target: { value: '90' } });
    const call = props.onChange.mock.calls[0][0] as Partial<BookCoverProjectInputs>;
    expect(call.inner_pocket?.height).toBe(90);
  });
});
