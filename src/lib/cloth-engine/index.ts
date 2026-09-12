export type { ClothMesh, MeshOptions } from './mesh.js';
export { buildClothMesh, nearestVertex } from './mesh.js';
export type { Vec3, BoxSolid, CapsuleSolid, RoundedBoxSolid, Solid, SeamSide, SeamSpec, ClothParams, ClothWorld, CreateWorldOptions, SettleOptions, SettleMonitor, StretchReport } from './sim.js';
export { DEFAULT_CLOTH_PARAMS, PLATE_MIN_STIFFNESS, createWorld, step, relax, relaxUntilSettled, createSettleMonitor, stepMovement, stretchPercentile, stretchReport, seamResidual, maxStretch, maxPenetration, maxCompression, vertexPosition, seamsFromSharedPaths, solidDistance, clothBounds, materialBendStiffness, materialPlateStiffness } from './sim.js';
export { foldedInitial, foldedCreaseRest } from './initial.js';
export type { TorsoSpec, TorsoForm } from './body.js';
export { torsoForm, shoulderPath, TORSO_MEDIUM } from './body.js';
export type { PinSpec } from './pins.js';
export { pinHolds } from './pins.js';
