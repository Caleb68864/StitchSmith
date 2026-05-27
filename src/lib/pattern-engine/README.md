# Pattern Engine

Framework-agnostic sewing pattern computation library.

## Structure

```
pattern-engine/
  graph/          — Core data model (Point, Edge, Path, Piece, Pattern)
  geometry/       — Computation helpers (offset, arc, transform, units, bbox)
  materials/      — Material, Hardware, CutList aggregator
  instructions/   — Step interface, topological compiler, markdown/HTML render
  exports/        — SVG and tiled-HTML exporters
  __tests__/      — Vitest contract + unit tests
```

## Rules

- No imports from `src/generators/` or `src/components/`.
- All coordinates are in millimetres unless otherwise noted.
- All public APIs use the `Result<T, E>` pattern for fallible operations.

## Quick start

```typescript
import { type Pattern, type Piece, patternToSvg } from '@/lib/pattern-engine';

const piece: Piece = {
  id: 'back-panel',
  name: 'Back Panel',
  mirror: false,
  quantity: 1,
  paths: [{ id: 'cut', closed: true, edges: [ /* ... */ ] }],
};

const pattern: Pattern = { id: 'my-bag', name: 'My Bag', pieces: [piece] };
const svg = patternToSvg(pattern);
```
