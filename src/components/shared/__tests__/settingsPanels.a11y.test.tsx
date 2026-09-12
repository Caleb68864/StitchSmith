/**
 * Every generator's settings panel, mounted with its default inputs: every
 * input, select, combobox and checkbox has an accessible name, and React
 * logs no warnings while rendering. Collapsed sections are opened first.
 */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ReactElement } from 'react';
import { ToolRollSettingsPanel } from '../../tool-roll/ToolRollSettingsPanel.js';
import { defaultToolRollSettings } from '../../../generators/tool-roll/defaults.js';
import { TriZipSettingsPanel } from '../../tri-zip-backpack/TriZipSettingsPanel.js';
import { makeDefaultTriZipProject } from '../../../state/useTriZipProject.js';
import { RollTopSackSettingsPanel } from '../../roll-top-sack/RollTopSackSettingsPanel.js';
import { makeDefaultRollTopSackProject } from '../../../state/useRollTopSackProject.js';
import { MagPouchSettingsPanel } from '../../mag-pouch/MagPouchSettingsPanel.js';
import { makeDefaultMagPouchProject } from '../../../state/useMagPouchProject.js';
import { BookCoverSettingsPanel } from '../../book-cover/BookCoverSettingsPanel.js';
import { makeDefaultBookCoverProject } from '../../../state/useBookCoverProject.js';
import { ZipPouchSettingsPanel } from '../../zip-pouch/ZipPouchSettingsPanel.js';
import { makeDefaultZipPouchProject } from '../../../state/useZipPouchProject.js';
import { CircleSkirtSettingsPanel } from '../../circle-skirt/CircleSkirtSettingsPanel.js';
import { makeDefaultCircleSkirtProject } from '../../../state/useCircleSkirtProject.js';
import { PaddedStrapSettingsPanel } from '../../padded-strap/PaddedStrapSettingsPanel.js';
import { makeDefaultPaddedStrapProject } from '../../../state/usePaddedStrapProject.js';
import { MicroRigSettingsPanel } from '../../micro-rig/MicroRigSettingsPanel.js';
import { makeDefaultMicroRigProject } from '../../../state/useMicroRigProject.js';
import { SlingSettingsPanel } from '../../sling/SlingSettingsPanel.js';
import { makeDefaultSlingProject } from '../../../state/useSlingProject.js';
import { OrganizerSettingsPanel } from '../../organizer/OrganizerSettingsPanel.js';
import { makeDefaultOrganizerProject } from '../../../state/useOrganizerProject.js';
import { FannyPackSettingsPanel } from '../../fanny-pack/FannyPackSettingsPanel.js';
import { makeDefaultFannyPackProject } from '../../../state/useFannyPackProject.js';
import { ClamshellPackSettingsPanel } from '../../clamshell-pack/ClamshellPackSettingsPanel.js';
import { makeDefaultClamshellPackProject } from '../../../state/useClamshellPackProject.js';
import { PlateCarrierSettingsPanel } from '../../plate-carrier/PlateCarrierSettingsPanel.js';
import { makeDefaultPlateCarrierProject } from '../../../state/usePlateCarrierProject.js';
import { LbvSettingsPanel } from '../../lbv/LbvSettingsPanel.js';
import { makeDefaultLbvProject } from '../../../state/useLbvProject.js';

const noop = vi.fn();
const PANELS: { name: string; element: () => ReactElement }[] = [
  { name: 'Tool Roll', element: () => <ToolRollSettingsPanel settings={defaultToolRollSettings} units="mm" onUpdate={noop} onUnitsChange={noop} /> },
  { name: 'Tri-Zip', element: () => <TriZipSettingsPanel inputs={makeDefaultTriZipProject().inputs} errors={{}} onChange={noop} topHandleLength={100} onTopHandleLengthChange={noop} /> },
  { name: 'Roll-Top', element: () => <RollTopSackSettingsPanel inputs={makeDefaultRollTopSackProject().inputs} errors={{}} onChange={noop} /> },
  { name: 'Mag Pouch', element: () => <MagPouchSettingsPanel inputs={makeDefaultMagPouchProject().inputs} errors={{}} onChange={noop} derived={null} /> },
  { name: 'Book Cover', element: () => <BookCoverSettingsPanel inputs={makeDefaultBookCoverProject().inputs} errors={{}} onChange={noop} onToggleOuterPocket={noop} onToggleInnerPocket={noop} onTogglePenHolder={noop} /> },
  { name: 'Zip Pouch', element: () => <ZipPouchSettingsPanel inputs={makeDefaultZipPouchProject().inputs} errors={{}} onChange={noop} /> },
  { name: 'Circle Skirt', element: () => <CircleSkirtSettingsPanel inputs={makeDefaultCircleSkirtProject().inputs} errors={{}} onChange={noop} /> },
  { name: 'Padded Strap', element: () => <PaddedStrapSettingsPanel inputs={makeDefaultPaddedStrapProject().inputs} errors={{}} onChange={noop} /> },
  { name: 'Micro Rig', element: () => <MicroRigSettingsPanel inputs={makeDefaultMicroRigProject().inputs} errors={{}} onChange={noop} /> },
  { name: 'Padded Sling', element: () => <SlingSettingsPanel inputs={makeDefaultSlingProject().inputs} errors={{}} onChange={noop} /> },
  { name: 'Organizer', element: () => <OrganizerSettingsPanel inputs={makeDefaultOrganizerProject().inputs} errors={{}} onChange={noop} /> },
  { name: 'Fanny Pack', element: () => <FannyPackSettingsPanel inputs={makeDefaultFannyPackProject().inputs} errors={{}} onChange={noop} /> },
  { name: 'Clamshell Pack', element: () => <ClamshellPackSettingsPanel inputs={makeDefaultClamshellPackProject().inputs} errors={{}} onChange={noop} /> },
  { name: 'Plate Carrier', element: () => <PlateCarrierSettingsPanel inputs={makeDefaultPlateCarrierProject().inputs} errors={{}} onChange={noop} /> },
  { name: 'Modular LBV', element: () => <LbvSettingsPanel inputs={makeDefaultLbvProject().inputs} errors={{}} onChange={noop} /> },
];

function hasAccessibleName(el: HTMLElement): boolean {
  if (el.getAttribute('aria-label') || el.getAttribute('aria-labelledby')) return true;
  const labels = (el as HTMLInputElement).labels;
  if (labels && labels.length > 0) return true;
  // A control wrapped by its <label> (checkbox rows) has an implicit name.
  return !!el.closest('label');
}

describe('settings panels — every control is named and nothing warns', () => {
  afterEach(() => cleanup());
  for (const panel of PANELS) {
    it(`${panel.name}: inputs, selects and checkboxes carry an accessible name`, () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      render(panel.element());
      // Open every collapsed section so hidden rows are checked too.
      for (let pass = 0; pass < 3; pass++) {
        for (const trigger of screen.queryAllByRole('button', { expanded: false })) fireEvent.click(trigger);
      }
      const controls = [
        ...screen.queryAllByRole('textbox'),
        ...screen.queryAllByRole('spinbutton'),
        ...screen.queryAllByRole('combobox'),
        ...screen.queryAllByRole('checkbox'),
        ...screen.queryAllByRole('switch'),
        ...screen.queryAllByRole('searchbox'),
      ];
      expect(controls.length).toBeGreaterThan(0);
      const unnamed = controls.filter((c) => !hasAccessibleName(c as HTMLElement)).map((c) => `${c.tagName.toLowerCase()}#${(c as HTMLElement).id || '(no id)'}`);
      expect(unnamed, `unlabeled controls in ${panel.name}`).toEqual([]);
      const reactWarnings = [...errorSpy.mock.calls, ...warnSpy.mock.calls].map((c) => String(c[0])).filter((m) => /Warning:|React/.test(m));
      expect(reactWarnings, `React warnings in ${panel.name}`).toEqual([]);
      errorSpy.mockRestore();
      warnSpy.mockRestore();
    });
  }
});
