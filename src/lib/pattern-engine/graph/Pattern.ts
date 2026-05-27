import type { Piece } from './Piece.js';

export interface Pattern {
  id: string;
  name: string;
  pieces: Piece[];
  description?: string;
  units?: 'mm' | 'cm' | 'in';
}
