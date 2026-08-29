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
