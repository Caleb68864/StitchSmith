import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConstructionSteps } from '../../shared/ConstructionSteps.js';
import type { Step } from '../../../lib/pattern-engine/instructions/Step.js';

/**
 * M17 — ConstructionSteps reuse test.
 *
 * MagPouchPage imports ConstructionSteps from src/components/shared/ConstructionSteps.tsx.
 * No custom step renderer exists under src/components/mag-pouch/.
 * These tests verify the shared component renders correctly with mag-pouch steps.
 */

const FIXTURE_STEPS: Step[] = [
  {
    id: 'cut-fabric',
    title: 'Cut fabric pieces',
    body: 'Cut all pattern pieces as marked, including the 9.5 mm seam allowance.',
    dependsOn: [],
    refsPieces: ['body'],
    group: 'prep',
  },
  {
    id: 'assemble-body',
    title: 'Assemble body',
    body: 'Fold the body piece as indicated. Right sides together, stitch the side seams.',
    dependsOn: ['cut-fabric'],
    refsPieces: ['body'],
    group: 'construction',
  },
  {
    id: 'attach-retention',
    title: 'Attach retention',
    body: 'Attach the retention hardware to the flap as marked.',
    dependsOn: ['assemble-body'],
    refsPieces: ['body'],
    group: 'hardware',
  },
  {
    id: 'finish-edges',
    title: 'Finish edges',
    body: 'Finish all raw edges with a bar-tack. Leave the open-corner drainage cut unsewn.',
    dependsOn: ['attach-retention'],
    refsPieces: ['body'],
    group: 'finish',
  },
];

describe('ConstructionSteps (shared, used by MagPouchPage)', () => {
  it('renders all step titles', () => {
    render(<ConstructionSteps steps={FIXTURE_STEPS} />);
    expect(screen.getByText('Cut fabric pieces.')).toBeTruthy();
    expect(screen.getByText('Assemble body.')).toBeTruthy();
    expect(screen.getByText('Attach retention.')).toBeTruthy();
    expect(screen.getByText('Finish edges.')).toBeTruthy();
  });

  it('renders step bodies', () => {
    render(<ConstructionSteps steps={FIXTURE_STEPS} />);
    expect(screen.getByText(/Cut all pattern pieces as marked/i)).toBeTruthy();
  });

  it('renders at least one <li> for step bodies (M17)', () => {
    const { container } = render(<ConstructionSteps steps={FIXTURE_STEPS} />);
    const listItems = container.querySelectorAll('li');
    expect(listItems.length).toBeGreaterThan(0);
  });

  it('renders a step count in the summary', () => {
    render(<ConstructionSteps steps={FIXTURE_STEPS} />);
    expect(screen.getByText(/4 steps/i)).toBeTruthy();
  });

  it('renders empty state when no steps provided', () => {
    render(<ConstructionSteps steps={[]} />);
    expect(screen.getByText(/No instructions available/i)).toBeTruthy();
  });

  it('renders group headings when steps have groups', () => {
    render(<ConstructionSteps steps={FIXTURE_STEPS} />);
    expect(screen.getAllByText(/prep/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/construction/i).length).toBeGreaterThan(0);
  });

  it('uses custom title when provided', () => {
    render(<ConstructionSteps steps={FIXTURE_STEPS} title="Assembly Instructions" />);
    expect(screen.getByText(/Assembly Instructions/i)).toBeTruthy();
  });
});
