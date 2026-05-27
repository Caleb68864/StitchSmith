export type MaterialType = 'fabric' | 'interfacing' | 'lining' | 'webbing' | 'foam' | 'other';

export interface Material {
  id: string;
  name: string;
  type: MaterialType;
  color?: string;
  widthMm?: number;
  notes?: string;
}
