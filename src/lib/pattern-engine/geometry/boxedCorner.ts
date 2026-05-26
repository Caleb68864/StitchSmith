export interface BoxedCornerResult {
  stitchLineOffsetFromCorner: number;
  trimAllowanceMm: 9.5;
  markers: Array<{ x: number; y: number; label: string }>;
}

export function boxedCornerStitchLine({
  panelWidth,
  panelHeight,
  bottomWidth,
}: {
  panelWidth: number;
  panelHeight: number;
  bottomWidth: number;
}): BoxedCornerResult {
  const offset = bottomWidth / 2;
  return {
    stitchLineOffsetFromCorner: offset,
    trimAllowanceMm: 9.5,
    markers: [
      { x: offset, y: 0, label: 'stitch-line-left' },
      { x: panelWidth - offset, y: 0, label: 'stitch-line-right' },
    ],
  };
}
