---
type: redteam-report
generated: 2026-05-20
target: 2026-05-20-stitchsmith-tool-roll-generator.md
findings_count: 4
critical_count: 0
advisory_count: 4
---

# Red Team Review: 2026-05-20-stitchsmith-tool-roll-generator.md

10 sub-specs, ~80 acceptance criteria. Reviewed through 9 antagonistic role lenses plus the construction-site check.

## CRITICAL Findings (0)

None. The spec is well-scoped, fully typed, and traceable to the source design.

## ADVISORY Findings (4)

**A-1: LocalStorage unavailability not handled** (End User / SRE)
- **Location:** SS-04 (LocalStorage persistence)
- **Issue:** Safari private browsing, restrictive browser modes, or quota exhaustion can make LocalStorage throw on every `setItem`. Current acceptance criteria cover corrupted/missing data but not "storage unavailable at all".
- **Recommendation:** Add `[BEHAVIORAL]` criterion: `saveProject` swallows storage errors (with a one-time `console.warn`); app continues to function in-memory only. Surface a `'warning'` severity `PatternWarning` ("Session won't persist — browser storage disabled") so the user knows.
- **Patch:** Applied to SS-04.

**A-2: JSON import has no upper bound on tool count** (Security Auditor / End User)
- **Location:** SS-08 (`parseProjectJson`)
- **Issue:** A malicious or buggy JSON file with a 100,000-tool array would not be rejected by schema validation as written, leading to UI freeze when the layout calculator runs.
- **Recommendation:** Add a sanity bound — reject imports with `tools.length > 500` (or similar) with a clear error message. 500 is well above any realistic tool roll.
- **Patch:** Applied to SS-08.

**A-3: Print warning banner visibility ambiguous** (Developer / End User)
- **Location:** SS-09 (tiled printable HTML)
- **Issue:** The spec says the banner is hidden under `@media print` but does not explicitly require it to be visible in screen view of the standalone HTML file. A reader of the file in a browser tab (before pressing Print) needs to see the warning. The intent is clear but the criterion doesn't enforce it.
- **Recommendation:** Add `[STRUCTURAL]` criterion: the `.print-warning` div is visible by default (no `display: none`) outside the `@media print` block; only `@media print { .print-warning { display: none; } }` hides it.
- **Patch:** Applied to SS-09.

**A-4: SS-05 shadcn vendor pass is brittle to a single CLI failure** (Scope Realist / SRE)
- **Location:** SS-05
- **Issue:** Twelve sequential `npx shadcn@latest add` invocations are one shell hiccup away from a partial-success state that's hard to detect. If the worker reports success without all 12 components landing, downstream sub-specs (SS-06, SS-08, SS-09) will fail at import time.
- **Recommendation:** Add `[MECHANICAL]` criterion that explicitly verifies all 12 component files exist after the vendor pass: `ls src/components/ui/{button,input,label,select,switch,tabs,accordion,dialog,tooltip,card,table,textarea}.tsx` exits 0.
- **Patch:** Applied to SS-05.

## Construction-Site Check

No `construction-site-without-caller` findings. SS-10 explicitly wires the `PatternGenerator` interface into `src/generators/index.ts` and mounts `<App />` from `src/main.tsx` — every produced module has a named call site.

## Role Scorecards

Developer: 1 | QA: 0 | End User: 2 | Architect: 0 | Scope Realist: 1 | Security: 1 | SRE: 2 | Data: 0 | Product: 0

(Some advisories were flagged by multiple roles; counts above tally each finding once per role that surfaced it.)

## Cross-cutting Notes

- The spec respects the design's hard constraints (mm internally, no PDF lib, no backend, no canvas, geometry in pure functions).
- All sub-specs include `[STRUCTURAL]` and at least one `[BEHAVIORAL]` or `[INTEGRATION]` criterion.
- Dependency graph is acyclic and forms a clean DAG. SS-10 is the integration sink.
- Test coverage for unit-testable layers (utils, geometry, validation, localStorage) is explicit. UI integration tests come in SS-06 and SS-10.
