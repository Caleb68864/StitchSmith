import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RollTopSackSettingsPanel } from '../RollTopSackSettingsPanel.js';
import type { RollTopSackInputs } from '../../../generators/roll-top-sack/types.js';

function makeProps(overrides?: Partial<RollTopSackInputs>) {
  const inputs: RollTopSackInputs = {
    bottom_length: 200,
    bottom_width: 100,
    height_when_rolled: 300,
    collar_height: 120,
    seam_allowance: 10,
    units: 'mm',
    ...overrides,
  };
  return { inputs, errors: {}, onChange: vi.fn() };
}

describe('RollTopSackSettingsPanel — unit toggle converts dimensions', () => {
  it('switching mm → in converts the four body dimensions; seam allowance stays in mm', () => {
    const props = makeProps();
    render(<RollTopSackSettingsPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /^in$/ }));
    expect(props.onChange).toHaveBeenCalledOnce();
    const call = props.onChange.mock.calls[0][0] as Partial<RollTopSackInputs>;
    expect(call.units).toBe('in');
    expect(call.bottom_length).toBeCloseTo(200 / 25.4, 3);
    expect(call.bottom_width).toBeCloseTo(100 / 25.4, 3);
    expect(call.height_when_rolled).toBeCloseTo(300 / 25.4, 3);
    expect(call.collar_height).toBeCloseTo(120 / 25.4, 3);
    expect(call).not.toHaveProperty('seam_allowance');
  });

  it('clicking the already-active unit is a no-op', () => {
    const props = makeProps();
    render(<RollTopSackSettingsPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /^mm$/ }));
    expect(props.onChange).not.toHaveBeenCalled();
  });
});
