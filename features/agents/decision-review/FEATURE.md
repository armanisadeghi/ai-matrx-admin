# FEATURE — Decision review (client)

Review queue and calibration view for decision agents. Server half, the store and the capture:
aidream `aidream/services/decision_review/FEATURE.md` (one `platform.judge_verdict` row per
answered question, `subject_kind = 'decision_answer'`, inserted by one DB writer from chat, workflow
Decide steps (with `workflow_run_id` / `workflow_node_id` in metadata) and `/ai/decisions`).

| Route | Component |
|---|---|
| `/agents/<id>/answers` | `components/ReviewQueue.tsx` — lowest confidence first; filters status/question/method/model/version; `j`/`k` move, `s` skip, `1–9` pick an option, `y`/`n` on yes-or-no |
| `/decisions/review` | the same `ReviewQueue` with no agent — every decision item in the person's organizations (declared scope: their memberships, never RLS alone), a Source filter (Agent / Workflow / API model, `?source=` preselects), a source tag on each row; workflow items link to their run, agent items to that agent's queue, "Agent calibration" opens the selected agent's calibration |
| `/agents/<id>/answers/calibration` | `components/CalibrationView.tsx` — two tabs. **Human labels**: table per version × question (right, stated, Brier, calibration error, kappa or "N of <knob> labels", threshold for the target precision), then the selected row's `ReliabilityCurve` + bins, and beside it (never merged) the same group's agreement with the reference model. **Reference check (AI)**: `components/ReferenceCheck.tsx` |

## Reference check (`components/ReferenceCheck.tsx`, `reference.ts`)

A reference model (the `agents.decision_review.reference_model` knob, server side) answers the same
question on the same judged state as a saved answer; the result is a second opinion, never a label.

- Controls: question, version (sampled by `agent_version_id`), item count (default 10, capped by the
  server's `reference_batch_max`), Only unlabeled, Skip checked → **Estimate** (`quote_only`: count,
  model, estimated cost and its retry-bounded max, already-checked, in another run, unreadable input
  with reasons in the tooltip; the stepper's max is the quote's `max_items`, the organization's cap)
  → **Run · $x** (the button states the cost; the run sends the quote's exact `item_ids`, with
  `rerun` when it came from a re-check). Server: `POST /decision-review/agents/{id}/reference-runs`,
  called through `serverApi` with a hand-declared `OperationDescriptor` until `@ai-matrx/api`
  generates it (`service.ts`); the stream is `openStream` NDJSON of typed `data` payloads
  `decision_reference_run_started | _item | _item_failed | _run_done` (`applyRunEvent`).
- Durable: rows fill in live; the stream's request id is kept per tab (sessionStorage) and a reload
  mid-run rejoins through `/runtime/operations/{id}/rejoin` (`rejoinOperationThunk`); without it, the
  finished rows show from the table. A followed run is active from the first render
  (`useSyncExternalStore` over the stored id), so Estimate/Run stay off and a refresh never starts a
  second run; the server also claims every answer before paying, so another tab's run skips them.
- Rows: `platform.judge_verdict` `subject_kind = 'decision_reference'` (`subject_ref_id` = the item,
  `metadata.agent_id` = the agent, `metadata.status` pending | answered | unanswerable | failed with
  `metadata.reason`, `verdict` in the item's label vocabulary), read complete with `readAllRows`,
  newest per item, joined to their items. A stored refusal or failure shows with its reason after a
  reload (`storedFailure`), a stored claim as Checking; only answered rows agree or disagree. Order: disagreements, failures, pending,
  agreements; lowest decision-model confidence first (`orderReferenceRows`).
- Drill-in: the table's side panel (`detail.render`) — judged state (`JudgedState.tsx`, shared with
  the queue), both answers side by side through `DecisionAnswers`, label buttons and **Use reference
  answer** (`platform.label_decision_item`, as the person); `j`/`k` move, `1–9`/`y`/`n` label, `r`
  takes the reference's answer. A failed or unanswerable item shows its reason and **Re-check** (a new
  estimate with `rerun`, since a stored failure counts as checked).
- Reliability vs reference: each calibration group's `reference` block (n, agreement rate,
  unanswerable count, bins of
  the item's probability against "the reference agreed") — its own table + curve, titled AI.
- Every call carries the viewer's active organization (`ensureOrgId(null)`) — never the agent's.

- Reads: straight from `platform.judge_verdict` (RLS) and the judged user turn from `chat.message`
  (`service.ts`). The verbalized route's translator block is left out of the state.
- Writes: straight to the database as the person — `platform.label_decision_item(item, answer)` and,
  from the battle verdict column, `platform.label_decision_conversations(ids, question, answer)`
  (`service.ts`). Gated to members of the item's organization; the one vocabulary is
  `platform.normalize_decision_label`. The battle keeps its set-level `decision_verdicts` too.
- Server: `GET /decision-review/agents/{id}/calibration` (real computation) and
  `POST /decision-review/agents/{id}/reference-runs` (quote, or a streamed run).
- Source of an item (`queue.ts` `decisionSource`): a `workflow_run_id` in the metadata or a
  `workflow_node:` key → workflow; a `model:` key (`/ai/decisions`) → API model; else agent.
- Entry points to `/decisions/review`: "All answers" on every agent queue, "Review answers" on the
  Decision playground (`?source=model`), and Workflow Studio's decision block (`?source=workflow`).
- The answers reader is `@ai-matrx/agents/presentation/decision-answers` (one reader for this app
  and Workflow Studio).
- Entry points: `ReviewAnswersLink` in `AgentHeader` / `AgentRunHeader` (only when the agent's
  messages carry a `decision_questions` part) and on the battle Decisions panel.
- The answer card is the shared `../aidream/apps/shared/chat/src/agents/decision-answers/DecisionAnswers` primitive.
- Tests: `__tests__/queue.test.ts` (row reading, queue order, keyboard map),
  `__tests__/reference.test.ts` (answer display, order, money, quote, run events, reference block).

## Change Log
- 2026-09-26 — built (Claude Opus 5.5, standard lane).
- 2026-09-26 — labels moved off the Python server onto the gated RPCs (aidream migration 1195).
- 2026-09-26 — combined review queue `/decisions/review` (Claude Opus 5.5, standard lane).
- 2026-10-16 — reference check on the calibration page; calibration no longer sends the agent's organization (a non-member super admin was refused) (Claude Opus 5.5, standard lane).
- 2026-10-16 — reference check: stored statuses (refusals/failures survive a reload), live rows carry both distributions and the answering model, a followed run blocks Estimate from the first render, re-check sends `rerun`, quote shows in-flight / unreadable / max cost (Claude Opus 5.5, standard lane).
