---
type: Reference
title: "create-agent — the factory route for our own coding agents"
description: "How a coding agent gets a platform agent built through the Agent Factory: write the mandate, gather 3 real inputs, start the agent_build workflow through the workflow MCP, follow the run, handle each outcome. Companion to the create-agent skill; read before building any agent."
tags: [create-agent, skills, agent-factory, coding-agents]
timestamp: 2026-10-09T00:00:00Z
---

# create-agent — the factory route (our coding agents; read before step 6)

Our own agents are held tougher than people, because an agent
that lacks the data now will not have it later. The server enforces it: with knob
`agent_factory.proof_policy_agents` = `require_samples` (the default), a build started from the
`agent_author` / Agent Service / people-MCP `agents` / custom-action doors with fewer than 3 usable
real examples is **refused before anything is spent**, and the refusal names what to send. There is
no "build unproven" for an agent caller.

## 1. Write the mandate (the contract; no prompt-writing)

Per [agents-never-author-agents](/policies/agents-never-author-agents.md) you state WHAT, never HOW:
- **Provision** — each input the agent may receive, required or optional, and what it does when an
  optional one is missing (run [agent-provision](/skills/agent-provision/SKILL.md) first).
- **Output** — the exact deliverable (a kind/shape, or the person's words in `output_format`).
- **Goal** — what the work is for and what DONE looks like.

These map onto the `spec` of the build as `goals`, `variables` (with teaching help text) and
`output_format` / `output_schema`. The factory's own writers produce the prompt; you do not.

## 2. Gather at least 3 REAL inputs BEFORE you call create (6 for a Mandate's Holder)

**A build for a Mandate (`mandate_key` set, door `mandate_holder_draft`) needs 6 usable real cases, not 3.** The floor is the knob `agent_factory.representative_min_pool`, default 6 (aidream `services/agent_build/job_facts.py` reads it). Below it the build is refused before any step runs: "the proof pool is below its floor". The pool counts the Mandate's captured runs plus your samples. A Mandate on a provision also needs its default binding (consumption map) written first, or the build fails with `BindingRequired`.

Real = taken from real runs, chats, records, files or pages of the job. Never invented, never
paraphrased into tidier ones, never placeholders (the no-fake-data rule). Where to look: the
mandate's recent runs, the conversations that prompted the need, the table or page the agent will
read. If you cannot find 3, stop and report which input is missing and where it would come from
(`NEEDS_CONTEXT`); do not build.

Each example carries at least one of the agent's variables and shares no distinctive 6-word run with
your goal text (a proof case's own text in the description is caught as a leak and refused).
Every example has ONE shape, the same in `sample_inputs` (as a JSON string) and in the workflow's `examples`
(as a list): `{"variables": {"listing_text": "<real value>"}, "user_input": "<real typed text>"}`. Either half
may be left out, never both; add `"reference_output"` only when a real accepted answer exists. A conversational
agent's example may be a plain string (one real typed request). An example that carries no input, such as a
bare `{"listing_text": "..."}` without `"variables"`, is refused at intake before anything is spent
(aidream `services/agent_build/intake.py` `example_refusal`).

## 3. Start the build through the workflow MCP

Coding agents build through the `workflow` MCP tool, never a script or a build route:

`workflow action=start_system key=agent_build subject=build:<uuid> inputs={...}`

- `subject` is `build:<a uuid you mint once for THIS job>`. Starting again with the same subject while
  the run is active joins it (`mode: "duplicate"`); a different uuid starts a second, paid build. Save
  the returned `run_id` and the subject.
- `inputs` are exactly `agent_build_v1.RUN_INPUTS`: `source_kind` `build`, `source_ref` your uuid,
  `request_text`, `door` (`coding_agent`), `mode` `build`, `mandate_key` (or null), `agent_id` null,
  `unproven_requested` false, `examples` (your real inputs from step 2, each in the one shape above), and `spec` (name, goals,
  variables with help text, `output_format` / `output_schema`).
- Improve or rebuild an existing agent: `subject=agent:<agent_id>` with `source_kind` `agent`.
- Never call `agent_author update` on the agent while its run is going.

## 4. Follow the run, then handle the outcome

`workflow action=status run_id=… wait_seconds=…` (or page `events`). The build may pause on a card
(the workflow offer, "keep it anyway"); answer through `workflow action=resume`. Only a finished run
whose result says the agent was kept means an agent exists. Then:

| Outcome | What it means | You do |
|---|---|---|
| passed, kept | Proven on your examples | Record `agent_id` + pinned `version_id`; run it once yourself on a real input; report. |
| kept without a proof | Cannot occur for you | Treat as a defect; report. |
| no proof inputs, unproven (floor/leak) | Examples too few, too alike, or leaking into the instructions | Fix the named cause (more varied real inputs, remove example text from `goals`), start a NEW subject. |
| send-backs exhausted, judge not blind | Draft never beat the bar | Today's agent (if any) is untouched. Read the stop reason; tighten the mandate (goal/output), never hand-edit the prompt. One retry with a new subject; a second failure goes to the owner. |
| needs a new kind | No registered shape fits the output | The run files the proposal itself and the agent answers in text until the kind exists; say so in your report. |
| workflow-sized | The job is a workflow, not an agent | Report to the owner; do not shrink the job to fit. |
| run failed or lost | Build stopped mid-way | `workflow action=resume` the same run. |

A refused build on an existing agent (rebuild) leaves today's version live: say so; never
describe it as replaced.

## 5. Report

Cite: the mandate (provision/output/goal), where each of the 3 inputs came from, the subject,
`run_id`, the outcome, and `agent_id` + `version_id` when kept.
