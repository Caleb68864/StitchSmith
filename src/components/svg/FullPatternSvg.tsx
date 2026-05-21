import type { FC } from 'react';
import type { ToolRollLayout, ToolRollSettings } from '../../generators/tool-roll/types.js';
import { SvgGrid } from './SvgGrid.js';
import { SvgTileGrid } from './SvgTileGrid.js';
import { SvgLabels } from './SvgLabels.js';
import { SvgDimensionLines } from './SvgDimensionLines.js';

interface FullPatternSvgProps {
  layout: ToolRollLayout;
  settings: ToolRollSettings;
}

/**
 * Renders the full sewing-pattern SVG.
 *
 * Layer order (§28):
 *   background grid → tile grid → finished → seam/hem → cut → stitch →
 *   fold → tie → notches → labels → dimensions
 */
export const FullPatternSvg: FC<FullPatternSvgProps> = ({ layout, settings }) => {
  const { patternWidth, patternHeight } = layout;
  const vb = `0 0 ${patternWidth} ${patternHeight}`;

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={`${patternWidth}mm`}
      height={`${patternHeight}mm`}
      viewBox={vb}
    >
      {/* 1. Background grid */}
      {settings.showGrid && (
        <SvgGrid width={patternWidth} height={patternHeight} />
      )}

      {/* 2. Tile grid overlay */}
      {settings.showTileGrid && (
        <SvgTileGrid printLayout={layout.printLayout} />
      )}

      {/* 3. Finished-size rectangle (back panel content area) */}
      <g className="layer-finished" fill="none" stroke="#aaaaaa" strokeWidth={0.3} strokeDasharray="3 1">
        <rect
          x={layout.backPanel.boundingBox.x}
          y={layout.backPanel.boundingBox.y}
          width={layout.backPanel.boundingBox.width}
          height={layout.backPanel.boundingBox.height}
        />
      </g>

      {/* 4. Seam / hem lines */}
      {(settings.showSeamLines || settings.showHemLines) && (
        <g className="layer-seam-hem">
          {settings.showHemLines && (
            <g stroke="#8b5cf6" strokeWidth={0.5} strokeDasharray="5 2" fill="none">
              {layout.hemLines.map(l => (
                <line key={l.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
              ))}
            </g>
          )}
          {settings.showSeamLines && (
            <g stroke="#f59e0b" strokeWidth={0.5} strokeDasharray="5 2" fill="none">
              {layout.seamAllowanceLines.map(l => (
                <line key={l.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
              ))}
            </g>
          )}
        </g>
      )}

      {/* 5. Cut lines (back panel, pocket panel, flap) */}
      <g className="layer-cut" fill="none" stroke="#111111" strokeWidth={1}>
        <path className="back-panel-cut" d={layout.backPanel.cutPath} />
        <path className="pocket-panel-cut" d={layout.pocketPanel.cutPath} />
        {layout.flap && (
          <path className="flap-cut" d={layout.flap.cutPath} />
        )}
      </g>

      {/* 6. Stitch lines */}
      {settings.showStitchLines && (
        <g className="layer-stitch" stroke="#16a34a" strokeWidth={0.5} strokeDasharray="2 2" fill="none">
          {layout.stitchLines.map(l => (
            <line key={l.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
          ))}
          {layout.backPanel.stitchPath && (
            <path d={layout.backPanel.stitchPath} />
          )}
          {layout.pocketPanel.stitchPath && (
            <path d={layout.pocketPanel.stitchPath} />
          )}
        </g>
      )}

      {/* 7. Fold lines — flap fold is already in layout.foldLines (label 'Flap fold') */}
      {settings.showFoldLines && (
        <g className="layer-fold" stroke="#2563eb" strokeWidth={0.5} strokeDasharray="8 3 2 3" fill="none">
          {layout.foldLines.map(l => (
            <line key={l.id} x1={l.x1} y1={l.y1} x2={l.x2} y2={l.y2} />
          ))}
        </g>
      )}

      {/* 8. Tie marks — only span the back panel region, not the flap. */}
      {layout.tieMarks.map(tie => {
        const yTop = layout.backPanel.boundingBox.y;
        const yHeight = layout.backPanel.boundingBox.height;
        return (
          <g key={tie.id} className="layer-tie" fill="none" stroke="#dc2626" strokeWidth={0.5}>
            <rect x={tie.x - tie.width / 2} y={yTop} width={tie.width} height={yHeight} strokeDasharray="4 2" />
            {tie.label && (
              <text x={tie.x} y={yTop + 8} fontSize={4} fill="#dc2626" stroke="none" textAnchor="middle">
                {tie.label}
              </text>
            )}
          </g>
        );
      })}

      {/* 9. Notches */}
      {layout.notches.map(notch => {
        const rad = (notch.angle * Math.PI) / 180;
        const dx = Math.cos(rad) * notch.length;
        const dy = Math.sin(rad) * notch.length;
        return (
          <line
            key={notch.id}
            className="layer-notch"
            x1={notch.x - dx / 2}
            y1={notch.y - dy / 2}
            x2={notch.x + dx / 2}
            y2={notch.y + dy / 2}
            stroke="#111111"
            strokeWidth={0.8}
          />
        );
      })}

      {/* 10. Labels */}
      {settings.showLabels && (
        <SvgLabels labels={layout.labels} />
      )}

      {/* 11. Dimension lines */}
      {settings.showDimensionLines && (
        <SvgDimensionLines dimensionLines={layout.dimensionLines} />
      )}
    </svg>
  );
};
