/**
 * Represents the physical object that will be carried in the pouch.
 * All measurements are in millimetres.
 */
export interface CarriedObject {
  /** Widest left-to-right dimension of the object (mm). */
  width: number;
  /** Front-to-back depth / thickness of the object (mm). */
  depth: number;
  /** Tallest top-to-bottom dimension of the object (mm). */
  height: number;
}
