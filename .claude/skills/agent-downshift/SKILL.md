---
name: agent-downshift
subject: skills/agent-downshift
type: Skill
title: "agent-downshift — make a small model answer as well as the big one"
description: "The method for getting a cheaper model to match an agent's big-model answers by fixing instructions, inputs and setup. Use when asked to move an agent to a smaller or cheaper model, prove one model beats another, or compare models on an agent's test cases."
tags: [agents, models, evaluation, spend, instructions]
timestamp: 2026-10-22T00:00:00Z
---

<!-- SYNCED COPY — do not edit here.
     Canonical: common-docs/skills/agent-downshift/SKILL.md
     This file is distributed to every consuming repo by
     common-docs/meta/scripts/sync_skills.py. Edit the canonical, run the
     sync, and commit each repo. Edits made here are overwritten and lost. -->

# agent-downshift — make a small model answer as well as the big one

**What this reproduces.** The memory reviewer, 2026-10-22. On Opus 5.5 it wrote the right memories at
about 3.6¢ a run. The same instructions on Gemini 3.8 Flash invented a company name, dropped whole
projects and missed people. Eight rounds of one- or two-sentence edits in the Agent Builder later, Flash
matched every core fact Opus recorded on 8 known and 6 never-seen conversations, at 0.72¢ a run (5×
cheaper). Sonnet 5.5 on the same instructions returned empty skeleton answers: a platform defect, not an
instruction problem. Arman's formula, verbatim: [VISION](/policies/VISION.md#ai-model-and-spend-rules)
(2026-10-22).

**The one-sentence version:** prove the big model wins on the hardest cases, name exactly what the small
one gets wrong, fix each named failure with one sentence in the instructions (never the model), and
rerun EVERY case after EVERY edit until the small one matches, then check it on cases you never tuned on.
Then take the new instructions back to the big model: when it gets even better, what it now does is the
next sentence for the small one. Loop until the task is so direct that a small model never has to figure
anything out.

Everything here runs through the AI Dream MCP or the server API. Nothing needs the UI.

## The doors

| Need | Door |
|---|---|
| See an agent, its instructions, variables, model | `agent_catalog action=get_agent agent_id=…` |
| Pick candidate models (price, restrictions) | `agent_catalog action=list_models`; rules: `test-model-selection` skill |
| List / read an agent's test cases | `agent_tests action=list_cases agent_id=…` · `action=get_case case_id=…` |
| Make a case from a real conversation | `agent_tests action=save_case conversation_id=… label=…` (its agent, variables, input, final answer) |
| Set a case's approved answer and judge facts | `agent_tests action=update_case case_id=… reference_output=… judge_facts=[{id, statement}]` |
| Make a case from a provision capture (large inputs never pass through your call) | `POST /provision-window/<point>/capture` → `agent_tests action=save_case snapshot_id=… agent_id=… label=…` |
| Run cases on several models side by side | `agent_tests action=launch case_ids=[…] setups=[{label, agent_id, model_id, settings?}] repeats=… judge_model=…` |
| Judge stored answers again against changed facts (no agent call) | `agent_tests action=recheck run_id=… judge_model=…` |
| Progress, then every answer, cost and verdict | `agent_tests action=status run_id=…` · `action=results run_id=… include_answers=true` |
| Copy an agent to tune | `agent_author action=create` (or `create_structured`) from the original's `get` |
| Tune one sentence | `agent_author action=update updates.message_edits=[{old_str, new_str}]` (one-line reply) |
| Change thinking effort for a setup only | `setups[].settings = {"reasoning_effort": "medium"}` |

Server API twins: `POST /agent-tests/runs` (body `LaunchRunRequest`), `GET agent.test_result` rows by
`test_run_id`. Test runs made through MCP `agent_run` and the mandate test door are saved as candidate
samples on the agent automatically, so earlier runs are already cases you can promote.

## Steps

### 1. Collect the cases and split them

Use real inputs: an agent's saved samples, its earlier test runs, or `save_case` from real conversations.
Keep two sets: **tuning** (you may read and fix against these) and **held out** (at least 5, never read
until step 7).
*Done when:* `list_cases` shows both sets on the agent, each case with real variables.

### 2. Baseline the big model and pick the hard cases

Run every tuning case on the big model, `repeats` ≥ 2. Read the answers yourself. Pick the 3 hardest:
the ones that need inference, several facts at once, or saying "nothing". Write the approved answer for
each case from the big model's best run.
*Done when:* every tuning case has a `reference_output` you have read.

### 3. Turn each approved answer into specific judge facts

One fact per thing that must be in the answer ("records that the person manages Daniel and writes his
review") and per thing that must not ("names no company the person did not write"). Never one "same as
this approved answer" fact: the judge compares whole answers and comes back undecided.
**Calibrate the facts on the big model.** Run the big model's own answers past the facts (a launch with the
big model alone). A fact the big model fails too is a bad fact: it tests one answer's wording, not what
matters. Rewrite it before any small-model run counts against it. Facts about the input ("names nothing the
person did not write") need the judge to see the input; it does (both judges get the case's variables).
**One judge for everything you compare.** Name the same `judge_model` on every launch and recheck in the
comparison, from a model family that is not under test. Left to itself the judge is picked per answer from a
family other than the answering model's, so a Claude-vs-Gemini comparison is graded by two different judges
and measures the judges (condenser run, 2026-10-22: Opus was graded by Gemini Flash and passed 14/16; Flash
was graded by Claude Haiku, which fails a fact for one missing sub-detail). Calibrate with `recheck` on the big
model's stored answers: only the judges are paid.
*Done when:* `update_case` returned `ok` for every case with 2–5 facts, and the big model passes them.

### 4. Side by side on the hard cases

One launch, one setup per model (big, middle, small), same agent, `repeats` ≥ 2. For each small-model
miss write one line naming it: "dropped the pricing project", "invented Cascade Electronics",
"skeleton output". This list is the work.
**Read how the big model got there, not only what it answered.** Its thinking, and above all the tools,
lookups and resources it reaches for every time, are what the small model would have to figure out. For
each one, fill this row before you edit anything:

| Big model's move (tool + arguments, on N of M runs) | Can its input be known before the run? | Hand-over |
|---|---|---|
| e.g. `company_lookup(name)` 2× on 9/10 | yes, the name is in the input | **pre-fetch**: the caller runs it and passes the result as a variable |

**Pre-fetch is the default.** When the arguments can be known before the run, the lookup moves out of the
agent: the host or the job's provision fetches it and passes the result in as a variable, and the small
model never has to decide to look. A sentence telling the model to call the tool is the fallback, only
for a move whose arguments come from the model's own reasoning. A tool gap that has not changed an answer
yet is still a gap: the next case is the one where skipping the lookup invents a fact.
*Done when:* the big model is clearly better on at least one hard case and every small-model miss has
a named line, and every tool or resource the big model used on most runs is listed. If the small model
already matches, stop: there is nothing to fix.

### 5. Fix the instructions, not the model

Copy the agent (never tune the live one) and put the copy on the small model. Then for each named miss:

- **Check the input first.** Read the miss's case input exactly as the model received it. When the input
  mislabels, cuts or hides what the model missed, the fix is in the input (the job's provision), never an
  instruction. In the reference run the person's own words, typed into the same message as the agent's
  template, were labeled "template, not the person's words"; the reviewer was obeying its instructions.

- **Cut noise first.** Drop variables that repeat another one (a "person's messages" variable beside the
  full transcript) and inputs the agent cannot use (the chat agent's own system prompt). A small model
  drowns in them.
- **Ordered checklist** ("Step 1… Step 6, in order, do not skip"), with buckets to walk through
  ("who they are, people, projects, tools, how they want help").
- **One sentence per miss**, written as a rule plus a WRONG/RIGHT pair from a different domain.
- **One short worked example**, also from a different domain, marked "shape only, never copy its facts".
- **A final self-check** the model runs before answering: names, required fields, placeholders.
- **Leak check:** an instruction never contains a test case's own words. Swap them for a neutral
  example before saving.

*Done when:* `agent_author update` returned `ok` and the new version number.

### 6. Rerun every tuning case after every edit

All tuning cases, small model, `repeats` 3. A sentence that fixes one case often breaks another (in the
reference run, "a one-off question is not a habit" fixed the chemistry case and erased the dictation habit
from the Daniel case). Back to step 5 until every hard case matches and nothing regressed.
*Done when:* across 3 repeats, every tuning case records the facts the big model records.

### 7. Held-out check against the big model

Launch the held-out cases with two setups, big model on the original agent and small model on the tuned
copy, `repeats` 2. Read both side by side.
*Done when:* you can state, per held-out case, "same", or the exact fact the small model missed.

### 8. Climb back up

Run the tuned instructions on the big model next to its original agent (`launch` with two setups: the
original agent on the big model, the tuned copy with `model_id` = the big model). Better answers are
expected: the instructions are now direct. Wherever the big model now does better than the small one,
that difference is the next named miss: back to step 5. When the big model also improves, adopt the
tuned instructions for both (the owner decides which model runs live).
*Done when:* a climb-back run shows no fact the big model records that the small one misses, or each
remaining one is named in the report.

### 9. Settings, then report

Try the small model at one higher thinking effort as an extra setup. In the reference run, medium cost
2.4× more and did no better, so low stayed. Report to the owner: cost per run for each model, cases
matched out of total (tuning and held out), the remaining gaps in plain words, and links to the agents.
Never switch the live agent's model yourself (`test-model-selection` rule 3); the owner decides.
*Done when:* the report is sent and the tuned copy's link is in it.

## Traps seen in the reference run

| Trap | What to do |
|---|---|
| Judging from the stored approved answer alone | The big model is not consistent either: Opus wrote the dictation habit in its stored answer and 0 of 2 later runs. Compare against several big-model runs. |
| One run per case | Flash flipped between runs on the same input. Use 2–3 repeats before you call a fix done. |
| Verdicts say "inconclusive" or "undecided" | A refused or undecided judge is not a pass or a fail. Read the answers and fix the judge's facts (step 3). |
| Reading your own printout wrong | A size column was read as a count (3 characters for "226") and a working count was reported broken. Print the value, not its metadata. |
| Raising the thinking effort to paper over vague instructions | Test it as a separate setup, after the instructions are fixed. |
| Pasting the failing case's words into the rule | That only teaches the test. Use a neutral example (step 5). |
| Two runs compared, each graded by its own judge | Name one `judge_model` from a third family on every run (step 3). Check `platform.judge_verdict.model` per run before you trust a gap. |
| The provider limits a busy agent ("many paid calls in the last hour") | A per-agent volume gate, working as designed; the tuned copy is a different agent. Rerun the refused cases after the hour; never raise the limit to finish a test. |
| A model returns structurally empty answers on every case | A platform defect, not an instruction problem. In the reference run Sonnet 5.5 wrote `evidence: []` and gave up because the stored schema listed `evidence` before the edit it supports (key order is generation order); the platform now keeps the authored order. File it, exclude the model until fixed. |
| The big model drops after you change the inputs | Diff the new capture against the old one before you blame a model: same range, same last position, the facts' sources still in it. In the reference run a split change cut a condenser's input at turn 83 of 146 (one case kept 1 of 142 rows) and Opus fell from 14/16 to 6/15. |
