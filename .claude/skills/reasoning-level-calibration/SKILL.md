---
name: reasoning-level-calibration
subject: policies/ai-model-and-spend-rules
type: Skill
title: "reasoning-level-calibration — set an agent's reasoning effort by need, prove it with real runs"
description: "Method for choosing and auditing an agent's reasoning_effort. Use when setting or reviewing reasoning_effort, when an agent was created with high, or when asked to cut reasoning spend. NOT for changing an agent's model (use test-model-selection)."
tags: [agents, reasoning-effort, spend, calibration]
timestamp: 2026-10-16T00:00:00Z
---

<!-- SYNCED COPY — do not edit here.
     Canonical: common-docs/skills/reasoning-level-calibration/SKILL.md
     This file is distributed to every consuming repo by
     common-docs/meta/scripts/sync_skills.py. Edit the canonical, run the
     sync, and commit each repo. Edits made here are overwritten and lost. -->

# reasoning-level-calibration

**Decision first.** The default is `low`. Move up only with a reason you can name from the agent's prompt, and prove any change with real runs before it stays. Effort is one setting; the model is a different decision and this skill never changes it.

## 1. The levels

| Level | Use it when | Examples |
|---|---|---|
| `low` (default) | The task is straightforward: extract, classify, format, route, rewrite, apply a supplied rubric or rulebook, write from supplied content. The answer is mostly in the input. | Meet Wrap-Up Composer, Site Editor |
| `medium` | The task is not straightforward and needs reasoning beyond the basics: calibrated scoring against anchors, several interacting constraints, judgment a miss would visibly spoil. Still bounded and checked downstream. | Newsworthiness Check, Workflow Shape Component Builder |
| `high` | Rare. Open-ended hard reasoning where one miss cascades into many downstream things: adversarial appraisal, structure other agents inherit, orchestration with authority to refuse. Arman tunes these himself. | Do not set it on your own; propose it |
| `very_high` | A scorer label only, not a setting. It maps to `high`. | none set directly |

Opus and Sonnet think as much as the task needs. `high` on a simple task is a pure waste. Run counts are meaningless until test runs are removed: about 90 percent of runs are tests.

## 2. Hard rules

1. **Never touch an agent created by arman@armansadeghi.com** (user id `4cf62e4e-2679-484f-b652-034e697418df`). Check `created_by` before every write. You may score his agents and report the gap; you may not change them.
2. **Effort calibration never changes the model.** Model and effort are separate decisions. Never swap a model down for cost without Arman's say. Premium stays when the agent:
   - does extremely high-level intellectual work;
   - has ripple effects into many other AI processes (a goal writer feeds 50 agents, 200 runs a day);
   - is specialized and only triggered by a human doing a specialized task;
   - is guaranteed one-shot with short output, so cost is bounded anyway;
   - was purpose-built with high-quality analysis and detail.
3. **Anything that creates agents or sits in that flow is never Sonnet.**
4. **Show, then change, when the change is a model.** For effort, the A/B in section 5 is the show.

## 3. Score a batch (Sonnet scorer)

Dispatch a Sonnet subagent per slice of about 40 agents. Give it each agent's name, model, system and user messages, tools, output schema and current effort. Scoring is about the task, not the agent's current setting.

Scorer prompt, verbatim:

> For each agent, judge what the TASK needs, from its prompt and tools. Score exactly one of: low, medium, high, very_high. low: extraction, classification, formatting, routing, rewriting, applying a supplied rubric. medium: judgment against several interacting constraints or calibrated anchors, bounded and checked downstream. high: open-ended hard reasoning where a miss cascades into other work (adversarial appraisal, structures others inherit, orchestration with authority to refuse). very_high: reserved for the extreme; almost never. Ignore the agent's current effort and its model. Test agents, copies and numbered duplicates are scored by their prompt like any other. Return one JSON row per agent: id, score, confidence 0 to 1, a one-sentence reason naming the task feature that drove the score, is_test_or_copy. No prose outside the JSON.

Sonnet over-votes, so apply the mapping:

| Scorer says | Set effort to |
|---|---|
| low | low |
| medium | low |
| high | medium |
| very_high | high |

Then review the 15 highest-scored agents by hand against their reasons before applying. A score is an opinion until section 5 backs it.

Rows go in a scores file; its format is in [scores-format.md](scores-format.md). Keep scores files uncommitted unless the owner asks.

## 4. Apply the change

Re-query the live row first (`created_by`, current effort), then write with a provenance tag so the version trail says who and why. Each update writes a new agent version.

```sql
with s as (select set_config('app.actor_system','claude-code:<change-name>-<date>',true))
update agent.definition d
set settings = jsonb_set(d.settings,'{reasoning_effort}','"low"')
from s
where d.id = '<agent_id>'
  and d.created_by is distinct from '4cf62e4e-2679-484f-b652-034e697418df'
returning d.version, d.settings->>'reasoning_effort', d.updated_by_system;
```

Done when: `returning` shows the new version and your tag, and `agent.definition_version` has a row for that version with the same effort. Use SQL, not `agent_author update`: the MCP call echoes the whole agent (about 7,000 tokens) every time.

## 5. A/B spot-check (do this on every change that stays)

Pick 3 to 5 agents per batch, the ones where being wrong costs most (highest scores, most runs, tool users).

1. **Find a real input.** `chat.user_request` rows for the agent (`agent_id`, `status='completed'`), then `chat.message` for its `conversation_id`, role `user`, position 0. Runs filed with a null `conversation_id` (workflow children) are found by `chat.message.agent_id` and the conversation of its assistant message. Rebuild the variables from the `{{variable}}` template.
2. **Skip an agent when** it has no reusable input, or it writes platform data on a run (a component builder, a CMS publisher). A read-only or refusal-path input is fine; state which you used. If every stored input is trivial (silent meetings), add one constructed input with a real trap in it and label it constructed.
3. **Run at the new level, then at `high`, same model, same input**, through `agent_run` (the canonical path; never a raw provider call). `agent_run` has no per-run effort override, so flip the setting with the section 4 SQL, run, and restore. Do the steps one at a time: running `agent_run` and the restore in the same batch races, and the run lands on the wrong version (it happened on 2026-10-16).
4. **Prove which level each run used.** `chat.user_request.agent_version_id` joins to `agent.definition_version`; read `settings->>'reasoning_effort'` there. Pull `total_duration_ms`, `total_cost`, `total_output_tokens`, `total_tool_calls` from the same row.
5. **Compare** the items and verdicts (same ones out, anything missing or wrong), the mandatory steps of its own prompt (did a numbered step get skipped), tokens, latency and cost.
6. **Restore, then re-query**: the agent's live effort equals the new level. Spend limit for a batch is set by the owner.
7. **Verdict per agent:** "new level is fine" or "needs one step up". Step up only when the level's output is wrong on the decision, drops an item, or skips a mandatory step on more than one of two runs. One run each is a hint, not proof; same level varies run to run (Newsworthiness Check scored 4 then 2 at medium). If it needs a step up, apply it with the section 4 SQL and write why in the change tag.

## 6. Red flags

- "It scored high, so set high." Map it first (section 3).
- "The agent is on Opus, so lower it to Sonnet too." Rule 2.
- "I will just change this one of Arman's." Rule 1.
- "Both levels gave the same answer once, so done." Run twice where a wrong answer is visible.
- "I'll restore the effort later." Restore in the same sitting and re-query.

## Evidence

[evals.md](evals.md) holds the 2026-10-16 spot-check this method came from.
