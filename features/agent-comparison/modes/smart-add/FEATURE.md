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

## Real round tab

The second tab answers the same question for the judgments a Smart Add ROUND makes: **is this account
ours** (`identity_match_1..5`, mandate `brand_intake.identity_match_decision`), **business or person**
(`entity_kind`, `brand_intake.entity_kind_decision`) and **we think** (`we_think`, `brand_intake.we_think`).

1. **One real round** — `startSystemRun(…, "smart_add_brand_identify", …)` with the inputs Smart Add sends after
   the person confirmed their own name, site and accounts (`round-model.roundInputs`). The battle row is filed at
   once (`metadata.smart_add_bench.kind = "round"`), so the page can close while the round runs.
2. **Capture** — once `workflow.run.status` is final, the judgment steps are read from `workflow.node_events`
   (status, `duration_ms`, conversation, cost, output) and each holder conversation's
   `chat.conversation.variables` — the exact variables today's holder got. Items: one per identity step, one
   entity, one per we-think candidate (`variables.candidates.items`). A failed holder step (e.g. its spend
   approval) still yields its item: Jev replays it; today's AI shows "No answer".
3. **Jev** — each item runs its Jev agent (tags `smart-add, jev, decision, identity-match | entity-kind | we-think`)
   on the matrix runner: rows carry `agent_id` + variables, one `jev` column. Identity and entity variables are
   the holder's own; we think gets `brand_context` (the holder's three facts) + one candidate as `item`.
   Answers: the cell's `decision_answers` JSON, else `platform.judge_verdict` by conversation.
4. **Truth, blind** — identity ours / not ours (+ relation from Jev's `relation` keys), entity business / person /
   both, we think ours / not us / related / ask later. Saved on the bench and labeled onto Jev's answer
   (`is_this_us` true/false, `relation`, `entity_kind`, `verdict`).
5. **Scoreboard per judgment** — right / wrong / can't tell / no answer, two costly misses each, typical and slow
   call, calls, cost. Jev's yes/no is P(yes) cut at 0.65 / 0.35; preferred and alias count as ours; ask later is
   right only when the truth is ask later. Today's AI's we-think is ONE call for every candidate, so its calls
   and cost are per round, Jev's per candidate.

Robustness: the capture is claimed inside the guarded metadata write (a second page never starts Jev twice);
items Jev never started get a "Run Jev on them" action; a step whose inputs cannot be read is counted as
"steps unreadable", never dropped silently; a mark made before Jev answers is labeled when the answer lands.
Jev agents are found through the canonical scoped list (`agx_list_scoped`, tag filter), never a raw list query.

Which steps run is the round's own decision: identity runs only on accounts the we-think guard left open,
entity only when the fixed person-or-business rules are weak — a judgment that did not run says so.

## Where things live

| Concern | Where |
|---|---|
| Battle row | `agent.cmp_comparison_sets`, `metadata.mode = "matrix"` (the server runner reads it) + `metadata.smart_add_bench` (brand, searches, results, frozen stances, truth) |
| Cells | `agent.cmp_comparison_entries` via `/agent-battles/{set}/run`: item rows × Jev, batch rows × holder / reference (`model.cellsToRun`; batches queue first) |
| Jev's answers | the decision answer store (`platform.judge_verdict`, `loadJevAnswers`) by run conversation |
| Truth | `smart_add_bench.truth` (guarded merge) AND a human label on Jev's `stance` answer (`labelConversations`) so it feeds `/agents/<id>/answers/calibration` |
| Mapping | today's labels → ours / about us / not us by `web.brand_relation_kind.stance` (frozen at run time); `needs_person` / `maybe` = can't tell |

Judges are resolved from data at run time and recorded on the bench (`smart_add_bench.agents`): today's
holder = the default holder of mandate `brand_intake.web_result_classifier`; Jev = the agent the person
picks in the canonical `AgentListDropdown`, pre-filled from their own last bench ("Smart Add · Web result,
about us? (Jev)": questions `kind` — the 35 relation keys + needs_person — and `stance`); the reference = today's holder on a model the person picks in `ModelListDropdown`. A bench saved
before this reads its judges from the battle's own columns.

Fair-play notes: every system gets the same plain result (title, address, snippet, engine, rank) — the
production fixed-rules hint is server-only and is not added. Today's AI sees 25 results per call as in
production; Jev sees one.

## Change log

- 2026-10-16 — the four Jev judges are SYSTEM agents (builtin, Matrx System org, created through the
  agent-definition funnel with owner=None; the personal copies are archived). The Jev picker opens on the
  System tab; the Real round tab looks them up in the system lane.

- 2026-10-16 — Real round tab: one real Smart Add round, its identity / entity / we-think judgments replayed
  through Jev, blind truth, per-judgment scoreboard (`round-model.ts`, `round-service.ts`, `SmartAddRoundPage`).
  Open: clearing a mark leaves its label on Jev's answer (no unlabel door); not yet walked on localhost.

- 2026-10-16 — review fixes: no agent ids in code (judges from the mandate and tags), reference model picked,
  "Judged by" links after a run, durations in ms/s, a No answer column, phone-width table, a failed mark save
  rolls back, complete-list reads through `readAllRows`. Open: clearing a mark leaves its calibration label on
  Jev's answer; Later / Ignore are not kept.

- 2026-10-16 — created: wide net, blind truth, scoreboard; Jev answers read from the answer store
  (the matrix runner's own `answer` was empty for decision agents — fixed server-side the same day).
