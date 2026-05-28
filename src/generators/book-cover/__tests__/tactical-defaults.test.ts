import { describe, it, expect } from 'vitest';
import { resolveInputs } from '../inputs.js';
import type { BookCoverInputs } from '../types.js';

const BASE: BookCoverInputs = {
  units: 'mm',
  book_height: 210,
  book_width: 148,
  spine_width: 12,
  flap_depth: 65,
};

describe('tactical-mode cascade in resolveInputs', () => {
  it('tactical.enabled:true sets lining.enabled to true', () => {
    const resolved = resolveInputs({ ...BASE, tactical: { enabled: true } });
    expect(resolved.lining?.enabled).toBe(true);
  });

  it('tactical.enabled:true sets lining.interfacing to hdpe', () => {
    const resolved = resolveInputs({ ...BASE, tactical: { enabled: true } });
    expect(resolved.lining?.interfacing).toBe('hdpe');
  });

  it('tactical.enabled:true sets foldover_preset to tactical', () => {
    const resolved = resolveInputs({ ...BASE, tactical: { enabled: true } });
    expect(resolved.foldover_preset).toBe('tactical');
  });

  it('tactical.enabled:true sets velcro_panel_width to 101.6', () => {
    const resolved = resolveInputs({ ...BASE, tactical: { enabled: true } });
    expect(resolved.tactical?.velcro_panel_width).toBe(101.6);
  });

  it('tactical.enabled:true sets velcro_panel_height to 152.4', () => {
    const resolved = resolveInputs({ ...BASE, tactical: { enabled: true } });
    expect(resolved.tactical?.velcro_panel_height).toBe(152.4);
  });

  it('manual velcro_panel_width override wins over tactical default', () => {
    const resolved = resolveInputs({ ...BASE, tactical: { enabled: true, velcro_panel_width: 200 } });
    expect(resolved.tactical?.velcro_panel_width).toBe(200);
  });

  it('manual velcro_panel_height override wins over tactical default', () => {
    const resolved = resolveInputs({ ...BASE, tactical: { enabled: true, velcro_panel_height: 250 } });
    expect(resolved.tactical?.velcro_panel_height).toBe(250);
  });

  it('without tactical the resolved tactical field is undefined', () => {
    const resolved = resolveInputs({ ...BASE });
    expect(resolved.tactical).toBeUndefined();
  });

  it('without tactical lining is undefined when not provided', () => {
    const resolved = resolveInputs({ ...BASE });
    expect(resolved.lining).toBeUndefined();
  });

  it('tactical mode with explicit lining.interfacing override preserves user choice', () => {
    const resolved = resolveInputs({ ...BASE, tactical: { enabled: true }, lining: { enabled: true, interfacing: 'fusible' } });
    expect(resolved.lining?.interfacing).toBe('fusible');
  });

  it('tactical mode does not override explicit foldover_preset', () => {
    const resolved = resolveInputs({ ...BASE, tactical: { enabled: true }, foldover_preset: 'civilian' });
    expect(resolved.foldover_preset).toBe('civilian');
  });
});

describe('non-tactical feature defaults in resolveInputs', () => {
  it('card_slots gets default slot_height when not provided', () => {
    const resolved = resolveInputs({ ...BASE, lining: { enabled: true }, card_slots: { count: 2 } });
    expect(resolved.card_slots?.slot_height).toBe(57);
  });

  it('card_slots preserves explicit slot_height', () => {
    const resolved = resolveInputs({ ...BASE, lining: { enabled: true }, card_slots: { count: 2, slot_height: 45 } });
    expect(resolved.card_slots?.slot_height).toBe(45);
  });

  it('bookmark_ribbon gets default width_mm when not provided', () => {
    const resolved = resolveInputs({ ...BASE, lining: { enabled: true }, bookmark_ribbon: { count: 1 } });
    expect(resolved.bookmark_ribbon?.width_mm).toBe(9.5);
  });

  it('bookmark_ribbon preserves explicit width_mm', () => {
    const resolved = resolveInputs({ ...BASE, lining: { enabled: true }, bookmark_ribbon: { count: 1, width_mm: 12 } });
    expect(resolved.bookmark_ribbon?.width_mm).toBe(12);
  });

  it('internal_zip_pocket gets default gauge when not provided', () => {
    const resolved = resolveInputs({ ...BASE, lining: { enabled: true }, internal_zip_pocket: {} });
    expect(resolved.internal_zip_pocket?.gauge).toBe('#5');
  });

  it('no features resolves no feature configs', () => {
    const resolved = resolveInputs({ ...BASE });
    expect(resolved.card_slots).toBeUndefined();
    expect(resolved.bookmark_ribbon).toBeUndefined();
    expect(resolved.internal_zip_pocket).toBeUndefined();
    expect(resolved.mesh_pocket).toBeUndefined();
  });

  it('lining without tactical defaults interfacing to fusible', () => {
    const resolved = resolveInputs({ ...BASE, lining: { enabled: true } });
    expect(resolved.lining?.interfacing).toBe('fusible');
  });
});
