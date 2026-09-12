import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';

const ph = (id: string) => (document.getElementById(id) as HTMLInputElement).placeholder;
import { ZipPouchSettingsPanel } from '../ZipPouchSettingsPanel.js';

describe('ZipPouchSettingsPanel preset placeholders', () => {
  it('shows the preset dimensions as placeholders so the boxes are not blank', () => {
    render(<ZipPouchSettingsPanel inputs={{ units: 'mm', preset: 'pencil' }} errors={{}} onChange={() => {}} />);
    expect(ph('finished-length')).toBe('220');
    expect(ph('finished-width')).toBe('120');
    expect(ph('finished-depth')).toBe('30');
  });

  it('converts the placeholder to the display unit and drops it once the preset is custom', () => {
    const { rerender } = render(<ZipPouchSettingsPanel inputs={{ units: 'in', preset: 'pencil' }} errors={{}} onChange={() => {}} />);
    expect(ph('finished-length')).toBe('8.66');
    rerender(<ZipPouchSettingsPanel inputs={{ units: 'mm', preset: 'custom', finished_length: 200, finished_width: 100, finished_depth: 40 }} errors={{}} onChange={() => {}} />);
    expect(ph('finished-length')).toBe('');
  });
});
