/**
 * detectAkProfile.test.ts
 * Verifies the AK-magazine profile detection logic.
 *
 * Thresholds: height ≥ 8.5" AND thickness ≥ 1.05" → warning.
 */

import { describe, it, expect } from 'vitest';
import { detectAkProfile, AK_WARNING_COPY } from '../buildPattern.js';

describe('detectAkProfile', () => {
  // ── No-warning cases ────────────────────────────────────────────────────────

  it('PMAG Gen 3 profile (height 7.5") returns undefined — height fails threshold', () => {
    const result = detectAkProfile({ width: 2.5, thickness: 1.05, height: 7.5 });
    expect(result).toBeUndefined();
  });

  it('height satisfied but thickness < 1.05 returns undefined', () => {
    // thickness 1.0 — does NOT meet the 1.05" threshold
    const result = detectAkProfile({ width: 2.7, thickness: 1.0, height: 9.0 });
    expect(result).toBeUndefined();
  });

  it('AR-15 30-round profile returns undefined', () => {
    const result = detectAkProfile({ width: 2.55, thickness: 1.0, height: 7.5 });
    expect(result).toBeUndefined();
  });

  it('exactly at height threshold but thickness below returns undefined', () => {
    const result = detectAkProfile({ width: 2.5, thickness: 1.0, height: 8.5 });
    expect(result).toBeUndefined();
  });

  // ── Warning cases ────────────────────────────────────────────────────────────

  it('AK 30-rd profile (height 9.0", thickness 1.05") returns AK warning copy', () => {
    const result = detectAkProfile({ width: 2.5, thickness: 1.05, height: 9.0 });
    expect(result).toBeDefined();
    // Substring match against the canonical copy
    expect(result).toContain('AK-pattern');
  });

  it('returned warning is a substring of AK_WARNING_COPY', () => {
    const result = detectAkProfile({ width: 2.5, thickness: 1.05, height: 9.0 });
    expect(result).toBe(AK_WARNING_COPY);
  });

  it('exactly at both thresholds (8.5", 1.05") triggers warning', () => {
    const result = detectAkProfile({ width: 2.5, thickness: 1.05, height: 8.5 });
    expect(result).toBeDefined();
    expect(result).toContain('AK-pattern');
  });

  it('AK-74 profile (height 8.75", thickness 1.05") triggers warning', () => {
    const result = detectAkProfile({ width: 2.2, thickness: 1.05, height: 8.75 });
    expect(result).toBeDefined();
  });

  // ── AK_WARNING_COPY is the documented canonical copy ────────────────────────

  it('AK_WARNING_COPY contains the documented AK warning text', () => {
    expect(AK_WARNING_COPY).toContain('AK-pattern magazine dimensions detected');
    expect(AK_WARNING_COPY).toContain('folded-T construction');
  });
});
