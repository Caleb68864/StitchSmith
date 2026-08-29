import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ZipPouchSettingsPanel } from '../ZipPouchSettingsPanel.js';
import { makeDefaultZipPouchProject } from '../../../state/useZipPouchProject.js';

describe('ZipPouchSettingsPanel — selects are labelled', () => {
  it('the Size Preset and Construction Style comboboxes carry their row label', () => {
    render(<ZipPouchSettingsPanel inputs={makeDefaultZipPouchProject().inputs} errors={{}} onChange={vi.fn()} />);
    expect(screen.getByLabelText(/Size Preset/i).getAttribute('role')).toBe('combobox');
    expect(screen.getByLabelText(/Construction Style/i).getAttribute('role')).toBe('combobox');
  });
});
