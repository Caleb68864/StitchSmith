// @vitest-environment node
/** Cut sheets grouped by assembly: the generators that opt in tag every piece with a real sub-assembly. */
import { describe, it, expect } from 'vitest';
import { GENERATORS } from './generators.table.js';
import { assignAssemblies, type Piece } from '../../lib/pattern-engine/graph/Piece.js';
import { patternAssemblies } from '../../lib/pattern-engine/exports/svg.js';

const TAGGED = ['clamshell-pack', 'lbv', 'micro-rig', 'quilt', 'wind-shirt', 'tri-zip-backpack', 'plate-carrier',
  'fanny-pack', 'sling', 'bivy', 'tarp', 'beanie', 'organizer', 'circle-skirt', 'book-cover', 'mag-pouch', 'padded-strap', 'hammock'];
/** Options that give a generator its second kit (a one-piece default has nothing to group). */
const OPTIONS: Record<string, Record<string, unknown>> = { hammock: { bug_net: true } };

describe('assembly tags', () => {
  it('assignAssemblies: first matching rule wins, else the existing tag, else Other', () => {
    const p = (id: string, assembly?: string): Piece => ({ id, name: id, mirror: false, quantity: 1, paths: [], assembly });
    const out = assignAssemblies([p('front-a'), p('strap-b'), p('odd', 'Kept'), p('none')], [[/^front/, 'Front'], [/strap/, 'Straps'], [/front|strap/, 'Never']]);
    expect(out.map((x) => x.assembly)).toEqual(['Front', 'Straps', 'Kept', 'Other']);
  });
  for (const name of TAGGED) {
    it(`${name}: every default piece carries an assembly, at least two named kits, few left in Other`, () => {
      const g = GENERATORS.find((x) => x.name === name)!;
      const pieces = g.build({ ...g.defaults(), ...(OPTIONS[name] ?? {}) })!;
      for (const p of pieces) expect(p.assembly, `${name}/${p.id}`).toBeTruthy();
      const kits = patternAssemblies({ id: 'p', name: 'p', pieces }).filter((a) => a !== 'Other');
      expect(kits.length).toBeGreaterThanOrEqual(2);
      expect(pieces.filter((p) => p.assembly === 'Other').length).toBeLessThanOrEqual(Math.ceil(pieces.length / 4));
    });
  }
});
