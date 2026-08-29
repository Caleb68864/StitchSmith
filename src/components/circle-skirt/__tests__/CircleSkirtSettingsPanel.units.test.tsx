import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CircleSkirtSettingsPanel } from '../CircleSkirtSettingsPanel.js';
import type { CircleSkirtInputs } from '../../../generators/circle-skirt/types.js';

function makeProps(overrides?: Partial<CircleSkirtInputs>) {
  const inputs: CircleSkirtInputs = {
    preset: 'half',
    waist_circumference: 28,
    skirt_length: 24,
    hip_circumference: 38,
    seam_allowance: 15,
    hem_allowance: 20,
    units: 'in',
    ...overrides,
  };
  return { inputs, errors: {}, onChange: vi.fn() };
}

describe('CircleSkirtSettingsPanel — unit toggle converts measurements', () => {
  it('switching in → mm converts waist, length and hip; leaves mm-only fields alone', () => {
    const props = makeProps();
    render(<CircleSkirtSettingsPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /^mm$/ }));
    expect(props.onChange).toHaveBeenCalledOnce();
    const call = props.onChange.mock.calls[0][0] as Partial<CircleSkirtInputs>;
    expect(call.units).toBe('mm');
    expect(call.waist_circumference).toBeCloseTo(711.2, 3);
    expect(call.skirt_length).toBeCloseTo(609.6, 3);
    expect(call.hip_circumference).toBeCloseTo(965.2, 3);
    expect(call).not.toHaveProperty('seam_allowance');
    expect(call).not.toHaveProperty('hem_allowance');
  });

  it('switching mm → in converts back to the original inch values', () => {
    const props = makeProps({ units: 'mm', waist_circumference: 711.2, skirt_length: 609.6, hip_circumference: undefined });
    render(<CircleSkirtSettingsPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /^in$/ }));
    const call = props.onChange.mock.calls[0][0] as Partial<CircleSkirtInputs>;
    expect(call.units).toBe('in');
    expect(call.waist_circumference).toBeCloseTo(28, 3);
    expect(call.skirt_length).toBeCloseTo(24, 3);
    expect(call).not.toHaveProperty('hip_circumference');
  });

  it('clicking the already-active unit is a no-op', () => {
    const props = makeProps();
    render(<CircleSkirtSettingsPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /^in$/ }));
    expect(props.onChange).not.toHaveBeenCalled();
  });
});

// Seam/hem allowance, band height and elastic width are always millimetres in
// the generator (see resolveInputs). Under the inches toggle the panel shows
// and accepts them in inches and converts at the input edge, so the user never
// has to mix units in one form.
describe('CircleSkirtSettingsPanel — mm-stored allowances follow the display unit', () => {
  it('in inch mode, labels say (in) and a 12.7 mm seam allowance displays as 0.5', () => {
    const props = makeProps({ units: 'in', seam_allowance: 12.7, hem_allowance: 25.4 });
    render(<CircleSkirtSettingsPanel {...props} />);
    const sa = screen.getByLabelText(/Seam Allowance \(in\)/) as HTMLInputElement;
    const hem = screen.getByLabelText(/Hem Allowance \(in\)/) as HTMLInputElement;
    expect(sa.value).toBe('0.5');
    expect(hem.value).toBe('1');
  });

  it('typing 0.75 in inch mode stores 19.05 mm', () => {
    const props = makeProps({ units: 'in', seam_allowance: 12.7 });
    render(<CircleSkirtSettingsPanel {...props} />);
    fireEvent.change(screen.getByLabelText(/Seam Allowance \(in\)/), { target: { value: '0.75' } });
    const call = props.onChange.mock.calls[0][0] as Partial<CircleSkirtInputs>;
    expect(call.seam_allowance).toBeCloseTo(19.05, 6);
  });

  it('in mm mode, labels say (mm) and values pass through untouched', () => {
    const props = makeProps({ units: 'mm', seam_allowance: 15, band_height: 25, waistband_type: 'straight' });
    render(<CircleSkirtSettingsPanel {...props} />);
    expect((screen.getByLabelText(/Seam Allowance \(mm\)/) as HTMLInputElement).value).toBe('15');
    fireEvent.change(screen.getByLabelText(/Band Height \(mm\)/), { target: { value: '30' } });
    const call = props.onChange.mock.calls[0][0] as Partial<CircleSkirtInputs>;
    expect(call.band_height).toBe(30);
  });

  it('band height converts at the edge in inch mode', () => {
    const props = makeProps({ units: 'in', band_height: 25.4, waistband_type: 'straight' });
    render(<CircleSkirtSettingsPanel {...props} />);
    const band = screen.getByLabelText(/Band Height \(in\)/) as HTMLInputElement;
    expect(band.value).toBe('1');
    fireEvent.change(band, { target: { value: '1.5' } });
    const call = props.onChange.mock.calls[0][0] as Partial<CircleSkirtInputs>;
    expect(call.band_height).toBeCloseTo(38.1, 6);
  });
});
