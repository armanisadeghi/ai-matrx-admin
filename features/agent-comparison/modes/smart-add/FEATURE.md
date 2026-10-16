# Smart Add truth bench (`/agents/battle/smart-add`)

A battle mode that answers one question with real data: **for a brand the person knows, which system
tells its own presence from everything else best — measured against the person's truth, not against
anyone's confidence.** Arman, 2026-10-16: "the key is not to look at confidence but rather truth."

## Flow

1. **A brand you know** — website, name, place, known accounts. Every system sees only these facts.
2. **The net** — searches (suggested: the name, the name in its place, the domain, the name on social and
   review sites), Google and Brave, 1–5 pages each, merged into unique results (`model.mergeResults`,
   one address per result via `normalizeUrl`; every sighting kept).
3. **Who judges** — Today's AI (the holder of `brand_intake.web_result_classifier`, run in batches of 25 as
   production does), Jev (its decision version, one result per call), and optionally the Reference (today's
   holder on Opus 5.5). Every judgment is ONE real agent run through the server matrix runner.
4. **Mark the truth** — blind, in the canonical `SearchReviewBody` (Ours / About us / Not us). No system's
   answer is shown while marking.
5. **Scoreboard** — per system: right / wrong / can't tell against the marks, stranger marked ours, us
   marked not us, typical and slow call time, calls, cost; then every result some system got wrong.

## Where things live

| Concern | Where |
|---|---|
| Battle row | `agent.cmp_comparison_sets`, `metadata.mode = "matrix"` (the server runner reads it) + `metadata.smart_add_bench` (brand, searches, results, frozen stances, truth) |
| Cells | `agent.cmp_comparison_entries` via `/agent-battles/{set}/run`: item rows × Jev, batch rows × holder / reference (`model.cellsToRun`; batches queue first) |
| Jev's answers | the decision answer store (`platform.judge_verdict`, `loadJevAnswers`) by run conversation |
| Truth | `smart_add_bench.truth` (guarded merge) AND a human label on Jev's `stance` answer (`labelConversations`) so it feeds `/agents/<id>/answers/calibration` |
| Mapping | today's labels → ours / about us / not us by `web.brand_relation_kind.stance` (frozen at run time); `needs_person` / `maybe` = can't tell |

Judges are resolved from data at run time and recorded on the bench (`smart_add_bench.agents`): today's
holder = the default holder of mandate `brand_intake.web_result_classifier`; Jev = the agent tagged
`smart-add, jev, decision, web-result` (questions `kind` — the 35 relation keys + needs_person — and
`stance`); the reference = today's holder on a model the person picks in `ModelListDropdown`. A bench saved
before this reads its judges from the battle's own columns.

Fair-play notes: every system gets the same plain result (title, address, snippet, engine, rank) — the
production fixed-rules hint is server-only and is not added. Today's AI sees 25 results per call as in
production; Jev sees one.

## Change log

- 2026-10-16 — review fixes: no agent ids in code (judges from the mandate and tags), reference model picked,
  "Judged by" links after a run, durations in ms/s, a No answer column, phone-width table, a failed mark save
  rolls back, complete-list reads through `readAllRows`. Open: clearing a mark leaves its calibration label on
  Jev's answer; Later / Ignore are not kept.

- 2026-10-16 — created: wide net, blind truth, scoreboard; Jev answers read from the answer store
  (the matrix runner's own `answer` was empty for decision agents — fixed server-side the same day).
