export interface RollTopClosureResult {
  foldLines: Array<{ y: number; label: string }>;
  webbingAttachment: { x: number; y: number; width: number };
}

export function rollTopClosure({
  openingWidth,
  collarHeight,
  webbingWidthMm,
}: {
  openingWidth: number;
  collarHeight: number;
  webbingWidthMm: number;
}): RollTopClosureResult {
  return {
    foldLines: [
      { y: collarHeight, label: 'top-of-collar' },
      { y: 0, label: 'bottom-of-collar' },
    ],
    webbingAttachment: {
      x: (openingWidth - webbingWidthMm) / 2,
      y: collarHeight / 2,
      width: webbingWidthMm,
    },
  };
}
