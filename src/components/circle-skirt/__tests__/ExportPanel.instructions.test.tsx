import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';

vi.mock('../../../utils/download.js', () => ({
  downloadTextFile: vi.fn(),
  downloadBlob: vi.fn(),
}));
import { downloadTextFile } from '../../../utils/download.js';
import { ExportPanel } from '../ExportPanel.js';
import { makeDefaultCircleSkirtProject } from '../../../state/useCircleSkirtProject.js';
import { buildPattern } from '../../../generators/circle-skirt/index.js';

const download = downloadTextFile as unknown as ReturnType<typeof vi.fn>;

function makeProps() {
  const project = makeDefaultCircleSkirtProject();
  return { inputs: project.inputs, project, hasErrors: false };
}

describe('ExportPanel (circle-skirt) — Instructions', () => {
  beforeEach(() => download.mockReset());

  it('downloads an HTML file containing every assembly step for the current inputs', () => {
    const props = makeProps();
    render(<ExportPanel {...props} />);
    fireEvent.click(screen.getByRole('button', { name: /^Instructions$/i }));
    expect(download).toHaveBeenCalledOnce();
    const [filename, html, mime] = download.mock.calls[0];
    expect(filename).toBe(`${props.project.projectName}-instructions.html`);
    expect(mime).toBe('text/html');
    const steps = buildPattern(props.inputs).steps;
    expect(steps.length).toBeGreaterThan(0);
    for (const step of steps) {
      expect(html).toContain(step.title);
    }
  });

  it('is disabled while the inputs have validation errors', () => {
    render(<ExportPanel {...makeProps()} hasErrors />);
    expect(screen.getByRole('button', { name: /^Instructions$/i })).toHaveProperty('disabled', true);
  });
});
