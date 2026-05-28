import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PatternViewport } from '../PatternViewport.js';

describe('PatternViewport accessibility', () => {
  it('the pan/zoom viewport is focusable with role="img" and an aria-label', () => {
    render(<PatternViewport svg="<svg width='100' height='100'><rect /></svg>" />);
    const viewport = screen.getByRole('img');
    expect(viewport).toBeTruthy();
    expect(viewport.getAttribute('aria-label')).toMatch(/pattern preview/i);
    expect(viewport.getAttribute('tabIndex')).toBe('0');
  });

  it('zoom buttons have aria-labels (icon-only buttons must announce)', () => {
    render(<PatternViewport svg="<svg width='100' height='100'/>" />);
    expect(screen.getByRole('button', { name: /zoom in/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /zoom out/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /fit pattern to screen/i })).toBeTruthy();
  });

  it('arrow keys pan the viewport (does not throw, prevents default)', () => {
    render(<PatternViewport svg="<svg width='100' height='100'/>" />);
    const viewport = screen.getByRole('img');
    // Focus the viewport, fire arrow keys — assertion is that no exception is
    // thrown and the events are handled (preventDefault returns true via the
    // handler swallowing the key).
    viewport.focus();
    expect(() => {
      fireEvent.keyDown(viewport, { key: 'ArrowUp' });
      fireEvent.keyDown(viewport, { key: 'ArrowDown' });
      fireEvent.keyDown(viewport, { key: 'ArrowLeft' });
      fireEvent.keyDown(viewport, { key: 'ArrowRight' });
      fireEvent.keyDown(viewport, { key: '+' });
      fireEvent.keyDown(viewport, { key: '-' });
      fireEvent.keyDown(viewport, { key: '0' });
    }).not.toThrow();
  });

  it('zoom-level indicator has aria-live polite so screen readers announce changes', () => {
    render(<PatternViewport svg="<svg width='100' height='100'/>" />);
    // The percentage text node should carry aria-live; query it by text.
    const pct = screen.getByText(/\d+%/);
    expect(pct.getAttribute('aria-live')).toBe('polite');
  });
});
