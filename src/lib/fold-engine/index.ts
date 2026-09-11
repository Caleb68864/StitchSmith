export type { Vec3, FoldLine, Region, Hinge, FoldModel, BuildOptions, FoldedPanel, FoldedHingeLine, FoldedModel } from './model.js';
export { buildFoldModel, defaultFoldAngles, foldModel, foldedBounds, regionAt, castRay, measureCavity, regionsUnderFolds, withoutRegions, regionTransforms, transformFlatPoint, onAnyFold } from './model.js';
export type { RegionTransform } from './model.js';
export type { CavityAxis, CavityReport } from './model.js';
export type { Poly, Line } from './polygon.js';
export { pathToPolygon, splitPolygon, splitPolygonMulti, triangulate, area, centroid, pointInPolygon } from './polygon.js';
