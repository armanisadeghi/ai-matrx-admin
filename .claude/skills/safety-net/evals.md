---
type: Reference
title: "safety-net — proof record"
description: "The RED/GREEN record skill-authoring §5 requires: real uses 2026-10-01 to 10-15, and the 2026-10-22 agent-path rewrite with its scenarios, trigger prompts and what is still owed."
tags: [testing, skill-eval, safety-net]
timestamp: 2026-10-22T00:00:00Z
---

# safety-net — evals

**Status: PROVEN IN ONE REAL USE (2026-10-01), formal 3-rep RED/GREEN still owed.** Written 2026-10-01 from Arman's brief (the client-side chat migration net) and
his correction the same day that these are real tests run by an agent, never automated ones.

The scenario this skill guards is a whole change, so a synthetic three-rep RED/GREEN run would cost
more than a real use. **The first real change dispatched with "use safety-net" is the eval.** The
owner of that change records here, per rep, with agent ids or transcript paths:

| Date | Change | Lane | Without skill (RED) — did the agent write tests first, dispatch a blind runner, plant a fault? | With skill (GREEN) — same three | Rationalizations harvested |
|---|---|---|---|---|---|
| 2026-10-01 | chat agent-runner real tests (PB-01…PB-08) before the package move; cutover net review | standard/opus builders, quick/sonnet runners, Fable owner | RED (observed, not a dispatched rep): the cutover net's own lanes wrote scripted walks authored by the builders of the features they check, ran them themselves, and no test was blind; the owner's own words: agents write tests after the change and tests they know will pass | GREEN: eight playbooks written first with sealed checks; fresh Sonnet runners given STEPS only; run 2 of PB-01 produced the exact line across 3 providers and FAILED honestly on two real defects; ~40 defects found in dry runs and runs (see operations/real-tests/chat/LEDGER.md), incl. the markdown-attachment body never reaching the model and a declined write landed through a server tool | "The existing test already covers this" (none); "I graded my own dry run" (builders repeatedly reported DONE_WITH_CONCERNS and did not grade — compliant); grader's own lapse: ran a fault proof on a dirty start state → rule added to SKILL.md §4 |

| 2026-10-02 | rerun of PB-01…PB-08 after the chat package move landed, with performance capture | quick/sonnet runners, Fable owner | — | GREEN on the product: PB-01 rerun PASS blind, exact line, inspector 0, with per-turn server cost/time and page-load numbers in the run file. RED on the method: eight runners dispatched at once; seven parked on the lane lock and ended their turn with no captures → §5 rule "the owner serialises, the runner never parks". Serial reruns then completed all eight (6 h wall, ~2.4M runner tokens): PB-01 PASS, PB-02 switch chain PASS, PB-03 A/B/C PASS + door D lost to a server drain (W-86), PB-04 6/7 + wording flaw (W-85), PB-05 1–5 PASS then the app crashed on a retired entity token (W-83, fixed in the package), PB-06 PASS, PB-07 access PASS + editor rows stamped with the owner (W-92), PB-08 line PASS + phone write bypassed the card (W-89). Five of seven runs were interrupted by other lanes' edits on the shared checkout (build errors, installs under the preview, a mode flip) — the run is INCONCLUSIVE at that step and resumed, never re-graded from memory. Mode: clone (page + :8200 + DB), live withdrawn. Harness-refused clicks (Share…, typing an email) are seeded by the coordinator through the product's own functions and the dialog line is marked UNTESTABLE | "I'll wait in the background and resume when notified" (a background wait dies with the turn) |

| 2026-10-15 | Rewrite: four scenarios (check / before / shipped / campaign), script ≠ playbook, §4a preflight, §4b FAIL classes, discovery-brief slots, no fixes from the weakness list, status words | RED: three real uses that day. GREEN: 3 `standard`/sonnet reps, one per real prompt, plan-only, with the rewritten skill | RED (observed in real sessions, not dispatched reps): **Smart Add brand intake** (transcript `~/.claude/projects/-Users-armanisadeghi-code/42cc1ad6-f105-4ef2-bc1f-62022feac587.jsonl`, 2026-10-15T19:50Z on): standing audit with no change, no scenario fit; brief leaked mandate keys and the bug-list path; 3 PB-01 runs INCONCLUSIVE (preview stopped, pane crashed twice), ~25 min / 320k tokens, no baseline. **Agent variables** (`…/83e1d50d-1b81-40f5-88fa-2c74263dc32d.jsonl`, 19:23Z on): net built after the change shipped; brief carried files; fixes citing W-01…W-22 pushed before any playbook; browser blocked by a stale-install build error blamed on another lane. **npm campaign** (`…/7417e220-604d-4679-8c4f-cd5be4f9bcbd.jsonl`, 10-10 to 10-15): the "safety net" was a self-grading Playwright suite with a fault env var; no weakness list, no sealed checks; red journeys called "stale tests" and edited; worker briefs carried one command line | GREEN, all 3 complied and cited sections: Smart Add rep (agent `abd5cfb574b8dbd5e`) chose A, wrote the five-slot brief withholding keys, ran §4a, stopped after two environment failures, classified the label mismatch as playbook-wrong with a ledger row; variables rep (`ad4868092bd178527`) chose C, claimed nothing about the shipped change, held the three CONFIRMED bugs until a run graded them, diagnosed GmailMark as a stale install; npm rep (`a1660b0d1200fffa6`) chose D, refused the smoke suite as the net, wrote a lane brief naming the skill and forbidding playbook edits, owner-dispatched after-runs. Gaps the reps raised were folded in (A/C loop, fault only on a passed playbook, commit timing in A/C, milestone, chain choice under the cap, person driving, extension/desktop, mixed report wording, crash with memory rules, agent fixes via the builder) | "Website safety net run.mjs all PASS before and after"; "stale tests, not app defects"; fixer brief citing W-ids before playbooks; "another lane's import" (stale install); "no change pending" (commit order improvised) |

The look-alike suites were renamed the same day (matrx-frontend `tests/smoke-journeys/`, `scripts/regression-bar/`) so the name points only at this skill.

**Trigger check, 2026-10-15 (new description; `researcher`/sonnet agent `ab6b3766593374528`, listing = every canonical skill's frontmatter):** 6/6 as designed. Should-fire: "check whether Smart Add actually works end to end right now" → safety-net; "set up testing before moving auth and orgs into a shared package" → safety-net; "the variables rebuild shipped with no tests, prove it works" → safety-net. Near-miss: "regression test for archived lists in search" → forcing-function-tests; "replacing the old notes table with the canonical records store" → safe-cutover; "a settings button doesn't save, fix it and add a test" → diagnose. Closest call: safe-cutover vs safety-net on a replacement.

> Note (2026-10-03): the rows above that say "Mode: clone" are historical. Arman ruled that real tests run on live as admin@admin.com; the clone is only for rehearsing destructive migrations.

## 2026-10-22 rewrite — the agent path (SKILL.md 478 → under 200 lines; method moved verbatim to net-method.md)

**Status: RED observed in real work; GREEN and the trigger check OWED.** The rewrite was made by a `deep`
worker lane that has no way to dispatch fresh reps, and an author never grades its own reps. The owner
of the rewrite dispatches the reps below and records each with its agent id.

RED (observed in real sessions and ledgers, not dispatched reps):
- General Chat used for tests (owner ruling 2026-10-17; `test-model-selection` §2b).
- Localhost used as the test bed (owner ruling 2026-10-18; HANDOFF "Rules that bit us").
- PB-08 fault row amended after its fault run; that proof no longer counted (core-chain LEDGER, 2026-10-20).
- PB-06 L2 graded PASS under an allow-list in a coordinator's brief (net-method §4, 2026-10-19).
- Grades taken on drifted fixtures (another session re-versioned PB-03 copies, 2026-10-19; fixture gate NB-2).
- Coordinator subagents ended with no output: children's completion notices never reached them (HANDOFF).

GREEN scenario (3 reps, `standard` lane, with the new skill installed, plan-only): "You just changed the
instructions of the routing-desk agent and added a `gate_code` variable bound from an organization
context item. Arman wants it live today. Prove it works." Pass = all three reps: name the live build
check and no localhost; pick a Haiku fixture or cheap agent, not General Chat; drift-check fixtures in
Safety Net Real Tests; write sealed rows (marker in the bound value, must-not on an unbound value,
identity row) and commit before any run; read `chat.request_snapshot` and the as-sent script; brief a
separate grader with no rulings; write the fault row first, plant blind, restore, re-check drift; save
a platform test case and a ledger row.

Trigger check (6 prompts to fresh agents with every canonical skill's frontmatter as the listing):
should fire — "I updated the SEO analyst's system prompt, make sure it still works"; "added the
records tool to the Test Data Agent"; "bound the brand_voice mandate to a new holder version".
Near-miss — "the settings page button doesn't save" (diagnose); "add a regression test for archived
lists in search" (forcing-function-tests); "make a new agent that writes blog intros" (create-agent first;
this skill after it runs).

| Date | Rep | Lane | Agent id / transcript | Result |
|---|---|---|---|---|
| | GREEN 1-3 | standard | owed | owed |
| | Trigger 1-6 | researcher | owed | owed |
