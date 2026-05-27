
## 2026-05-26 — Toggleable piece labels (efd4350)
## 2026-05-26 — Rotate labels on narrow pieces (9a866fb)
## 2026-05-26 — Shared engine legend (147aa36)
## 2026-05-26 — Construction-steps panel on roll-top page (bcc2317)

## 2026-05-26 — Roll-top SA swap + expanded build instructions
- Symptom 1: Top/bottom SA values were swapped in buildPattern — e0 (top edge) got DEFAULT_BOTTOM_SEAM_MM (9.5 mm) and e2 (bottom) got DEFAULT_TOP_HEM_MM (25.4 mm). Preview showed visibly asymmetric SA polygon ("uneven hem").
- Symptom 2: Six-step instructions were too thin for users actually building the sack — French seam was a single step with no orientation cues, no marking step, no materials list, no buckle assembly detail.
- Fix:
  - Swapped e0/e2 SA assignments; added a comment block naming each edge so future edits can't reintroduce the bug.
  - Expanded steps from 6 to 13 across 5 groups (Preparation, Cutting, Construction, Closure, Finish). French seam split into three explicit phases (pass 1 / trim+press / pass 2) so the wrong-side-then-right-side reversal is unambiguous. Buckle assembly broken out from webbing attach. Materials step lists actual quantities derived from cut dimensions. Final step includes a roll-test paragraph.
  - Test asserting the old combined `french-seam-sides` id updated to assert the two new pass ids.
- Surfaces: src/generators/roll-top-sack/buildPattern.ts, src/generators/roll-top-sack/__tests__/buildPattern.test.ts.
- Watch: Step IDs are part of the public API (used as dependsOn references and as test fixtures). Renaming a step requires updating both the dependsOn chain and the test assertions.
- Commit: <pending>
