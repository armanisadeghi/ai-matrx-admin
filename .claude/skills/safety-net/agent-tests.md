---
type: Reference
title: "safety-net agent tests — doors, what reached the model, fixtures, fault plants, grader brief, records"
description: "The exact tools, tables, scripts and briefs behind the safety-net agent path (SKILL.md steps 1-9): which door reaches which server path, how to read the request the model received, how fixtures are drift-checked, how a fault is planted blind, what a grader gets, and where the result is recorded."
tags: [testing, safety-net, real-tests, agents, mandates, reference]
timestamp: 2026-10-22T00:00:00Z
---

# safety-net — agent tests reference

Read from [SKILL.md](SKILL.md) when a step names a section here. Paths under `scripts/real-tests/` are
in matrx-frontend; `scripts/read_request_as_sent.py` and `scripts/pick_test_subject.py` are in aidream.

**Contents:** A. the platform's agent test system · B. doors · C. test agents and models · D. fixtures
and the drift check · E. what reached the model · F. the fault plant · G. the grader brief ·
H. records · I. worked example (PB-07).

## A. The platform's agent test system — use it, never build beside it

| Piece | Where |
|---|---|
| A test case: `agent.exemplar` row, `kind='test_case'`, with variables, typed input, reference answer, judge facts, checks and a door | AI Dream MCP `agent_tests` (`list_cases`, `get_case`, `save_case`, `update_case`) |
| A run of an agent's live cases on one or more setups (agent or pinned version, model, settings, variables), with checks, a cheap fact judge and costs | `agent_tests action=launch` → `status` → `results` |
| The pages | https://www.aimatrx.com/agents/<agent-id>/test (a person runs and reads cases) · https://manage.aimatrx.com/administration/agents/tests (admin view) |
| Design and decisions (door per conversation, personal-key identity, judge never shares the run path) | [Agent Evaluation plan](/projects/agent-evaluation/PLAN.md) · [contract](/projects/agent-evaluation/CONTRACT.md) |

`save_case` takes `conversation_id` of a run you can see: the agent, variables, typed input and final
answer are taken from it. Judge a case by a few specific facts, each one thing that must or must not
appear (`judge_facts: [{id, statement}]`), never "same as the approved answer". The fact judge is a cheap
model of another family; it never turns a failed check into a pass. A platform case is the agent's
regression memory; it is not the sealed check and it is not the fault proof.

## B. Doors — every server path a person or system reaches the agent through

| Door | Call | Dry run (no model call; lists `platform_parts[].label`) |
|---|---|---|
| chat | `POST /ai/agents/{id}`, `client.surface = matrx-user/chat` | yes |
| agent-run page | same, `matrx-user/agent-run` | yes |
| bare API | same, no `client` | yes |
| Builder test run | `POST /ai/manual`, definition inline, `matrx-user/agent-builder`; its dry run is the Builder's Model view | yes |
| mandate | `POST /ai/mandates/{key}` · try: `POST /mandates/{key}/try` | yes |
| workflow step | `POST /workflows/{id}/runs` (an `ai.agent.start` or `ai.mandate.start` step) | yes, on the child call |
| agent calls agent | `POST /ai/agents/{caller}`; grade the child's request | yes, on the child call |
| conversation continue | the next turn of an existing conversation | — |
| MCP | AI Dream MCP `agent_run` | — |
| background helper | the `agent` tool with background on, its follow-up and wake-up (PB-08) | — |

Two screens that call the same server path are one door. The senders in `scripts/real-tests/pbNN-send.py`
already drive these doors as `admin@admin.com`; reuse one before writing a new sender.

## C. Test agents and models

- Model choice: [`test-model-selection`](/skills/test-model-selection/SKILL.md) (`agent_catalog action=test_model`).
  Runner and plumbing agents: Claude Haiku 5.5. The agent's own judgment: its cases through `agent_tests`
  with a Haiku setup first; a bigger setup only when results show Haiku fails
  ([`agent-downshift`](/skills/agent-downshift/SKILL.md)). Never a restricted model.
- Ready cheap agents: Test Reply `8a4b7c8e-144f-4391-b5f0-3d2cd2ecee0f` (any reply), Test Data Agent
  `5f533f4f-325a-4983-8702-d3a824394e68` (records and tables), Chat Plumbing Test Agent
  `ccab43ad-05e4-45d6-a49f-8e5605ed66f5` ([CHEAP-TEST-AGENTS](/operations/real-tests/CHEAP-TEST-AGENTS.md)).
  General Chat is never a test agent.
- A fixture agent for a plumbing change is a copy, in the fenced organization, with every marker unique
  (PB-07's canary is the model). Agents are built through the agent builder
  ([`create-agent`](/skills/create-agent/SKILL.md)), never written by hand by an agent.

## D. Fixtures and the drift check

- Organization **Safety Net Real Tests** `226be635-194d-42dd-87c8-7a9562f70939` (owner admin@admin.com,
  settings `real_tests_only`). Check it is not archived before installing. A second organization holds
  only a "must never appear" twin (admin's Workspace `884d1ce8-7b49-4fba-a2f3-0f7dd7c83d4f`).
- Every fixture (agent version and settings and tools, pins, bindings, organization values, files, rows,
  pick lists) is recorded in `scripts/real-tests/fixtures.json`, the only source of live fixture values.
- `python3 scripts/real-tests/fixture_check.py <PB>` prints `DIFF <fixture> <field>: manifest … | live …`
  and exits 0 only on a full match. Every sender calls it (`require_fixtures`) and refuses to send on a
  difference. A changed fixture is re-baselined by its owner with a ledger row, never silently.

## E. What reached the model

| Question | Read |
|---|---|
| The provider request, redacted (pick-list and reference text swapped to tokens) | `chat.request_snapshot.request_payload` for the conversation |
| The same request byte for byte as the provider received it (platform admins, audited) | `uv run python scripts/read_request_as_sent.py <snapshot_id> --reason "<PB> grading"` (`--system-only` for the system text) = `GET /admin/requests/{snapshot_id}/as-sent?reason=` |
| What the author is shown for a door | that door's dry run (`dry_run: true`), its `platform_parts` |
| Text nobody declared | `scripts/real-tests/pb07-provenance.py`: every segment that is not authored text, a declared value, the typed text or an allow-listed platform part |
| Which holder and version answered a mandate | `chat.conversation.metadata.mandate_run.resolution` (`rung`, `holder_id`, `holder_version_id`, `door`), also `chat.user_request.metadata.mandate_resolution` |
| Model, tokens, cost of a turn | `chat.user_request.metadata.usage_by_model` |
| Tool calls and their outcome | the tool-call ledger rows of the conversation |
| Which server build answered | `run-identity.json` from the sender (`run_identity.py`), or `GET https://server.app.matrxserver.com/health/version` |

A reply repeating a marker proves the marker arrived; only the request proves a must-not marker did not.

## F. The fault plant

1. Only on a playbook that has a PASS on the current sealed text and fixtures.
2. Write the expected failing row(s) into the playbook's sealed fault table; commit and push it.
3. Plant through a grader-only script (`scripts/real-tests/plant-pbNN.py --plant`): it changes one
   disposable fixture and writes a grader plant record (`~/.matrx/real-tests-grader/planted-<PB>.json`,
   2-hour expiry), so `fixture_check.py` accepts exactly that one difference and prints only a count.
   A code fault goes to main as a small switch commit and counts only once `/health/version` carries it.
4. A fresh runner on the ordinary sheet, not told. **CAUGHT** only when exactly the expected rows fail.
   A PASS or a different failing row means the playbook cannot see that channel: rewrite it, rerun.
5. `plant-pbNN.py --restore`, read it back, `fixture_check.py <PB>` exit 0. Record both times.

## G. The grader brief — fill exactly these slots

```
Playbook (sealed): common-docs/operations/real-tests/<area>/<PB>.md, sealed checks and fault table
Run: <capture file or directory>, conversation ids, sender run-identity.json
Fault: none | "<fault as written in the fault table>"
Tools: read-only database queries, aidream scripts/read_request_as_sent.py, fixture_check.py <PB>
Return: per sealed row PASS / FAIL / INCONCLUSIVE, with the row id or query output that decides it.
Write the grade to <file>, then reply with its path.
```

Never add an allow-list, an interpretation or "this row is fine because". A ruling first goes into the
sealed file with a ledger row, then the grader grades.

## H. Records

- Ledger row (core-chain `LEDGER.md` § Runs shape): `| Date | Area | Playbook | Trigger | Runner | Fault | Grade | Deciding row |`;
  the Trigger cell starts `server <git_sha> · sender <blob sha> · helper <blob sha> · subject <id or none>`.
- **Trusted** line in the ledger: a playbook with a PASS and a CAUGHT on the same sealed text and fixtures.
- The agent's passing run saved with `agent_tests action=save_case conversation_id=… label=…`, judge facts
  set from the sealed must / must-not rows, so `/agents/<id>/test` reruns it after the next change.
- Not finished: the ledger ends with a **Next step** line naming the exact run to dispatch, and
  [HANDOFF.md](/operations/real-tests/HANDOFF.md) says where the nets stand.

## I. Worked example — PB-07, nothing undeclared reaches the model

A canary agent whose every legitimate segment carries a unique marker (`PB7-AUTH-K3VQ`, `PB7-VAR-7Q2K`,
`PB7-BLK-3H9X`, `PB7-CTX-8W5N`), run with one typed message on nine doors, each with its dry run;
the grader diffs every stored request against the declared parts. Trusted after a PASS and a CAUGHT
fault (a platform note switched back on, seen as exactly four undeclared lines on the doors it reaches).
Files: [PB-07](/operations/real-tests/core-chain/PB-07-nothing-undeclared.md) · sender `pb07-send.py` ·
helper `pb07-provenance.py` · plant `plant-pb07.py`.
