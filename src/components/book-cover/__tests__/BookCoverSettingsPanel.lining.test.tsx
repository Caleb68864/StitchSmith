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
    onToggleLining: vi.fn(),
    onToggleCardSlots: vi.fn(),
    onToggleBookmarkRibbon: vi.fn(),
    onToggleInternalZipPocket: vi.fn(),
    onToggleMeshPocket: vi.fn(),
    onToggleTactical: vi.fn(),
  };
}

describe('BookCoverSettingsPanel — Lining section', () => {
  it('renders a "Lining" section toggle', () => {
    render(<BookCoverSettingsPanel {...makeProps()} />);
    expect(screen.getByText('Lining')).toBeTruthy();
  });

  it('toggling Lining checkbox calls onToggleLining with true', () => {
    const props = makeProps();
    render(<BookCoverSettingsPanel {...props} />);
    const liningSection = screen.getByText('Lining').closest('div')!;
    const checkbox = liningSection.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox);
    expect(props.onToggleLining).toHaveBeenCalledWith(true);
  });

  it('shows interfacing select when lining is enabled', () => {
    render(<BookCoverSettingsPanel {...makeProps({ lining: { enabled: true } })} />);
    expect(screen.getByText('Interfacing')).toBeTruthy();
  });

  it('lining toggle checkbox is checked when lining.enabled is true', () => {
    render(<BookCoverSettingsPanel {...makeProps({ lining: { enabled: true } })} />);
    const liningSection = screen.getByText('Lining').closest('div')!;
    const checkbox = liningSection.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });
});

describe('BookCoverSettingsPanel — Internal Features section', () => {
  it('renders an "Internal Features" section', () => {
    render(<BookCoverSettingsPanel {...makeProps()} />);
    expect(screen.getByText('Internal Features')).toBeTruthy();
  });

  it('toggling Card Slots checkbox calls onToggleCardSlots', () => {
    const props = makeProps();
    render(<BookCoverSettingsPanel {...props} />);
    // Expand the Internal Features section first
    const internalFeaturesBtn = screen.getByText('Internal Features').closest('button')!;
    fireEvent.click(internalFeaturesBtn);
    const cardSlotsLabel = screen.getByText('Card Slots').closest('div')!;
    const checkbox = cardSlotsLabel.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox);
    expect(props.onToggleCardSlots).toHaveBeenCalled();
  });

  it('toggling Bookmark Ribbon checkbox calls onToggleBookmarkRibbon', () => {
    const props = makeProps();
    render(<BookCoverSettingsPanel {...props} />);
    const internalFeaturesBtn = screen.getByText('Internal Features').closest('button')!;
    fireEvent.click(internalFeaturesBtn);
    const ribbonLabel = screen.getByText('Bookmark Ribbon').closest('div')!;
    const checkbox = ribbonLabel.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox);
    expect(props.onToggleBookmarkRibbon).toHaveBeenCalled();
  });

  it('toggling Mesh Pocket checkbox calls onToggleMeshPocket', () => {
    const props = makeProps();
    render(<BookCoverSettingsPanel {...props} />);
    const internalFeaturesBtn = screen.getByText('Internal Features').closest('button')!;
    fireEvent.click(internalFeaturesBtn);
    const meshLabel = screen.getByText('Mesh Pocket').closest('div')!;
    const checkbox = meshLabel.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox);
    expect(props.onToggleMeshPocket).toHaveBeenCalled();
  });
});

describe('BookCoverSettingsPanel — Tactical mode section', () => {
  it('renders a "Tactical mode" section', () => {
    render(<BookCoverSettingsPanel {...makeProps()} />);
    expect(screen.getByText('Tactical mode')).toBeTruthy();
  });

  it('toggling Tactical mode ON calls onChange with tactical.enabled: true', () => {
    const props = makeProps();
    render(<BookCoverSettingsPanel {...props} />);
    const tacticalSection = screen.getByText('Tactical mode').closest('div')!;
    const checkbox = tacticalSection.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox).toBeTruthy();
    fireEvent.click(checkbox);
    expect(props.onToggleTactical).toHaveBeenCalledWith(true);
  });

  it('tactical sub-fields (velcro width/height) visible when tactical is enabled', () => {
    render(
      <BookCoverSettingsPanel
        {...makeProps({ tactical: { enabled: true } })}
      />
    );
    expect(screen.getByText(/velcro panel width/i)).toBeTruthy();
  });

  it('tactical checkbox is checked when tactical.enabled is true', () => {
    render(<BookCoverSettingsPanel {...makeProps({ tactical: { enabled: true } })} />);
    const tacticalSection = screen.getByText('Tactical mode').closest('div')!;
    const checkbox = tacticalSection.querySelector('input[type="checkbox"]') as HTMLInputElement;
    expect(checkbox.checked).toBe(true);
  });
});
