import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { App } from './App.js';
import { _resetStorage } from '../state/useToolRollProject.js';

beforeEach(() => {
  localStorage.clear();
  _resetStorage();
});

describe('App integration', () => {
  it('renders the StitchSmith header', () => {
    render(<App />);
    expect(screen.getByText(/StitchSmith/i)).toBeTruthy();
  });

  it('loads the 4 starter tools on first run', () => {
    render(<App />);
    // Sample tools from defaults.ts are named "8 mm Wrench", "10 mm Wrench", etc.
    expect(screen.getAllByDisplayValue(/wrench/i).length).toBe(4);
  });

  it('adds a tool so the tool count increments from 4 to 5 (4 starter + 1)', () => {
    render(<App />);

    const addButton = screen.getByRole('button', { name: /add tool/i });
    fireEvent.click(addButton);

    // The new default tool is named "New Tool" (from makeDefaultTool)
    const newToolInputs = screen.queryAllByDisplayValue(/new tool/i);
    expect(newToolInputs.length).toBeGreaterThan(0);

    // There should now be 5 tool name inputs (4 wrenches + 1 new tool)
    const allToolNameInputs = screen.getAllByDisplayValue(/wrench|new tool/i);
    expect(allToolNameInputs.length).toBe(5);
  });

  it('Reset button restores the 4 starter tools (sampleTools)', () => {
    render(<App />);

    // Add a tool first
    const addButton = screen.getByRole('button', { name: /add tool/i });
    fireEvent.click(addButton);

    // Verify "New Tool" is present
    expect(screen.queryAllByDisplayValue(/new tool/i).length).toBeGreaterThan(0);

    // Click Reset in the header
    const resetButton = screen.getByRole('button', { name: /reset/i });
    fireEvent.click(resetButton);

    // "New Tool" should be gone; only the 4 starter wrenches remain
    expect(screen.queryAllByDisplayValue(/new tool/i).length).toBe(0);
    expect(screen.getAllByDisplayValue(/wrench/i).length).toBe(4);
  });
});
