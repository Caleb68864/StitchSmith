import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolRollSettingsPanel } from '../ToolRollSettingsPanel.js';
import { defaultToolRollSettings } from '../../../generators/tool-roll/defaults.js';

// Radix Select renders its trigger as role="combobox"; a <label htmlFor> on a
// <button> is valid HTML and is what associates the row label with it.

function hasAccessibleName(el: HTMLElement): boolean {
  if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return true;
  const labels = (el as HTMLInputElement).labels;
  return !!labels && labels.length > 0;
}

function describeControl(el: HTMLElement): string {
  return `${el.tagName.toLowerCase()}#${el.id || '(no id)'} role=${el.getAttribute('role') ?? el.getAttribute('type') ?? ''}`;
}

describe('ToolRollSettingsPanel — every control has an accessible name', () => {
  it('labels every input, switch and select in every section', () => {
    // Enable every optional feature so the conditional rows render too.
    const settings = {
      ...defaultToolRollSettings,
      groupingEnabled: true,
      pocketTopHemEnabled: true,
      flapEnabled: true,
      flapHemEnabled: true,
      flapHeightMode: 'fixed' as const,
      pocketDepthMode: 'heightPercentage' as const,
    };
    render(
      <ToolRollSettingsPanel settings={settings} units="mm" onUpdate={vi.fn()} onUnitsChange={vi.fn()} />,
    );
    // Open every collapsed accordion section.
    for (const trigger of screen.getAllByRole('button', { expanded: false })) {
      fireEvent.click(trigger);
    }

    const controls = [
      ...screen.queryAllByRole('textbox'),
      ...screen.queryAllByRole('spinbutton'),
      ...screen.queryAllByRole('switch'),
      ...screen.queryAllByRole('combobox'),
    ] as HTMLElement[];
    expect(controls.length).toBeGreaterThan(20);

    const unnamed = controls.filter(c => !hasAccessibleName(c)).map(describeControl);
    expect(unnamed).toEqual([]);
  });
});
