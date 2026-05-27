import { describe, it, expect } from 'vitest';
import { compileSteps, renderMarkdown, renderHtml } from '../instructions/compile.js';
import type { Step } from '../instructions/Step.js';

const steps: Step[] = [
  { id: 'c', title: 'Attach zipper', body: 'Sew zipper to panel.', dependsOn: ['b'], refsPieces: ['front'] },
  { id: 'a', title: 'Cut fabric', body: 'Cut all pieces.', dependsOn: [], refsPieces: [] },
  { id: 'b', title: 'Sew panels', body: 'Join front and back.', dependsOn: ['a'], refsPieces: ['front', 'back'] },
];

describe('compileSteps', () => {
  it('topologically sorts steps by dependency order', () => {
    const result = compileSteps(steps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const ids = result.value.map((s) => s.id);
    expect(ids.indexOf('a')).toBeLessThan(ids.indexOf('b'));
    expect(ids.indexOf('b')).toBeLessThan(ids.indexOf('c'));
  });

  it('detects cycles and returns error Result', () => {
    const cyclic: Step[] = [
      { id: 'x', title: 'X', body: '', dependsOn: ['y'], refsPieces: [] },
      { id: 'y', title: 'Y', body: '', dependsOn: ['x'], refsPieces: [] },
    ];
    const result = compileSteps(cyclic);
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(result.error).toMatch(/cycle/i);
  });
});

describe('renderMarkdown', () => {
  it('renders steps with sequential numbers', () => {
    const result = renderMarkdown(steps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toContain('## Step 1:');
    expect(result.value).toContain('## Step 2:');
    expect(result.value).toContain('## Step 3:');
  });

  it('puts steps in dependency order', () => {
    const result = renderMarkdown(steps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const aIdx = result.value.indexOf('Cut fabric');
    const bIdx = result.value.indexOf('Sew panels');
    const cIdx = result.value.indexOf('Attach zipper');
    expect(aIdx).toBeLessThan(bIdx);
    expect(bIdx).toBeLessThan(cIdx);
  });

  it('returns error Result on cyclic input', () => {
    const cyclic: Step[] = [
      { id: 'x', title: 'X', body: '', dependsOn: ['y'], refsPieces: [] },
      { id: 'y', title: 'Y', body: '', dependsOn: ['x'], refsPieces: [] },
    ];
    const result = renderMarkdown(cyclic);
    expect(result.ok).toBe(false);
  });
});

describe('renderHtml', () => {
  it('wraps steps in an ordered list', () => {
    const result = renderHtml(steps);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).toContain('<ol class="instructions">');
    expect(result.value).toContain('<li');
    expect(result.value).toContain('</ol>');
  });

  it('escapes HTML in step titles and bodies', () => {
    const xss: Step[] = [
      { id: 'xss', title: '<script>alert(1)</script>', body: 'B&W test', dependsOn: [], refsPieces: [] },
    ];
    const result = renderHtml(xss);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value).not.toContain('<script>');
    expect(result.value).toContain('&lt;script&gt;');
    expect(result.value).toContain('B&amp;W');
  });
});
