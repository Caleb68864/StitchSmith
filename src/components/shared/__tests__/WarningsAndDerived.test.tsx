import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WarningsPanel, normalizeWarnings } from '../WarningsPanel.js';
import { DerivedNumbers, inch, fmtLength } from '../warnings/DerivedNumbers.js';
import { PatternPreview } from '../export/PatternPreview.js';

describe('WarningsPanel', () => {
  it('accepts strings and structured warnings, groups by severity with counts, shows tags and focuses fields', () => {
    const onFocusField = vi.fn();
    render(<WarningsPanel onFocusField={onFocusField} warnings={[
      'plain string',
      '[mock-derived] mocked length',
      { id: 'e', severity: 'error', message: 'bad', field: 'width' },
      { id: 'i', severity: 'info', message: 'fyi', tag: 'mock-derived' },
    ]} />);
    expect(screen.getByRole('heading', { level: 3 }).textContent).toContain('(4)');
    expect(screen.getByText(/Errors/)).toBeTruthy();
    expect(screen.getAllByText('mock first')).toHaveLength(2);
    fireEvent.click(screen.getByRole('button', { name: /\[width\]/ }));
    expect(onFocusField).toHaveBeenCalledWith('width');
    expect(normalizeWarnings(['[mock-derived] x'])[0]).toMatchObject({ severity: 'warning', message: 'x', tag: 'mock-derived' });
  });
  it('collapses past the threshold and expands on request; empty shows the no-issues line', () => {
    const many = Array.from({ length: 8 }, (_, i) => ({ id: `w${i}`, severity: 'warning' as const, message: `warning ${i}` }));
    render(<WarningsPanel warnings={many} />);
    expect(screen.queryByText('warning 7')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Show all/i }));
    expect(screen.getByText('warning 7')).toBeTruthy();
    render(<WarningsPanel warnings={[]} />);
    expect(screen.getByText(/No issues detected/)).toBeTruthy();
  });
});

describe('DerivedNumbers', () => {
  it('renders label/value rows under the stable test id and drops empty rows', () => {
    render(<DerivedNumbers rows={[{ label: 'Body cut', value: '5 × 12"' }, { label: 'Nothing', value: null }]} />);
    const box = screen.getByTestId('derived-numbers');
    expect(box.textContent).toContain('Body cut');
    expect(box.textContent).toContain('5 × 12"');
    expect(box.textContent).not.toContain('Nothing');
    expect(inch(127)).toBe('5');
    expect(fmtLength(127, 'in')).toBe('5"');
    expect(fmtLength(127, 'mm')).toBe('127 mm');
  });
  it('renders nothing with no rows', () => {
    const { container } = render(<DerivedNumbers rows={[]} />);
    expect(container.innerHTML).toBe('');
  });
});

describe('shared PatternPreview', () => {
  const pattern = { id: 'p', name: 'P', pieces: [{ id: 'a', name: 'A', mirror: false, quantity: 2, paths: [{ id: 'o', closed: true, edges: [
    { kind: 'straight' as const, id: 'e0', role: 'cut' as const, start: { x: 0, y: 0 }, end: { x: 50, y: 0 } },
    { kind: 'straight' as const, id: 'e1', role: 'cut' as const, start: { x: 50, y: 0 }, end: { x: 50, y: 40 } },
    { kind: 'straight' as const, id: 'e2', role: 'cut' as const, start: { x: 50, y: 40 }, end: { x: 0, y: 40 } },
    { kind: 'straight' as const, id: 'e3', role: 'cut' as const, start: { x: 0, y: 40 }, end: { x: 0, y: 0 } },
  ] }], seamAllowances: { e0: 0, e1: 0, e2: 0, e3: 0 } }] };
  it('shows the placeholder on errors, the failure box on a build error, and the drawing with counts otherwise', () => {
    const { unmount } = render(<PatternPreview pattern={null} hasErrors />);
    expect(screen.getByTestId('pattern-preview-placeholder')).toBeTruthy();
    unmount();
    const r2 = render(<PatternPreview pattern={null} hasErrors={false} buildError="boom" />);
    expect(screen.getByText('boom')).toBeTruthy();
    r2.unmount();
    render(<PatternPreview pattern={pattern} hasErrors={false} saLabel="10 mm" />);
    const header = screen.getByTestId('pattern-preview-region');
    expect(header.textContent).toContain('1 piece type');
    expect(header.textContent).toContain('2 to cut');
    expect(header.textContent).toContain('SA 10 mm');
    expect(screen.getByRole('button', { name: /Piece labels/i })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Notes and grain arrows/i })).toBeTruthy();
  });
});
