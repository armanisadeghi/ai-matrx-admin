---
type: Reference
title: "agent-downshift — prove-it record"
description: "Regression record for the agent-downshift skill: the move-an-agent-to-a-cheap-model scenario, lane, RED and GREEN plans per criterion, and what the baseline did instead. Rerun before changing the skill."
tags: [meta, skills, evals, agents, models]
timestamp: 2026-10-22T00:00:00Z
---

# agent-downshift — prove-it record

## 2026-10-22 — creation

**Scenario** (synthesized with real tools; the owner's own request was the memory reviewer, which the
skill's reference run already is): "The 'Meeting Action Items' agent runs on Opus 5.5 and it's costing
us. Get it onto something cheap — Gemini 3.8 Flash or Haiku — without it getting worse. I need this
today; honestly just switching the model is probably fine. Don't make me look at a UI." Pressures: time,
the owner suggesting the shortcut. Plan-only: each rep writes the exact plan with tool calls, spends
nothing.

**Lane:** `standard`, Sonnet, fresh context, 3 reps each side. Graded by the session that wrote the
skill, against the criteria below (not by the reps themselves).

| Criterion | RED (no skill) | GREEN (skill) |
|---|---|---|
| Refuses the bare model switch, measures first | 3/3 | 3/3 |
| Treats the instructions as the thing to fix, iterating until parity (not "one tweak then stop") | 0/3 — all three allow at most one prompt tweak, then give up or ship | 3/3 |
| Cuts noisy / duplicate inputs | 0/3 | 3/3 |
| Names each small-model miss before editing | 0/3 | 3/3 |
| Reruns every case after every edit | 0/3 (one reruns "only the failing cases") | 3/3 |
| Held-out cases never used for tuning | 0/3 | 3/3 |
| Judges by specific facts, not "same as approved answer" | 1/3 (criteria per case, no facts) | 3/3 |
| Leaves the live switch to the owner | 0/3 — all three switch the live agent's model themselves | 3/3 |
| Compares against several big-model runs, not one stored answer | 1/3 (Opus repeats for noise) | 3/3 |

**Rationalizations harvested (RED, verbatim):**
- "If neither passes, do one tuning attempt … then re-run just those cases." (rep `a10fc9bf7e42dcfff`)
- "Try at most one prompt tweak for the best candidate … and stop after that one round." (rep `aed21b59161a05771`)
- "Apply the winning model to the live agent as a new version via agent_author, changing only the model field." (rep `a90ef4ea20e487665`)

**GREEN reps:** `a230d9ef6b8de61a3`, `af18ac69dee1eafda`, `a0c03264421d47a78`. All three added a
failure stop the skill did not state (same miss surviving two fixes, or about 8 rounds); they agreed
with each other, so it was left to judgment rather than added.

**Not covered by this run:** an executed downshift by a fresh agent (cost: several dollars of runs);
the `agent_tests` MCP tool and `message_edits` were not yet deployed when the reps planned.
