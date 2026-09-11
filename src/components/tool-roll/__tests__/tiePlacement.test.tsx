// SS2 — "Based on Roll Diameter" was a selectable tie-placement option that
// silently produced a centred tie.
//
// The behaviour was never defined: the spec lists it under "Out of Scope (v1)"
// ("Roll diameter simulation for tie placement (enum value `basedOnRollDiameter`
// is defined but disabled in UI)"), and the design doc still records
// "Hide from UI or show as disabled with a tooltip?" as an *open question*.
// Nothing anywhere says what a roll-diameter-derived X position should compute.
// So the option was removed rather than invented.
//
// These tests pin the two halves of that: the UI must not offer a mode the
// layout does not implement, and a project already saved with the retired mode
// must resolve to the behaviour it was actually getting (centred) rather than
// rendering an empty control.

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ToolRollSettingsPanel } from '../ToolRollSettingsPanel.js';
import { defaultToolRollSettings } from '../../../generators/tool-roll/defaults.js';
import { calculateToolRollLayout } from '../../../generators/tool-roll/calculateToolRollLayout.js';
import { sampleTools } from '../../../generators/tool-roll/defaults.js';
import { loadProject, STORAGE_KEY, _resetStorageModule } from '../../../storage/localStorage.js';

/** Opens the tie-placement Select and returns its option labels, in order. */
function tiePlacementOptionLabels(): string[] {
  render(
    <ToolRollSettingsPanel
      settings={{ ...defaultToolRollSettings, tieEnabled: true }}
      units="mm"
      onUpdate={vi.fn()}
      onUnitsChange={vi.fn()}
    />,
  );
  // Expand every collapsed accordion section so the Tie section renders.
  for (const trigger of screen.getAllByRole('button', { expanded: false })) {
    fireEvent.click(trigger);
  }
  const trigger = document.getElementById('sel-tie-placement');
  expect(trigger, 'tie placement select should be in the DOM').not.toBeNull();
  fireEvent.keyDown(trigger!, { key: 'Enter' });
  const options = [...document.querySelectorAll('[role="option"]')];
  // Guard the probe itself: if the Select never opened, an empty list would
  // make the "no roll diameter option" assertion pass for the wrong reason.
  expect(options.length, 'the Select should have opened').toBeGreaterThan(0);
  return options.map(o => o.textContent ?? '');
}

describe('SS2 — tie placement offers only modes that are implemented', () => {
  it('does not offer a "Based on Roll Diameter" option', () => {
    const labels = tiePlacementOptionLabels();
    expect(labels.join(' | ')).not.toMatch(/roll diameter/i);
  });

  it('offers exactly Centered and Manual', () => {
    expect(tiePlacementOptionLabels()).toEqual(['Centered', 'Manual']);
  });

  it('does not describe the removed mode in the row tooltips', () => {
    render(
      <ToolRollSettingsPanel
        settings={{ ...defaultToolRollSettings, tieEnabled: true }}
        units="mm"
        onUpdate={vi.fn()}
        onUnitsChange={vi.fn()}
      />,
    );
    for (const trigger of screen.getAllByRole('button', { expanded: false })) {
      fireEvent.click(trigger);
    }
    // `Row`'s `tip` is rendered as a `title` attribute, so the help text is in
    // the DOM without a hover. Scanning those is what makes this assertion
    // able to fail — `document.body.textContent` never contains it.
    const titles = [...document.querySelectorAll('[title]')].map(el => el.getAttribute('title') ?? '');
    expect(titles.length, 'rows should carry tooltips').toBeGreaterThan(0);
    expect(titles.join(' | ')).not.toMatch(/roll diameter/i);
  });
});

describe('SS2 — every offered mode changes the tie position it claims to control', () => {
  // A control for the removal: it is not enough that the phantom option is
  // gone; the two that remain must each actually do something, or the same
  // defect is simply smaller.
  const settings = { ...defaultToolRollSettings, tieEnabled: true, tiePositionX: 12 };

  it('centered puts the tie at the pattern mid-line', () => {
    const layout = calculateToolRollLayout(sampleTools, { ...settings, tiePlacementMode: 'centered' }, 'mm');
    expect(layout.tieMarks).toHaveLength(1);
    expect(layout.tieMarks[0].x).toBeCloseTo(layout.patternWidth / 2, 6);
  });

  it('manual puts the tie at the supplied X, not the mid-line', () => {
    const layout = calculateToolRollLayout(sampleTools, { ...settings, tiePlacementMode: 'manual' }, 'mm');
    expect(layout.tieMarks).toHaveLength(1);
    expect(layout.tieMarks[0].x).toBe(12);
    expect(layout.tieMarks[0].x).not.toBeCloseTo(layout.patternWidth / 2, 6);
  });
});

describe('SS2 — a project saved with the retired mode loads as what it actually did', () => {
  beforeEach(() => {
    _resetStorageModule();
    localStorage.clear();
  });

  it('normalises a stored basedOnRollDiameter to centered', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        generatorId: 'tool-roll',
        projectName: 'Legacy',
        units: 'mm',
        tools: [],
        settings: { ...defaultToolRollSettings, tiePlacementMode: 'basedOnRollDiameter' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );
    const loaded = loadProject();
    expect(loaded, 'the stored project should still load').not.toBeNull();
    // It was already being drawn centred; now the setting says so.
    expect(loaded!.settings.tiePlacementMode).toBe('centered');
  });

  it('leaves manual alone', () => {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        schemaVersion: 1,
        generatorId: 'tool-roll',
        projectName: 'Legacy',
        units: 'mm',
        tools: [],
        settings: { ...defaultToolRollSettings, tiePlacementMode: 'manual' },
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }),
    );
    expect(loadProject()!.settings.tiePlacementMode).toBe('manual');
  });
});
