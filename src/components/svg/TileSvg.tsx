import type { FC } from 'react';
import type { ToolRollLayout, ToolRollSettings, PrintTile } from '../../generators/tool-roll/types.js';
import { TileOverlay } from './TileOverlay.js';
import { SvgGrid } from './SvgGrid.js';
import { SvgLabels } from './SvgLabels.js';
import { SvgDimensionLines } from './SvgDimensionLines.js';

interface TileSvgProps {
  tile: PrintTile;
  layout: ToolRollLayout;
  settings: ToolRollSettings;
  printMargin: number;
  overlap: number;
}

/**
 * Renders a page-sized SVG for a single print tile.
 * The pattern is translated (not scaled) so the tile's region is visible.
 * viewBox exactly matches paper dimensions so 1 SVG unit = 1 mm, no scaling.
 */
export const TileSvg: FC<TileSvgProps> = ({ tile, layout, settings, printMargin, overlap }) => {
  const { patternWidth, patternHeight } = layout;
  const w = tile.width;
  const h = tile.height;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={`${w}mm`}
      height={`${h}mm`}
      viewBox={`0 0 ${w} ${h}`}
    >
      {/* Translate pattern content into the printable area (inside the print margin).
          Pattern point at (tile.x, tile.y) lands at SVG (printMargin, printMargin). */}
      <g transform={`translate(${printMargin - tile.x} ${printMargin - tile.y})`}>
        {settings.showGrid && (
          <SvgGrid width={patternWidth} height={patternHeight} />
        )}

        {/* Finished-size rectangle */}
        <g fill="none" stroke="#aaa" strokeWidth={0.3} strokeDasharray="3 1">
          <rect
            x={layout.backPanel.boundingBox.x}
            y={layout.backPanel.boundingBox.y}
            width={layout.backPanel.boundingBox.width}
            height={layout.backPanel.boundingBox.height}
          />
        </g>

        {/* Hem lines */}
        {settings.showHemLines && (
          <g stroke="#8b5cf6" strokeWidth={0.5} strokeDasharray="5 2" fill="none">
            {layout.hemLines.map(l => (
              <line key={l.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
            ))}
          </g>
        )}

        {/* Seam allowance lines */}
        {settings.showSeamLines && (
          <g stroke="#f59e0b" strokeWidth={0.5} strokeDasharray="5 2" fill="none">
            {layout.seamAllowanceLines.map(l => (
              <line key={l.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
            ))}
          </g>
        )}

        {/* Cut lines */}
        <g fill="none" stroke="#111" strokeWidth={1}>
          <path d={layout.backPanel.cutPath} />
          <path d={layout.pocketPanel.cutPath} />
          {layout.flap && <path d={layout.flap.cutPath} />}
        </g>

        {/* Stitch lines */}
        {settings.showStitchLines && (
          <g stroke="#16a34a" strokeWidth={0.5} strokeDasharray="2 2" fill="none">
            {layout.stitchLines.map(l => (
              <line key={l.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
            ))}
            {layout.backPanel.stitchPath && <path d={layout.backPanel.stitchPath} />}
            {layout.pocketPanel.stitchPath && <path d={layout.pocketPanel.stitchPath} />}
          </g>
        )}

        {/* Fold lines — flap fold is in layout.foldLines; flap free-edge hem fold
              is a profile path that may be curved/stepped. */}
        {settings.showFoldLines && (
          <g stroke="#2563eb" strokeWidth={0.5} strokeDasharray="8 3 2 3" fill="none">
            {layout.foldLines.map(l => (
              <line key={l.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
            ))}
            {layout.flap?.hemFoldPath && (
              <path d={layout.flap.hemFoldPath} />
            )}
            {layout.pocketPanel?.hemFoldPath && (
              <path d={layout.pocketPanel.hemFoldPath} />
            )}
          </g>
        )}

        {/* Tie marks — back panel area only */}
        {layout.tieMarks.map(tie => {
          const yTop = layout.backPanel.boundingBox.y;
          const yHeight = layout.backPanel.boundingBox.height;
          return (
            <g key={tie.id} fill="none" stroke="#dc2626" strokeWidth={0.5}>
              <rect
                x={tie.x - tie.width / 2}
                y={yTop}
                width={tie.width}
                height={yHeight}
                strokeDasharray="4 2"
              />
            </g>
          );
        })}

        {/* Notches */}
        {layout.notches.map(notch => {
          const rad = (notch.angle * Math.PI) / 180;
          const dx = Math.cos(rad) * notch.length;
          const dy = Math.sin(rad) * notch.length;
          return (
            <line
              key={notch.id}
              x1={notch.x - dx / 2}
              y1={notch.y - dy / 2}
              x2={notch.x + dx / 2}
              y2={notch.y + dy / 2}
              stroke="#111"
              strokeWidth={0.8}
            />
          );
        })}

        {settings.showLabels && <SvgLabels labels={layout.labels} />}
        {settings.showDimensionLines && <SvgDimensionLines dimensionLines={layout.dimensionLines} />}
      </g>

      {/* Overlay in page coordinate space (no offset) */}
      <TileOverlay
        tile={tile}
        printLayout={layout.printLayout}
        units={layout.units}
        printMargin={printMargin}
        overlap={overlap}
      />
    </svg>
  );
};
