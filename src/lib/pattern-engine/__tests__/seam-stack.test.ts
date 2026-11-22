// @vitest-environment node
import { describe, it, expect } from 'vitest';
import { layerBudget, layerBudgetMessage, stackTotal, FORWARD_ONLY_LAYERS } from '../seams/stack.js';
import { pleatedCardStacks } from '../../pouch-engine/construction/pleatedCard.js';
import type { PleatedCardParams } from '../../pouch-engine/construction/ConstructionStrategy.js';

const IN = 25.4;
const card: PleatedCardParams = { cellCount: 4, cellSpan: 3 * IN, facePerCell: 4.875 * IN, cardHeight: 7 * IN, backHem: 0.5 * IN, faceEndHem: 0.5 * IN, faceBottomHem: 0, flapLength: 0, bottomStyle: 'pleat' };

describe('seam stacks and the layer budget', () => {
  it('totals each stack; over 8 layers is forward-only, heaviest first', () => {
    const b = layerBudget([
      { seam: 'light', layers: [{ what: 'a', count: 3 }] },
      { seam: 'heavy', layers: [{ what: 'a', count: 6 }, { what: 'b', count: 4 }] },
      { seam: 'eight', layers: [{ what: 'a', count: 8 }] },
    ]);
    expect(FORWARD_ONLY_LAYERS).toBe(8);
    expect(b.max).toBe(10);
    expect(b.maxSeam).toBe('heavy');
    expect(b.forwardOnly).toEqual(['heavy']);
    expect(layerBudgetMessage(b)).toMatch(/Over 8 at heavy: sew forward only/);
    expect(layerBudgetMessage(layerBudget([{ seam: 'x', layers: [{ what: 'a', count: 4 }] }]))).toMatch(/at or under 8/);
    expect(stackTotal({ seam: 's', layers: [{ what: 'neg', count: -2 }, { what: 'a', count: 2 }] })).toBe(2);
  });
  it('the pleated card from its construction: face double + back at a division, the pleat folds the face into six', () => {
    const s = pleatedCardStacks(card);
    const by = (name: string) => stackTotal(s.find((x) => x.seam === name)!);
    expect(by('each cell division')).toBe(3);
    expect(by('the outer sides')).toBe(6);
    // Pleat: face 6 + back with its hem 2.
    expect(by('each pleat')).toBe(8);
    // With the loop, PALS row, mount strap and face bar the division reaches the vault's "about 8".
    const full = pleatedCardStacks(card, { atDivision: [{ what: 'loop', count: 2 }, { what: 'row', count: 1 }, { what: 'strap', count: 1 }, { what: 'bar', count: 1 }], atBottom: [{ what: 'loop', count: 2 }] });
    expect(stackTotal(full.find((x) => x.seam === 'each cell division')!)).toBe(8);
    expect(stackTotal(full.find((x) => x.seam === 'each pleat')!)).toBe(10);
    // A single cell has no divisions; a cradle bottom counts its doubled strip.
    expect(pleatedCardStacks({ ...card, cellCount: 1 }).some((x) => x.seam === 'each cell division')).toBe(false);
    expect(stackTotal(pleatedCardStacks({ ...card, bottomStyle: 'cradle' }).find((x) => x.seam === 'the bottom')!)).toBe(2 + 2 + 2);
  });
});
