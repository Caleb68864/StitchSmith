/**
 * A test body for the drafting-engine tests: one person's measurements in
 * inches, NOT a size chart (none is sourced). Not a .test.ts, so vitest does
 * not run it as a suite.
 */
import type { MeasurementInput } from '../drafting/measurements.js';

export const TEST_BODY: MeasurementInput = {
  chest: 40, waist: 34, hip: 40, neck: 15.5, bicep: 13, wrist: 7,
  nape_to_waist: 18, scye_depth: 9, waist_to_hip: 8, shoulder_width: 17.5, arm_length: 25,
};
