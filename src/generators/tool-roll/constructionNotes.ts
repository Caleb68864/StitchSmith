import type { ToolRollLayout, ToolRollSettings, UnitSystem } from './types.js';

function fmt(value: number, units: UnitSystem): string {
  if (units === 'in') {
    return `${(value / 25.4).toFixed(2)}"`;
  }
  return `${value.toFixed(1)} mm`;
}

/**
 * Generates a list of plain-English construction notes for the tool roll.
 * Notes describe cutting, stitching, pocket division, and finishing steps.
 */
export function generateConstructionNotes(
  layout: ToolRollLayout,
  settings: ToolRollSettings,
  units: UnitSystem,
): string[] {
  const notes: string[] = [];
  const w = fmt(layout.patternWidth, units);
  const h = fmt(layout.patternHeight, units);

  notes.push(`Cut one back panel: ${w} wide × ${h} tall.`);

  const ppHeight = layout.pocketPanel.boundingBox.height;
  notes.push(
    `Cut one pocket panel: ${w} wide × ${fmt(ppHeight, units)} tall.`,
  );

  if (layout.flap) {
    const flapH = layout.flap.boundingBox.height;
    notes.push(`Cut one flap: ${w} wide × ${fmt(flapH, units)} tall.`);
  }

  notes.push(
    `Fold and press ${fmt(settings.topHemAllowance, units)} hem at top of back panel to wrong side.`,
  );
  notes.push(
    `Fold and press ${fmt(settings.bottomHemAllowance, units)} hem at bottom of back panel to wrong side.`,
  );
  notes.push(
    `Fold and press ${fmt(settings.sideHemAllowance, units)} hem on each side of back panel to wrong side.`,
  );

  notes.push(
    `Align pocket panel to back panel (wrong sides together), bottom edges even. Pin and baste.`,
  );

  notes.push(
    `Stitch pocket divider lines from bottom hem to top of pocket panel at each pocket boundary. ` +
    `Backstitch at top and bottom of each divider.`,
  );

  if (layout.pockets.length > 0) {
    notes.push(
      `There are ${layout.pockets.length} pocket(s). ` +
      `Pocket widths (left to right): ` +
      layout.pockets.map(p => fmt(p.pocketWidth, units)).join(', ') + '.',
    );
  }

  if (layout.flap) {
    notes.push(
      `Fold and press a ${fmt(settings.flapHemAllowance, units)} hem along the flap's two sides and free (top) edge. ` +
      `Stitch each hem.`,
    );
    notes.push(
      `Tuck the flap's attached edge under the back panel's top hem (the ${fmt(settings.topHemAllowance, units)} fold from earlier). ` +
      `Pin to keep the flap aligned with the back panel's top edge, then stitch through both layers along the back panel's top hem stitch line. ` +
      `This secures the flap and finishes the top of the back panel in one pass.`,
    );
  }

  if (settings.tieEnabled) {
    notes.push(
      `Cut two tie strips ${fmt(settings.tieWidth, units)} × ${fmt(settings.tieLength / 2, units)} each. ` +
      `Fold, press, and stitch. Attach ties at center top of back panel.`,
    );
  }

  notes.push(`Press all seams. Roll up and tie to finish.`);

  return notes;
}
