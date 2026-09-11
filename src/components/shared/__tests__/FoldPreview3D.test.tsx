import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { FoldPreview3D } from '../FoldPreview3D.js';
import { buildPattern } from '../../../generators/mag-pouch/buildPattern.js';

describe('FoldPreview3D', () => {
  it('renders the panel and falls back gracefully without WebGL (jsdom)', async () => {
    const r = buildPattern({
      magazine: { mode: 'predefined', presetId: 'ar15_30_round', units: 'in' },
      retention: 'flap_velcro', attachment: 'pals', drainage: 'open_corner', seamAllowance: 0.375,
    });
    render(<FoldPreview3D pattern={r.pattern} object={{ width: 64.8, depth: 25.4, height: 190.5, label: 'magazine' }} />);
    expect(screen.getByTestId('fold-preview-3d')).toBeTruthy();
    await waitFor(() => expect(screen.getByText(/needs WebGL/i)).toBeTruthy());
  });
});
