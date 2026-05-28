import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from './App.js';
import { _resetStorage } from '../state/useToolRollProject.js';

beforeEach(() => {
  localStorage.clear();
  _resetStorage();
  // Reset/destructive actions now confirm via window.confirm; auto-accept in tests.
  vi.spyOn(window, 'confirm').mockReturnValue(true);
});

describe('App integration', () => {
  it('renders the StitchSmith header', () => {
    render(<App />);
    expect(screen.getAllByText(/StitchSmith/i).length).toBeGreaterThan(0);
  });

  it('shows the landing page with both patterns on first render', () => {
    render(<App />);
    expect(screen.getAllByText(/Tool Roll/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/Tri-Zip Backpack/i).length).toBeGreaterThan(0);
  });

  it('navigates to tool roll page when clicking Open Tool Roll', () => {
    render(<App />);
    const openBtn = screen.getByRole('button', { name: /Open Tool Roll/i });
    fireEvent.click(openBtn);
    // Tool Roll page shows wrench inputs
    expect(screen.getAllByDisplayValue(/wrench/i).length).toBe(4);
  });

  it('loads the 4 starter tools when navigating to tool roll', () => {
    render(<App />);
    const openBtn = screen.getByRole('button', { name: /Open Tool Roll/i });
    fireEvent.click(openBtn);
    expect(screen.getAllByDisplayValue(/wrench/i).length).toBe(4);
  });

  it('adds a tool so the tool count increments from 4 to 5', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Open Tool Roll/i }));

    const addButton = screen.getByRole('button', { name: /add tool/i });
    fireEvent.click(addButton);

    const newToolInputs = screen.queryAllByDisplayValue(/new tool/i);
    expect(newToolInputs.length).toBeGreaterThan(0);

    const allToolNameInputs = screen.getAllByDisplayValue(/wrench|new tool/i);
    expect(allToolNameInputs.length).toBe(5);
  });

  it('Reset button restores the 4 starter tools (sampleTools)', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: /Open Tool Roll/i }));

    const addButton = screen.getByRole('button', { name: /add tool/i });
    fireEvent.click(addButton);

    expect(screen.queryAllByDisplayValue(/new tool/i).length).toBeGreaterThan(0);

    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);

    expect(screen.queryAllByDisplayValue(/new tool/i).length).toBe(0);
    expect(screen.getAllByDisplayValue(/wrench/i).length).toBe(4);
  });

  it('navigates to tri-zip page when clicking Open Tri-Zip Backpack', () => {
    render(<App />);
    const openBtn = screen.getByRole('button', { name: /Open Tri-Zip Backpack/i });
    fireEvent.click(openBtn);
    expect(screen.getAllByText(/Tri-Zip Backpack Generator/i).length).toBeGreaterThan(0);
  });

  it('navigates to book cover page when clicking Open Book Cover', () => {
    render(<App />);
    const openBtn = screen.getByRole('button', { name: /Open Book Cover/i });
    fireEvent.click(openBtn);
    expect(screen.getAllByText(/Book Cover Generator/i).length).toBeGreaterThan(0);
  });

  it('landing page lists Book Cover among the patterns', () => {
    render(<App />);
    expect(screen.getAllByText(/Book Cover/i).length).toBeGreaterThan(0);
  });
});
