---
type: phase-spec
sub_spec_id: SS-02
phase: run
wave: 2
depends_on: ['SS-01']
dispatch: factory
master_spec: "docs/specs/2026-05-25-tri-zip-backpack-engine.md"
title: "Engine exporters — PDF (lazy), DXF, cut list + BOM, schemaVersion migrator"
---

# SS-02 — Engine exporters

## Context

Add the four remaining engine exporters. PDF uses `pdf-lib` (new dep, ~150 KB) and is lazy-loaded via dynamic `import()`. DXF is pure JS. Cut list emits a structured object the UI can render + a CSV string. The project-JSON exporter + importer carry `schemaVersion` + `generatorId` and run a per-version migrator chain. v1 and v2 are sibling schemas (Tool Roll and Tri-Zip respectively), NOT an upgrade chain — the migrator mechanism is for future within-generator forward migrations.

## Scope

- `exports/pdf.ts` — Pattern → PDF Blob via pdf-lib. Tiled with crop marks + 50 mm scale square. Used only through `exports/lazy.ts`.
- `exports/dxf.ts` — Pattern → string. Per-piece layers. Edge variants map: Straight → LINE, Arc → ARC, Bezier → LWPOLYLINE.
- `exports/cutList.ts` — Pattern → `{ byMaterial, byHardware }` + `toCsv()` helper.
- `exports/projectJson.ts` — bidirectional. Envelope: `{ schemaVersion, generatorId, inputs, stylePresetName }`. Structural validation on import.
- `exports/lazy.ts` — façade with `loadPdfExporter`, `loadDxfExporter`, `loadTiledHtmlExporter`.
- `exports/migrators/index.ts` — registry + chain. Tested with a synthetic `tri-zip-v2 → tri-zip-v3` example.

## Files

- **Files (new):** see master SS-02.
- **Files (modify):** `src/lib/pattern-engine/exports/index.ts` (re-export new pieces; **defer-modified** target — created in SS-01), `package.json` (add `pdf-lib`).

## Interface Contracts

### loadPdfExporter
- Direction: SS-02 → SS-04, SS-05
- Owner: SS-02
- Shape: `async function loadPdfExporter(): Promise<{ exportPdf: (pattern: Pattern, opts: PdfOptions) => Promise<Blob> }>`
- File: `src/lib/pattern-engine/exports/lazy.ts`

### loadDxfExporter
- Direction: SS-02 → SS-04, SS-05
- Owner: SS-02
- Shape: `async function loadDxfExporter(): Promise<{ exportDxf: (pattern: Pattern) => string }>`
- File: `src/lib/pattern-engine/exports/lazy.ts`

### loadTiledHtmlExporter
- Direction: SS-02 → SS-04, SS-05
- Owner: SS-02
- Shape: `async function loadTiledHtmlExporter(): Promise<{ exportTiledHtml: (pattern: Pattern, opts: TileOptions) => string }>`
- File: `src/lib/pattern-engine/exports/lazy.ts`

### computeCutList
- Direction: SS-02 → SS-04 (CutListTable), SS-05 (Tool Roll cut list display)
- Owner: SS-02
- Shape: `function computeCutList(pattern: Pattern): { byMaterial: Array<{ materialId; totalAreaMm2; pieces: string[] }>; byHardware: Array<{ hardwareId; count }> }`
- File: `src/lib/pattern-engine/exports/cutList.ts`

### exportProjectJson / importProjectJson
- Direction: SS-02 → SS-04, SS-05
- Owner: SS-02
- Shape: `export function exportProjectJson<T>(env: ProjectEnvelope<T>): string` and `export function importProjectJson<T>(json: string, schema: InputSchema<T>): Result<ProjectEnvelope<T>, ImportError>`
- Envelope: `interface ProjectEnvelope<T> { schemaVersion: number; generatorId: string; inputs: T; stylePresetName?: string }`
- File: `src/lib/pattern-engine/exports/projectJson.ts`

## Implementation Steps (TDD)

### Step 1. Add `pdf-lib` to package.json

`npm install pdf-lib --save`. Verify it's in `dependencies` (not `devDependencies`).

### Step 2. Test: lazy façade dynamic-imports correctly

Write `__tests__/exports-lazy.test.ts` (within this sub-spec): assert that calling `loadPdfExporter()` returns a promise that resolves to an object with `exportPdf`. Use vitest's `vi.dynamicImportSettled` if needed.

### Step 3. Implement lazy façade

`exports/lazy.ts` exports three functions, each of shape `() => import('./<module>')`.

### Step 4. Test: DXF entity mapping

Write `__tests__/exports-dxf.test.ts`:
- A pattern with one `Straight` edge → DXF output contains `0\nLINE\n` followed by group codes `10`/`20` for start, `11`/`21` for end.
- A pattern with one `Arc` edge → contains `0\nARC\n` with `10`/`20` center, `40` radius, `50`/`51` start/end angles.
- A pattern with one `Bezier` edge → contains `0\nLWPOLYLINE\n` with 32 vertices (default sampling).
- Envelope: starts with `0\nSECTION\n2\nHEADER` and ends with `0\nEOF`.
- One layer per piece named by piece id; `0\nLAYER\n` entries in TABLES section.

### Step 5. Implement DXF exporter

`exports/dxf.ts`. Reference DXF spec for ASCII format. Use the engine's `Edge` discriminated union with a `switch` on `edge.kind`. Layer table in `HEADER`/`TABLES` section, entities in `ENTITIES` section.

### Step 6. Test: PDF tiled output

Write `__tests__/exports-pdf.test.ts`:
- Calling `exportPdf(pattern, { paperSize: 'letter' })` returns a Blob with `type === 'application/pdf'`.
- The Blob is parseable by `pdf-lib`'s `PDFDocument.load`.
- Each page contains a 50 mm scale-check square (verify by counting matching draw operations).

### Step 7. Implement PDF exporter

`exports/pdf.ts` imports `PDFDocument` from `pdf-lib`. Tiles the pattern across pages matching the requested paper size. Adds crop marks at page corners + the 50 mm scale square.

### Step 8. Test: cut list aggregation

`__tests__/exports-cutList.test.ts`. Fixture pattern with 2 materials, 3 pieces. Assert byMaterial sums correctly; assert toCsv produces `materialId,totalAreaMm2,pieces` header + 2 rows.

### Step 9. Implement cut list

`exports/cutList.ts`. For each piece, compute polygon area via shoelace formula on the path's vertex chain (sample arcs/beziers as needed for area). Aggregate by `materialId`. Hardware aggregation: count by `hardwareId` from the pattern's hardware list.

### Step 10. Test: project JSON round-trip + validation

`__tests__/exports-projectJson.test.ts`:
- Round-trip envelope bit-for-bit.
- Importing JSON missing `generatorId` returns `Result.err({ kind: 'invalid-shape', field: 'generatorId' })`.
- Importing JSON with wrong-type `inputs.height` returns `Result.err({ kind: 'invalid-shape' })`.
- Importing JSON with `schemaVersion` > latest known returns `Result.err({ kind: 'unsupported-version', got: 99 })`.
- Synthetic migrator: register a `tri-zip-v2 → v3` upgrader; import a v2 JSON with the v3 migrator registered → result envelope has `schemaVersion: 3` and the migrator's transformation applied.

### Step 11. Implement project JSON + migrator chain

`exports/projectJson.ts` + `exports/migrators/index.ts`:
- `MigratorRegistry` holds `{ generatorId, from, to, migrate }` entries.
- `import()` looks up by `generatorId`, runs forward-migration chain from `schemaVersion` to latest registered.
- Structural validation: caller passes an `InputSchema` (lightweight runtime checker; can be a simple per-field validator function).

### Step 12. Wire `exports/index.ts` barrel

Modify `src/lib/pattern-engine/exports/index.ts` to re-export `cutList`, `projectJson`, `migrators`, and re-export `lazy`. Do NOT re-export `pdf.ts` or `dxf.ts` directly — they are only loaded via `lazy.ts` to keep them out of the main bundle.

### Step 13. Verify lazy chunking in build

`npm run build`. Inspect `dist/assets/`. Confirm `pdf-lib` is in a separate JS chunk (Vite naming: `pdf-<hash>.js` or similar), not in the main `index-<hash>.js` chunk. Document the chunk name in the test if helpful.

### Step 14. Run all engine tests

`npm test -- --run src/lib/pattern-engine/`. All green. `npm run build` exits 0.

### Step 15. Commit

```bash
git add src/lib/pattern-engine/exports src/lib/pattern-engine/__tests__ package.json package-lock.json
git commit -m "feat(engine): PDF/DXF/cut-list/projectJson exporters with lazy façade and migrator chain [SS-02]"
```

## Verification Commands

- Build: `npm run build` (check `pdf-lib` chunked separately)
- Test: `npm test -- --run src/lib/pattern-engine/`
- Bundle inspection: `ls -la dist/assets/*.js | grep -i pdf` (optional sanity)

## Checks

| Criterion | Type | Command |
|---|---|---|
| `pdf-lib` in dependencies | STRUCTURAL | `grep -q '"pdf-lib"' package.json \|\| (echo "FAIL: pdf-lib missing from package.json" && exit 1)` |
| Lazy façade exports three loaders | STRUCTURAL | `grep -qE "loadPdfExporter\|loadDxfExporter\|loadTiledHtmlExporter" src/lib/pattern-engine/exports/lazy.ts \|\| (echo "FAIL: lazy.ts missing loaders" && exit 1)` |
| Only pdf.ts statically imports pdf-lib | MECHANICAL | `[ $(grep -rEl "from ['\"]pdf-lib['\"]" src/lib/pattern-engine/) = "src/lib/pattern-engine/exports/pdf.ts" ] \|\| (echo "FAIL: pdf-lib imported outside pdf.ts" && exit 1)` |
| DXF exporter file exists | STRUCTURAL | `test -f src/lib/pattern-engine/exports/dxf.ts \|\| (echo "FAIL: dxf.ts missing" && exit 1)` |
| Migrators index exists | STRUCTURAL | `test -f src/lib/pattern-engine/exports/migrators/index.ts \|\| (echo "FAIL: migrators/index.ts missing" && exit 1)` |
| Engine tests pass | MECHANICAL | `npm test -- --run src/lib/pattern-engine/ 2>&1 \| tail -1; [ ${PIPESTATUS[0]} -eq 0 ] \|\| (echo "FAIL: engine tests" && exit 1)` |
| Build succeeds | MECHANICAL | `npm run build \|\| (echo "FAIL: build" && exit 1)` |

## Acceptance Criteria (from master SS-02)

All criteria from master spec SS-02 apply. See master for full list including PDF Blob/MIME, DXF envelope shape, DXF entity mapping per Edge variant, structural validation on import, synthetic migrator test, lazy-chunk verification.

## Escalation Triggers

- `pdf-lib` is unmaintained or has a security advisory at install time. Escalate with alternative options.
- Lazy chunking does not work as expected (PDF code ends up in main bundle). Escalate before increasing bundle budget.
