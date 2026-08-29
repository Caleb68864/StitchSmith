import { describe, it, expect, vi } from 'vitest';
import { subscribe } from '../../../lib/toast/toast.js';
import { runExport } from '../runExport.js';

function captureToasts() {
  const got: { tone: string; title: string; description?: string }[] = [];
  const unsub = subscribe(m => got.push({ tone: m.tone, title: m.title, description: m.description }));
  return { got, unsub };
}

describe('runExport', () => {
  it('toggles busy around a successful export and fires no toast', async () => {
    const setBusy = vi.fn();
    const { got, unsub } = captureToasts();
    await runExport('PDF', setBusy, async () => {});
    unsub();
    expect(setBusy.mock.calls).toEqual([[true], [false]]);
    expect(got).toEqual([]);
  });

  it('on rejection clears busy, fires an error toast naming the export, and does not rethrow', async () => {
    const setBusy = vi.fn();
    const { got, unsub } = captureToasts();
    await runExport('PDF', setBusy, async () => {
      throw new Error('Failed to fetch dynamically imported module');
    });
    unsub();
    expect(setBusy.mock.calls).toEqual([[true], [false]]);
    expect(got).toHaveLength(1);
    expect(got[0].tone).toBe('error');
    expect(got[0].title).toMatch(/PDF/);
    expect(got[0].description).toMatch(/dynamically imported module/);
  });

  it('handles a synchronous throw inside fn the same way', async () => {
    const setBusy = vi.fn();
    const { got, unsub } = captureToasts();
    await runExport('DXF', setBusy, () => {
      throw new Error('boom');
    });
    unsub();
    expect(setBusy).toHaveBeenLastCalledWith(false);
    expect(got[0].title).toMatch(/DXF/);
  });
});
