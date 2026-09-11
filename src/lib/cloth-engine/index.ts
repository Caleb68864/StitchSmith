export type { ClothMesh, MeshOptions } from './mesh.js';
export { buildClothMesh, nearestVertex } from './mesh.js';
export type { Vec3, BoxSolid, SeamSide, SeamSpec, ClothParams, ClothWorld, CreateWorldOptions } from './sim.js';
export { DEFAULT_CLOTH_PARAMS, createWorld, step, relax, seamResidual, maxStretch, maxPenetration, vertexPosition } from './sim.js';
export { foldedInitial, foldedCreaseRest } from './initial.js';
