import type { Pattern } from '../graph/Pattern.js';
import { assertFinitePattern } from '../graph/validate.js';
import type { Edge } from '../graph/Edge.js';
import type { Path } from '../graph/Path.js';

export interface DxfOptions {
  bezierSegments?: number;
}

function dxfGroup(code: number, value: string | number): string {
  return `${code}\n${value}`;
}

function layerDef(name: string): string {
  return [
    dxfGroup(0, 'LAYER'),
    dxfGroup(2, name),
    dxfGroup(70, 0),
    dxfGroup(62, 7),
    dxfGroup(6, 'CONTINUOUS'),
  ].join('\n');
}

function lineEntity(
  layer: string,
  x1: number, y1: number,
  x2: number, y2: number,
): string {
  return [
    dxfGroup(0, 'LINE'),
    dxfGroup(8, layer),
    dxfGroup(10, x1),
    dxfGroup(20, y1),
    dxfGroup(30, 0),
    dxfGroup(11, x2),
    dxfGroup(21, y2),
    dxfGroup(31, 0),
  ].join('\n');
}

function arcEntity(
  layer: string,
  cx: number, cy: number,
  radius: number,
  startAngleDeg: number,
  endAngleDeg: number,
): string {
  return [
    dxfGroup(0, 'ARC'),
    dxfGroup(8, layer),
    dxfGroup(10, cx),
    dxfGroup(20, cy),
    dxfGroup(30, 0),
    dxfGroup(40, radius),
    dxfGroup(50, startAngleDeg),
    dxfGroup(51, endAngleDeg),
  ].join('\n');
}

function lwPolylineEntity(
  layer: string,
  vertices: Array<{ x: number; y: number }>,
  closed: boolean,
): string {
  const flag = closed ? 1 : 0;
  const lines: string[] = [
    dxfGroup(0, 'LWPOLYLINE'),
    dxfGroup(8, layer),
    dxfGroup(90, vertices.length),
    dxfGroup(70, flag),
  ];
  for (const v of vertices) {
    lines.push(dxfGroup(10, v.x));
    lines.push(dxfGroup(20, v.y));
  }
  return lines.join('\n');
}

function sampleCubicBezier(
  p0: { x: number; y: number },
  p1: { x: number; y: number },
  p2: { x: number; y: number },
  p3: { x: number; y: number },
  t: number,
): { x: number; y: number } {
  const mt = 1 - t;
  return {
    x: mt * mt * mt * p0.x + 3 * mt * mt * t * p1.x + 3 * mt * t * t * p2.x + t * t * t * p3.x,
    y: mt * mt * mt * p0.y + 3 * mt * mt * t * p1.y + 3 * mt * t * t * p2.y + t * t * t * p3.y,
  };
}

function normalizeAngleDeg(deg: number): number {
  let d = deg % 360;
  if (d < 0) d += 360;
  return d;
}

function edgeToEntities(
  edge: Edge,
  layer: string,
  bezierSegments: number,
): string {
  switch (edge.kind) {
    case 'straight':
      return lineEntity(layer, edge.start.x, edge.start.y, edge.end.x, edge.end.y);

    case 'arc': {
      const startAngle = Math.atan2(
        edge.start.y - edge.center.y,
        edge.start.x - edge.center.x,
      ) * (180 / Math.PI);
      const endAngle = Math.atan2(
        edge.end.y - edge.center.y,
        edge.end.x - edge.center.x,
      ) * (180 / Math.PI);

      // DXF ARC is always counterclockwise; swap if our edge is clockwise
      if (edge.clockwise) {
        return arcEntity(
          layer,
          edge.center.x, edge.center.y,
          edge.radius,
          normalizeAngleDeg(endAngle),
          normalizeAngleDeg(startAngle),
        );
      }
      return arcEntity(
        layer,
        edge.center.x, edge.center.y,
        edge.radius,
        normalizeAngleDeg(startAngle),
        normalizeAngleDeg(endAngle),
      );
    }

    case 'bezier': {
      const pts: Array<{ x: number; y: number }> = [];
      for (let i = 0; i <= bezierSegments; i++) {
        pts.push(
          sampleCubicBezier(edge.start, edge.cp1, edge.cp2, edge.end, i / bezierSegments),
        );
      }
      return lwPolylineEntity(layer, pts, false);
    }
  }
}

function pathToEntities(
  path: Path,
  layer: string,
  bezierSegments: number,
): string[] {
  return path.edges.map((edge) => edgeToEntities(edge, layer, bezierSegments));
}

export function exportPatternToDxf(
  pattern: Pattern,
  options: DxfOptions = {},
): string {
  assertFinitePattern(pattern);
  const bezierSegments = options.bezierSegments ?? 32;
  const layerNames = pattern.pieces.map((p) => p.id);

  const headerSection = [
    '0\nSECTION',
    '2\nHEADER',
    '9\n$ACADVER',
    '1\nAC1009',
    '9\n$MEASUREMENT',
    '70\n1',
    '0\nENDSEC',
  ].join('\n');

  const layerTableEntries = layerNames.map(layerDef).join('\n');
  const tablesSection = [
    '0\nSECTION',
    '2\nTABLES',
    '0\nTABLE',
    '2\nLAYER',
    `70\n${layerNames.length}`,
    layerTableEntries,
    '0\nENDTAB',
    '0\nENDSEC',
  ].join('\n');

  const entityLines: string[] = [];
  for (const piece of pattern.pieces) {
    for (const path of piece.paths) {
      entityLines.push(...pathToEntities(path, piece.id, bezierSegments));
    }
  }

  const entitiesSection = [
    '0\nSECTION',
    '2\nENTITIES',
    ...entityLines,
    '0\nENDSEC',
  ].join('\n');

  return [
    headerSection,
    tablesSection,
    entitiesSection,
    '0\nEOF',
  ].join('\n');
}
