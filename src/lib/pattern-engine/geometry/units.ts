export type LengthUnit = 'mm' | 'cm' | 'in';

const MM_PER_INCH = 25.4;
const MM_PER_CM = 10;

export function toMm(value: number, from: LengthUnit): number {
  switch (from) {
    case 'mm': return value;
    case 'cm': return value * MM_PER_CM;
    case 'in': return value * MM_PER_INCH;
  }
}

export function fromMm(value: number, to: LengthUnit): number {
  switch (to) {
    case 'mm': return value;
    case 'cm': return value / MM_PER_CM;
    case 'in': return value / MM_PER_INCH;
  }
}

export function convert(value: number, from: LengthUnit, to: LengthUnit): number {
  return fromMm(toMm(value, from), to);
}
