import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { FullPatternSvg } from './FullPatternSvg.js';
import { calculateToolRollLayout } from '../../generators/tool-roll/calculateToolRollLayout.js';
import { defaultToolRollSettings, sampleTools } from '../../generators/tool-roll/defaults.js';

function buildLayout(overrides: Partial<typeof defaultToolRollSettings> = {}) {
  const settings = { ...defaultToolRollSettings, ...overrides };
  return { layout: calculateToolRollLayout(sampleTools, settings, 'mm'), settings };
}

describe('FullPatternSvg', () => {
  it('renders an <svg> with width and height ending in "mm"', () => {
    const { layout, settings } = buildLayout();
    const { container } = render(<FullPatternSvg layout={layout} settings={settings} />);
    const svg = container.querySelector('svg');
    expect(svg).not.toBeNull();
    expect(svg!.getAttribute('width')).toMatch(/mm$/);
    expect(svg!.getAttribute('height')).toMatch(/mm$/);
  });

  it('viewBox matches pattern dimensions', () => {
    const { layout, settings } = buildLayout();
    const { container } = render(<FullPatternSvg layout={layout} settings={settings} />);
    const svg = container.querySelector('svg');
    expect(svg!.getAttribute('viewBox')).toBe(
      `0 0 ${layout.patternWidth} ${layout.patternHeight}`,
    );
  });

  it('renders at least one <path> for the back panel and one for the pocket panel', () => {
    const { layout, settings } = buildLayout();
    const { container } = render(<FullPatternSvg layout={layout} settings={settings} />);
    const paths = container.querySelectorAll('path');
    expect(paths.length).toBeGreaterThanOrEqual(2);

    const backPanel = container.querySelector('.back-panel-cut');
    const pocketPanel = container.querySelector('.pocket-panel-cut');
    expect(backPanel).not.toBeNull();
    expect(pocketPanel).not.toBeNull();
  });

  it('omits stitch line elements when showStitchLines is false', () => {
    const { layout, settings } = buildLayout({ showStitchLines: false });
    const { container } = render(<FullPatternSvg layout={layout} settings={settings} />);
    expect(container.querySelector('.layer-stitch')).toBeNull();
  });

  it('includes stitch line elements when showStitchLines is true', () => {
    const { layout, settings } = buildLayout({ showStitchLines: true });
    const { container } = render(<FullPatternSvg layout={layout} settings={settings} />);
    expect(container.querySelector('.layer-stitch')).not.toBeNull();
  });

  it('renders no flap fold line when flapEnabled is false', () => {
    const { layout, settings } = buildLayout({ flapEnabled: false });
    const { container } = render(<FullPatternSvg layout={layout} settings={settings} />);
    const flapFoldLine = container.querySelector('.flap-fold-line');
    expect(flapFoldLine).toBeNull();
  });

  it('renders flap fold line when flapEnabled is true', () => {
    const { layout, settings } = buildLayout({ flapEnabled: true });
    const { container } = render(<FullPatternSvg layout={layout} settings={settings} />);
    const flapFoldLine = container.querySelector('.flap-fold-line');
    expect(flapFoldLine).not.toBeNull();
  });

  it('omits grid when showGrid is false', () => {
    const { layout, settings } = buildLayout({ showGrid: false });
    const { container } = render(<FullPatternSvg layout={layout} settings={settings} />);
    expect(container.querySelector('.svg-grid')).toBeNull();
  });

  it('renders grid when showGrid is true', () => {
    const { layout, settings } = buildLayout({ showGrid: true });
    const { container } = render(<FullPatternSvg layout={layout} settings={settings} />);
    expect(container.querySelector('.svg-grid')).not.toBeNull();
  });
});
