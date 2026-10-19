---
name: test-model-selection
subject: policies/ai-model-and-spend-rules
type: Skill
title: "test-model-selection — which model a coding agent tests with"
description: "Picks the model a coding agent uses when a test or browser check sends an AI call. Use when choosing a model for any test, UI check, bench, or agent run, or when a test names Opus, Sonnet, Fable, Astra, or any model by habit."
tags: [testing, models, spend, agents]
timestamp: 2026-10-10T00:00:00Z
---

<!-- SYNCED COPY — do not edit here.
     Canonical: common-docs/skills/test-model-selection/SKILL.md
     This file is distributed to every consuming repo by
     common-docs/meta/scripts/sync_skills.py. Edit the canonical, run the
     sync, and commit each repo. Edits made here are overwritten and lost. -->

# test-model-selection — which model a coding agent tests with

<!-- rules:stamp -->
> Rules from `common-docs/policies/ai-model-and-spend-rules.md` — edit there, never here (`python3 common-docs/meta/scripts/one_home.py --write`).

1. **Premium models (Opus, GPT-6 Astra, Fable, anything priced like them) think once.** One-shot answers where the model must really think, spoon-fed everything by a workflow whose other steps gather and prepare. Never an agentic loop, classification, relevance check, title, summary, short reply, tool picking, judging at volume or plumbing test.
2. **Fable is never chosen by an agent.** Arman alone moves something to Fable, only after everything else failed and the switch was tested extensively. The internal ceiling is Opus 5.5: Fable or Astra agents move to Opus 5.5 at most (or GPT-6.1 Sol). The model ladder for every agent we build is rule 12. Premium-priced classes are blocked by default; no agent sets the account override.
3. **Never swap a model down for cost without Arman.** Premium stays when the agent (a) does extremely high-level thinking, (b) ripples into many other AI processes (the goal writer), (c) is specialized and triggered by a human, (d) is guaranteed one-shot with short responses, or (e) was purpose-built with high-quality analysis. Show him the agent, runs per month, agentic or not, and links first. An agent Arman made on Opus is never touched (check who made it first); anything that creates agents is never Sonnet. Run counts mean nothing until test runs are removed (about 90% of runs are tests).
4. **Reasoning effort defaults to low**, medium only for non-straightforward tasks, high rarely and tuned by Arman (skill `reasoning-level-calibration`).
5. **A single run over $1 is approved by Arman after its first run**, before it runs again. Nothing he has not reviewed and approved runs at volume; test data never justifies repeat premium runs. Spend-approval enforcement is on: anything unapproved that is automated or agent-driven is blocked. Re-query live state before stating a fact about an approval or a run.
6. **A money-spending automation runs once, then stops and reports** (section 4). Asking permission is not approval. Held or blocked work is re-enabled only through one small watched test (cents to a few dollars, expected cost stated), never a bulk yes/no.
7. **No spend limits on provider consoles** (Anthropic, OpenAI); every limit lives in our own app. Plan and spend limits are never raised to unblock a test or a lane, because they bind every user on the plan: at a cap, stop and tell Arman.
8. **Real users' spend, even trial or free, is never blocked, capped or framed as a problem.** The spend war is on agent, test and system waste. Gate only what slips through the cracks (system, agents, test accounts, orphaned automation); a real user's own chats and scheduled tasks are theirs ("close all cracks"). A spend report separates real users (celebrate, never block) from agent, test and system spend (scrutinize); a test lane that spends cents where it once spent hundreds of dollars is the model of success.
9. **Hard provider costs (scrapers, data APIs, media fetches) are charged in points**, 20,000 points = $1 of our cost, gated like AI cost and visible in every usage view. Admins see the rate everywhere; users never see vendor names, credits or the rate, and user copy speaks in points or not at all. Any new paid provider integration goes through the points ledger and the gate. Provider bills are reconciled against points charged daily, weekly and monthly, and reconciliation is part of done.
10. **Safety and moderation settings sent to any AI provider default to the provider's absolute minimum**; a person choosing stricter is honored. Guard: aidream `scripts/check_minimum_safety.py`. Never propose or keep a stricter default "for safety" (Google BLOCK_NONE or OFF, person_generation allow_all, OpenAI image moderation low, FLUX safety_tolerance most permissive, Replicate safety checker off).
11. **An automation never runs without its core data present and says plainly what is required** (no silent failure); missing expert data is shown, never hidden. SEO, HR and news automations stay off pre-production, and any super-expensive one found is shut off. A test record is never a customer.
12. **Every agent we build starts on Haiku (Claude Haiku 5.5).** Sonnet is tried only when tests PROVE Haiku cannot do the job, on the same agent definition with only the model changed, and the failing runs are the evidence. Opus is tried only if Sonnet also fails, and if Opus truly beats both Haiku and Sonnet, Arman approves it before it is used. An agent born on Opus is a defect to explain, never a starting point. Jobs that run per row or repeat (AI columns, enrichment, classification, anything that can happen 1,000 times) get the most scrutiny: the cost per run times the volume is what is judged. A column, mandate or knob never pins a premium model as a platform default; the bound agent's model decides unless a person picks one. Arman's words: [VISION](/policies/VISION.md#ai-model-and-spend-rules) (2026-10-19).
<!-- rules:stamp-end -->

Know what is being tested and adjust accordingly ([owner's words](/policies/VISION.md#ai-model-and-spend-rules)). Never pick a
test model from memory. Ask what the test is for, then ask the catalog.

## 1. What are you testing?

| The test is about | Purpose | Gets you |
|---|---|---|
| Plumbing: UI, persistence, wiring, tools, streaming. The answer's content does not matter. | `plumbing` | The cheapest unrestricted priced chat model that supports tool calls. Cheaper than Haiku. |
| Something that depends on the provider: its API, its streaming shape, its errors. | `provider` + name | The cheapest unrestricted model of THAT provider (Haiku for Anthropic). |
| The actual intelligence: answer quality, reasoning, an eval. | `intelligence` | The recommended default (Sonnet 5.5 today) plus the list of restricted models. |

## 2. Ask (one call)

```
agent_catalog action=test_model purpose=plumbing
agent_catalog action=test_model purpose=provider provider=Anthropic
agent_catalog action=test_model purpose=intelligence
```

No MCP? From `aidream/`: `uv run python scripts/test_model.py plumbing`, or `provider Anthropic`,
or `intelligence`. Both return the model id, name, price per 1M tokens in and out, and why. Use that
model name as given.

**Plumbing that does not need a fresh answer at all: don't call the model.** Run the test in AI test
mode (`?ai_test_mode=stand_in` on the app URL, or header `X-Matrx-AI-Test-Mode: stand_in`): automated
AI steps answer from saved baselines and cost nothing. Never for an `intelligence` test, and you still
owe one `real` run before calling an AI-backed flow done. [ai-test-mode](/policies/ai-test-mode.md).

## 2b. Never test through General Chat

General Chat is for people who chat; a test gets its own super cheap, fast agent
([owner's words](/systems/chat/conversations/VISION.md)). When a test needs any AI reply, run **Test Reply**
(agent `8a4b7c8e-144f-4391-b5f0-3d2cd2ecee0f`, plumbing model, reasoning low, 300 output tokens,
no tools, about $0.00002 a reply): `agent_run agent_id=8a4b7c8e-144f-4391-b5f0-3d2cd2ecee0f
user_message="ok"`. The test seats' new-chat default is already Test Reply (user binding of
`chat.default_new_chat`). General Chat stays held for agent seats.
A test that needs an agent to WORK WITH DATA (tables, records, a connected app such as Notion) runs **Test
Data Agent** (`5f533f4f-325a-4983-8702-d3a824394e68`, Claude Haiku 5.5, reasoning low, tools: records,
table, ask_person). The plumbing 20B model could not drive the records tool (it asked for an export), so
this one is the cheapest that does.

## 3. Never a restricted model

Max-tier, Fable, Astra, Mythos, and anything at or above the cost rating the answer reports
(`restricted_min_cost_rating`, 6 today) are off limits for testing. An `intelligence` answer lists
them in `restricted_models`. The top-tier gate refuses them for anyone not approved, and a test
account that asks for one raises a spend alarm to the super admins (one per account per day). The
guard warns; it does not block, so the refusal is not your signal. This skill is.

## 4. Keep the test small

Fresh short context, as few calls as prove the point, and no premium pipeline re-run to check a code
fix that does not depend on the model's reasoning. Rules:
[ai-model-and-spend-rules §5](/policies/ai-model-and-spend-rules.md).

## 5. Where the answer comes from

One function, `ai.test_model_choice(purpose, provider)`, computed from the live catalog (active,
priced offerings only). Knobs under `ai.test_models` override it: `plumbing_model`,
`provider_models`, `intelligence_model`, `restricted_min_cost_rating`, `restricted_name_pattern`.
Reviewed monthly; the catalog changes, so never hard-code the answer in a test.
