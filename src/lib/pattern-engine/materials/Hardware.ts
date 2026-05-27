export type HardwareType =
  | 'zipper'
  | 'buckle'
  | 'dring'
  | 'oring'
  | 'snap'
  | 'rivet'
  | 'webbing-adjuster'
  | 'swivel-hook'
  | 'cord-lock'
  | 'other';

export interface Hardware {
  id: string;
  name: string;
  type: HardwareType;
  quantity: number;
  sizeMm?: number;
  color?: string;
  notes?: string;
}
