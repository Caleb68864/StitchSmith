export type { ClothMesh, MeshOptions } from './mesh.js';
export { buildClothMesh, nearestVertex } from './mesh.js';
export type { Vec3, BoxSolid, CapsuleSolid, RoundedBoxSolid, Solid, SeamSide, SeamSpec, ClothParams, ClothWorld, CreateWorldOptions } from './sim.js';
export { DEFAULT_CLOTH_PARAMS, createWorld, step, relax, seamResidual, maxStretch, maxPenetration, maxCompression, vertexPosition, seamsFromSharedPaths, solidDistance, clothBounds, materialBendStiffness, materialPlateStiffness } from './sim.js';
export { foldedInitial, foldedCreaseRest } from './initial.js';
export type { TorsoSpec, TorsoForm } from './body.js';
export { torsoForm, shoulderPath, TORSO_MEDIUM } from './body.js';
