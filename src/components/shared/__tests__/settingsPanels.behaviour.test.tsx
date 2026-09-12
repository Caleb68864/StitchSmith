/**
 * Behaviour the settings panels must keep: long panels group and collapse,
 * the vault-open marker stays compact, cleared boxes do not snap back, and the
 * Tool Roll commits an edit as it is typed.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, within } from '@testing-library/react';
import { LbvSettingsPanel } from '../../lbv/LbvSettingsPanel.js';
import { makeDefaultLbvProject } from '../../../state/useLbvProject.js';
import { ClamshellPackSettingsPanel } from '../../clamshell-pack/ClamshellPackSettingsPanel.js';
import { makeDefaultClamshellPackProject } from '../../../state/useClamshellPackProject.js';
import { PlateCarrierSettingsPanel } from '../../plate-carrier/PlateCarrierSettingsPanel.js';
import { makeDefaultPlateCarrierProject } from '../../../state/usePlateCarrierProject.js';
import { TriZipSettingsPanel } from '../../tri-zip-backpack/TriZipSettingsPanel.js';
import { makeDefaultTriZipProject } from '../../../state/useTriZipProject.js';
import { ToolRollSettingsPanel } from '../../tool-roll/ToolRollSettingsPanel.js';
import { defaultToolRollSettings } from '../../../generators/tool-roll/defaults.js';
import { MOCK_DERIVED_SENTENCE, NumericField, displayNumber } from '../fields/index.js';

afterEach(() => cleanup());

const LONG_PANELS = [
  { name: 'Modular LBV', render: (onChange = vi.fn()) => render(<LbvSettingsPanel inputs={makeDefaultLbvProject().inputs} errors={{}} onChange={onChange} />) },
  { name: 'Clamshell Pack', render: (onChange = vi.fn()) => render(<ClamshellPackSettingsPanel inputs={makeDefaultClamshellPackProject().inputs} errors={{}} onChange={onChange} />) },
  { name: 'Plate Carrier', render: (onChange = vi.fn()) => render(<PlateCarrierSettingsPanel inputs={makeDefaultPlateCarrierProject().inputs} errors={{}} onChange={onChange} />) },
];

describe('long settings panels are grouped and collapsed', () => {
  for (const panel of LONG_PANELS) {
    it(`${panel.name}: groups collapse, the first is open, and toggling reports its state`, () => {
      panel.render();
      const groups = screen.getAllByRole('button', { expanded: false }).concat(screen.getAllByRole('button', { expanded: true }));
      expect(groups.length, 'settings groups').toBeGreaterThanOrEqual(3);
      // Exactly one group starts open: the decisions a builder makes first.
      expect(screen.getAllByRole('button', { expanded: true })).toHaveLength(1);
      const closed = screen.getAllByRole('button', { expanded: false });
      const hiddenBefore = screen.queryAllByRole('spinbutton').length;
      fireEvent.click(closed[0]);
      expect(closed[0].getAttribute('aria-expanded')).toBe('true');
      expect(screen.queryAllByRole('spinbutton').length).toBeGreaterThan(hiddenBefore);
    });
  }

  it('a collapsed group summarises its current value so it still says something', () => {
    const inputs = { ...makeDefaultClamshellPackProject().inputs, width: 11, height: 16, depth: 6 };
    render(<ClamshellPackSettingsPanel inputs={inputs} errors={{}} onChange={vi.fn()} />);
    const belt = screen.getAllByRole('button', { expanded: false })[0];
    expect(belt.textContent).toMatch(/\S/);
  });
});

describe('vault-open numbers carry a compact marker, not a repeated paragraph', () => {
  it('LBV shows the full sentence once per field for screen readers and never as visible prose', () => {
    const { container } = render(<LbvSettingsPanel inputs={makeDefaultLbvProject().inputs} errors={{}} onChange={vi.fn()} />);
    for (const trigger of screen.getAllByRole('button', { expanded: false })) fireEvent.click(trigger);
    const chips = [...container.querySelectorAll('span[title]')].filter((el) => el.textContent === 'measure');
    expect(chips.length, 'compact markers').toBeGreaterThan(5);
    for (const chip of chips) expect(chip.getAttribute('title')).toBe(MOCK_DERIVED_SENTENCE);
    // The sentence itself is screen-reader only; the visible column never repeats it.
    const visible = [...container.querySelectorAll('p')].filter((p) => p.textContent?.includes('Mock it in paper'));
    expect(visible.length, 'visible repeats of the long sentence').toBeLessThanOrEqual(1);
    const described = [...container.querySelectorAll('.sr-only')].filter((el) => el.textContent === MOCK_DERIVED_SENTENCE);
    expect(described.length).toBe(chips.length);
  });
});

describe('Tri-Zip numeric fields', () => {
  it('shows the chosen unit on the body dimensions and reports an error against the control', () => {
    render(<TriZipSettingsPanel inputs={{ ...makeDefaultTriZipProject().inputs, units: 'in' }} errors={{ height: 'Too tall' }} onChange={vi.fn()} topHandleLength={100} onTopHandleLengthChange={vi.fn()} />);
    const height = screen.getByLabelText(/Height \(in\)/);
    expect(height.getAttribute('aria-invalid')).toBe('true');
    const describedBy = height.getAttribute('aria-describedby') ?? '';
    expect(describedBy).toContain('tz-height-error');
    expect(document.getElementById('tz-height-error')?.textContent).toBe('Too tall');
  });

  it('clearing a preset-backed box reports undefined rather than snapping to the old default', () => {
    const onChange = vi.fn();
    render(<TriZipSettingsPanel inputs={makeDefaultTriZipProject().inputs} errors={{}} onChange={onChange} topHandleLength={100} onTopHandleLengthChange={vi.fn()} />);
    for (const trigger of screen.getAllByRole('button', { expanded: false })) fireEvent.click(trigger);
    const seam = screen.getByLabelText(/Seam allowance/);
    fireEvent.change(seam, { target: { value: '' } });
    expect(onChange).toHaveBeenCalledWith({ seam_allowance: undefined });
  });

  it('clearing a required body dimension reports NaN so validation flags it, never a raw string', () => {
    const onChange = vi.fn();
    render(<TriZipSettingsPanel inputs={makeDefaultTriZipProject().inputs} errors={{}} onChange={onChange} topHandleLength={100} onTopHandleLengthChange={vi.fn()} />);
    fireEvent.change(screen.getByLabelText(/Width \(mm\)/), { target: { value: '' } });
    const [call] = onChange.mock.calls.at(-1) as [{ width: number }];
    expect(Number.isNaN(call.width)).toBe(true);
  });
});

describe('Tool Roll number inputs', () => {
  it('commits as the user types and never shows a value the pattern is not using', () => {
    const onUpdate = vi.fn();
    render(<ToolRollSettingsPanel settings={defaultToolRollSettings} units="mm" onUpdate={onUpdate} onUnitsChange={vi.fn()} />);
    const gap = document.getElementById('sideGap') as HTMLInputElement;
    expect(gap.type).toBe('number');
    fireEvent.change(gap, { target: { value: '7' } });
    expect(onUpdate).toHaveBeenCalledWith({ sideGap: 7 });
    // Typed rubbish is dropped on blur, so the box falls back to the stored value.
    fireEvent.change(gap, { target: { value: '' } });
    fireEvent.blur(gap);
    expect(gap.value).toBe(defaultToolRollSettings.sideGap.toFixed(1));
  });

  it('converts to the display unit and back to millimetres on commit', () => {
    const onUpdate = vi.fn();
    render(<ToolRollSettingsPanel settings={defaultToolRollSettings} units="in" onUpdate={onUpdate} onUnitsChange={vi.fn()} />);
    for (let pass = 0; pass < 3; pass++) for (const t of screen.queryAllByRole('button', { expanded: false })) fireEvent.click(t);
    const seam = document.getElementById('seamAllowance') as HTMLInputElement;
    expect(seam.value).toBe((defaultToolRollSettings.seamAllowance / 25.4).toFixed(3));
    fireEvent.change(seam, { target: { value: '0.5' } });
    expect(onUpdate).toHaveBeenCalledWith({ seamAllowance: 12.7 });
  });
});

describe('mag pouch errors are announced against their control', () => {
  it('a width-ease error is wired to the input with aria-invalid and aria-describedby', async () => {
    const { MagPouchSettingsPanel } = await import('../../mag-pouch/MagPouchSettingsPanel.js');
    const { makeDefaultMagPouchProject } = await import('../../../state/useMagPouchProject.js');
    render(<MagPouchSettingsPanel inputs={makeDefaultMagPouchProject().inputs} errors={{ ease_width: 'Too much ease' }} onChange={vi.fn()} derived={null} />);
    for (let pass = 0; pass < 3; pass++) for (const t of screen.queryAllByRole('button', { expanded: false })) fireEvent.click(t);
    const ease = document.getElementById('ease-width') as HTMLInputElement;
    expect(ease.getAttribute('aria-invalid')).toBe('true');
    expect(ease.getAttribute('aria-describedby')).toContain('ease-width-error');
    expect(within(document.body).getByText('Too much ease').id).toBe('ease-width-error');
  });
});

describe('numbers survive unit conversion without float noise', () => {
  it('rounds the displayed value but never the keystrokes', () => {
    expect(displayNumber(0.7499999999999999)).toBe('0.75');
    expect(displayNumber(23.999999999999996)).toBe('24');
    expect(displayNumber(undefined)).toBe('');
    expect(displayNumber(NaN)).toBe('');
    const onChange = vi.fn();
    render(<NumericField id="f" label="Bellows" units="in" value={0.7499999999999999} onChange={onChange} />);
    const box = screen.getByLabelText(/Bellows/) as HTMLInputElement;
    expect(box.value).toBe('0.75');
    // Mid-typing a trailing separator must not be rewritten under the caret.
    fireEvent.change(box, { target: { value: '0.7500' } });
    expect(box.value).toBe('0.7500');
    fireEvent.blur(box);
    expect(onChange).toHaveBeenCalledWith(0.75);
  });
});
