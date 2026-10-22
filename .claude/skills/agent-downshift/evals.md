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

## 2026-10-22 — the loop back up (step 8) and pre-fetch-by-default (step 4)

**Why:** Arman, the same night: after the small model matches, take the new instructions back to the big
model and loop; what the big model keeps reaching for (tools, lookups) is what to hand the small one
([VISION](/policies/VISION.md#ai-model-and-spend-rules)).

**Scenario 2** (plan-only, same lane): the tuned Flash copy matches 10/10 tuning and 5/6 held-out; Opus
calls `company_lookup` twice and `web_search` once on 9 of 10 cases, Flash calls the lookup on about half
its runs; Arman: "Keep going until it's as good as it can be."

| Criterion | v1 (before the edit) | v2 (climb-back + "read how the big model got there") | v3 (+ pre-fetch default) |
|---|---|---|---|
| Takes the tuned instructions back to the big model | 0/3 | 3/3 | 3/3 |
| Fresh held-out cases once the old ones were read | 0/3 | 3/3 | 3/3 |
| Pre-fetches the lookup instead of "remember to call it" | 0/3 | 1.5/3 (two considered it, all wrote the sentence) | 3/3 |
| Treats a tool gap with no answer change yet as a gap | 2/3 (rep `a838c0a4e5f2dc27e`: "I do not chase tool-call parity for its own sake") | 3/3 | 3/3 |
| Leaves the live switch to the owner | 3/3 | 3/3 | 3/3 |

**Reps:** v1 `a838c0a4e5f2dc27e`, `af7dbed9af0e25ea4`, `aae157017d28cd5e8` · v2 `ab93001d5c2e14e24`,
`af0168bf38bd75430`, `a230bb986387133bc` · v3 `ace99d8cb1db80c1f`, `a33374a219d01b589`, `ad198acb802e9333e`.

**Form change the reps forced:** v2 stated the pre-fetch idea as one of three options ("a variable,
pre-fetched data, a sentence"); the reps picked the sentence. v3 makes it a required table row and states
pre-fetch as the default with the sentence as the named fallback (skill-authoring §3: omitted element →
required slot).

**Executed evidence (not plan-only):** the climb-back ran for real on the memory reviewer, run
`967cd9c8-770b-4675-b913-a360535d5f00`: Opus with the tuned instructions passed 16/16 specific-fact checks
on the 8 known cases where Opus with its original instructions passed 14/16, at 20% lower cost.

## 2026-10-22 — check the input first (step 5), calibrate facts on the big model (step 3)

**Why:** both came from the executed memory-reviewer run. The person's own words, typed into the same
message as the agent's template, were rendered as "template, not the person's words", so the reviewer
obeyed its instructions and ignored them; and five of seven fails in run `52b08432-…` were facts that Opus
itself failed (they tested one answer's wording).

**Scenario 3 (giveaway, discarded):** spelled out the mislabel and that Opus failed the fact too. RED
3/3 already passed (reps `a7a8f1ed9a6e01f3f`, `a793b1b721d7399ab`, `acbf51ddf664f585c`); GREEN 3/3
(`a4321738e0f0871a2`, `ac2c31971cceb99f2`, `ae2e636fe5567f561`). A scenario that names the cause proves
nothing — rewritten.

**Scenario 3b (what you actually see first):** only the failing facts and counts; the cause is
discoverable, not stated.

| Criterion | v3 (before) | v4 (this edit) |
|---|---|---|
| Reads the failing case's input before writing an instruction | 0/3 (all three go from "the answer omits it" straight to "add a sentence") | 3/3 |
| Runs the big model on the facts before counting a fact against the small one | 0/3 (all three only read a stored answer) | 3/3 |

**Reps:** v3 `aeed9577b7cdd1c0d`, `a2bd705cb66538c83`, `a9ca9accf7637772e` · v4 `ac49bb853ba7fc767`,
`a05fdba1211575465`, `acdc5eaba0df86017`.
