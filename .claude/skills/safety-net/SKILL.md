---
name: safety-net
subject: operations/real-tests
type: Skill
title: "safety-net — real tests that prove an AI Matrx agent works live, and nets around wide changes"
description: "Live real tests proving an AI Matrx agent really works. Use when you built or changed an agent, mandate, prompt, tool, model setting, binding or a workflow step that runs agents; when told to use safety-net; or to check an area works. NOT for one automated test (use forcing-function-tests)."
tags: [testing, agents, mandates, verification, doctrine, adversarial]
timestamp: 2026-10-22T00:00:00Z
---

<!-- SYNCED COPY — do not edit here.
     Canonical: common-docs/skills/safety-net/SKILL.md
     This file is distributed to every consuming repo by
     common-docs/meta/scripts/sync_skills.py. Edit the canonical, run the
     sync, and commit each repo. Edits made here are overwritten and lost. -->

# safety-net

<!-- rules:stamp -->
> Rules from `common-docs/operations/real-tests/README.md` — edit there, never here (`python3 common-docs/meta/scripts/one_home.py --write`).

1. **Live only.** Runs use https://www.aimatrx.com, `server.app.matrxserver.com` and the one database as `admin@admin.com`, on disposable records. Never localhost; a change not yet in `GET /health/version` is run after its release, never locally.
2. **Cheap and dedicated.** The runner and any agent whose judgment is not under test run on Claude Haiku 5.5 first; Sonnet only when a run is INCONCLUSIVE for the runner's own reasons. Never General Chat, never a restricted model.
3. **What reached the model is read from the stored request** (`chat.request_snapshot`) and the admin as-sent read, never from the reply alone. Every agent playbook also checks which holder and version answered.
4. **The fault's expected failing row is written into the sealed fault table and committed before the fault run.** A blind runner is never told a fault exists.
5. **No regrading after a row edit.** A sealed row changed after the run that grades it voids that grade; rerun on the new wording.
6. **A separate grader, the database as referee.** The grader gets only the sealed file, the run's ids and captures, and read-only database access; a ruling found only in a coordinator's brief does not count. The runner records and never grades.
7. **Fixtures live only in the fenced organization Safety Net Real Tests** (`226be635-194d-42dd-87c8-7a9562f70939`); no other session works there. `fixture_check.py <PB>` must exit 0 before every run, or the run is INCONCLUSIVE.
8. **Every run is a ledger row** (server sha, sender and helper blob, subject, fault, grade, deciding row); an agent's passing cases are also saved as its platform test cases.
9. **A playbook is never edited to make it pass.** It changes only for intended behavior, with a ledger row that cites the capture.
10. **Coordinators poll for their children's output files.** A child's completion notice does not reach a coordinator subagent.
11. **Push through a temporary index**: exact content (origin blob plus your edit), `git diff --stat` first, `"${C}:refs/heads/main"` with braces. Never patch, rebase, autostash or pull in a shared checkout.
12. **Scratch is wiped on reboot** (`/private/tmp`, `mktemp -d`): commit any script or grade file a later run needs.
<!-- rules:stamp-end -->

A reply is not a test. An agent "worked" only when the live product, reached through the doors people
use, sent the model exactly what was declared, got the right answer back and wrote it where it belongs,
and a test that checks this has been seen to fail on a break nobody told it about. One pass then
proves hundreds of things ([his words](/operations/real-tests/VISION.md)).

## When this fires

| You just… | Prove on live |
|---|---|
| changed instructions, a prompt, a system message or a prompt block | the as-sent system text holds the new words and nothing undeclared; the reply does what they ask |
| added or changed a variable, binding, context item or provision | the bound value arrives on every door; a value the binding does not take never does |
| added, removed or changed a tool | the request's tool list; the tool-call rows; a denied write stays denied |
| changed the model, reasoning, token limit, cache or other settings | the stored request carries them; the turn's model and cost rows |
| bound, pinned or re-pointed a mandate | the holder and version that answered (`mandate_run.resolution`) |
| built or changed a workflow step or background helper that runs an agent | the child's request, its result landing, its follow-up and wake-up |
| built a new agent | all of the above that it has, after `create-agent` |

**Does not fire** for one UI fix that runs no agent (`forcing-function-tests`), one replaced
contract (`safe-cutover`), or an output contract change by itself (`mandate-conversion`, then this).
A change too wide for one agent to see every break, or "does this area really work?", is a **net**:
read [net-method.md](net-method.md) §0 first, then use the steps below for each agent in it.

## The agent test, in this order

Every step ends on its **Done when**. Depth: [agent-tests.md](agent-tests.md), the section letter named in the step.

1. **Live, never localhost.** Your change is committed and pushed. Read the live build:
   `GET https://server.app.matrxserver.com/health/version`. Not live yet: do steps 2-4 now (they come
   first anyway), and put the run in the ledger's Next step and your post-release test list; never test
   it locally and never sit polling a deploy. **Done when** the build sha that carries your change is
   written down, or the run is recorded as next.

2. **Cheap test agent, cheap model.** Anything that is not the agent's own judgment (plumbing,
   variables, bindings, tools, doors) runs on a Claude Haiku 5.5 fixture agent or a ready cheap agent;
   the agent's own judgment runs through its own `agent_tests` cases with a Haiku setup first. Never
   General Chat. (§C) **Done when** every agent and model the run will call is named, with its id.

3. **Fixtures in the fenced organization, drift-checked.** Fixtures live only in Safety Net Real Tests;
   each is recorded in matrx-frontend `scripts/real-tests/fixtures.json`. Run
   `python3 scripts/real-tests/fixture_check.py <PB>`. (§D) **Done when** it exits 0.

4. **Write the sealed checks before the run.** Copy [playbook-template.md](playbook-template.md) into
   `common-docs/operations/real-tests/<area>/`. One unique, realistic marker per channel your change
   touches, hidden behind a row of [silent-breaks.md](silent-breaks.md); for each, where it must appear
   and where it must not; for an agent or mandate, the identity row (holder and version). Commit and
   push it. **Done when** the sealed file is on origin and its commit predates every run of it.

5. **Run through the doors people use, blind.** A fresh Haiku runner gets only the STEPS half (or runs
   the playbook's sender, `scripts/real-tests/pbNN-send.py`), on every door your change can reach, and
   returns captures and ids, never a verdict. A screen uses the cloud browser driver
   ([RUNNER-ADDENDUM](/operations/real-tests/RUNNER-ADDENDUM.md)). `agent_tests action=launch` runs the
   agent's saved cases on a random door per conversation. (§B) **Done when** every door has a
   conversation id and the run's captures are in a file.

6. **Read what reached the model.** For each conversation read `chat.request_snapshot` and the as-sent
   request (`uv run python scripts/read_request_as_sent.py <snapshot_id> --reason "<PB> grading"` in
   aidream), the resolution row for a mandate, the tool-call and usage rows. A must-not marker is proven
   only by the request. (§E) **Done when** every sealed row is decided by a stored row, not the reply.

7. **Separate grader, the database as referee.** A fresh agent that did not build or run it gets the
   sealed file, the run's ids and captures and read-only database access, and grades each row PASS,
   FAIL or INCONCLUSIVE with the row that decides it. No rulings in its brief. (§G) **Done when** the
   grade file names a deciding row for every sealed row. A FAIL is classified before any rerun
   ([net-method.md](net-method.md) §4b): product wrong → fix the product (an agent through the builder);
   playbook wrong → ledger row citing the capture; environment → INCONCLUSIVE.

8. **Prove the test can fail.** Only after a PASS: write the expected failing row into the sealed
   fault table and push it; plant one subtle data fault with `plant-pbNN.py --plant`; a fresh runner on
   the ordinary sheet, not told; the grader grades; restore and re-run the drift check. (§F)
   **Done when** exactly the expected row failed (CAUGHT), the fixture is restored, and
   `fixture_check.py` exits 0 again. Anything else: rewrite the playbook and repeat.

9. **Record it where the next agent looks.** A ledger row for every run and fault run; the Trusted line
   once a playbook has a PASS and a CAUGHT on the same text; the passing run saved as a platform test
   case (`agent_tests action=save_case conversation_id=…` with judge facts from the sealed rows), so
   https://www.aimatrx.com/agents/<agent-id>/test reruns it after the next change. (§H)
   **Done when** the ledger row, the case id and the commit are all on origin.

**Report** in plain words, in chat: what was proven on which doors, the fault caught, the cases saved,
what is open. End with exactly one closing line of [net-method.md](net-method.md) §7. Never "tests pass".

## Budget

At most six playbooks per net, each under fifteen minutes of walking, one blind fault each; the fix
loop replays the first runner's transcript with a Haiku runner. One agent change usually needs one
playbook: put its deciding marker at the end of the longest chain the change touches.

## Which file to read — every companion, read only when your run reaches it

| Your run reaches | Read |
|---|---|
| Any step above names a § letter | [agent-tests.md](agent-tests.md) |
| A net: a wide change, a check of an area, scenarios A-D, the weakness list, judgment playbooks, preflight, runners on one machine, performance captures, the report words | [net-method.md](net-method.md) |
| Writing a playbook | [playbook-template.md](playbook-template.md) |
| Hiding a marker | [silent-breaks.md](silent-breaks.md) (only Arman adds a row) |
| Editing this skill | [evals.md](evals.md), the `skill-authoring` skill, and the home [README](/operations/real-tests/README.md) |

## Rationalizations

Section numbers (§0-§7) are [net-method.md](net-method.md)'s; section letters (§A-§I) are [agent-tests.md](agent-tests.md)'s.

| Excuse (observed) | Reality |
|---|---|
| "The agent replied correctly, so it works" | The reply cannot show what else reached the model or what was missing; the stored request can (§E). |
| "I'll test it through General Chat" (Arman, 2026-10-17) | A test gets its own cheap agent (§C); General Chat is for people. |
| "I'll test it on localhost first" / "waiting for the preview" | Live has the code within one release (about 30 minutes) and is what users run. Localhost is only a fix-and-look loop (§4a). |
| Fault row amended after the fault run (PB-08, 2026-10-19) | That run no longer counted; the fault was planted again against a row written first. |
| A grader passed PB-06 L2 under an allow-list in its brief (2026-10-19) | Rulings go into the sealed file first; that grade did not count. |
| "Tests are green" offered as done (`forcing-function-tests`, 2026-09-10 reps) | Green from the builder's own tests on the builder's own data is a claim about the data. A fresh runner on the live product is the test. |
| "I'll write the regression checks once the change settles" | Written after, a test describes what was built. Written before, it describes what must hold. Only the second can fail. |
| "The existing test already covers this" — said before the fault proof | Until a planted break has made it fail, nobody knows what it covers. |
| "I know the expected values, I'll run it myself to save a dispatch" | A runner who knows the answer can make the state true by other means. The dispatch is the test. |
| "The change is urgent; the net can follow the first commits" (shared-checkout pressure) | The first commit is the change. A net that follows it has no baseline and proves nothing about the before. |
| "Website safety net `run.mjs` all PASS before and after" (npm campaign brief, 2026-10-15) | That is a script grading itself. §0's opening rule: it is not a real test and never stands in for one. |
| "Stale tests, not app defects" — then the tests were edited until green (npm campaign, 2026-10-12) | §4b: classify from the captures first. A playbook changes only for intended behavior, with a ledger row. |
| Fixer brief citing W-01…W-22 before any playbook existed (agent variables, 2026-10-15) | §1: the run proves the bug and the rerun proves the fix. A fix from the list alone proves neither. |
| "Another lane's import" — it was a stale install (agent variables, 2026-10-15) | §4a step 2: diagnose before blaming. |
| "I'll wait in the background and resume when notified" (2026-10-02) | A background wait dies with the turn; wait in the foreground. |

## Red flags — thoughts that precede the violation

- "The answer looks right; no need to open the request."
- "I'll use General Chat / Sonnet for this test, it is just one run."
- "This is basically a one-feature change" — said about something with consumers in another repo.
- "Let me adjust the playbook; the step was ambiguous" — right after an after-run FAIL.
- "A quick fault, I'll just edit the file and put it back" — on the shared checkout.
- "The runner clearly got confused; I'll call it a pass."
- "Eight playbooks is fine, they're small."
- "I'll seed the final state directly so the run is quicker."
- "The weakness list already proves it; I'll fix it now and test later."
- "Probably flaky — send it again."
- "The script has a fault switch, so it is proven."
- "I'll tell the grader how to read that row."

## Banned

Tests written after the change (scenarios B, D) · one agent writing, running and grading · a runner with
write tools or the sealed checks · PASS or FAIL from the runner's mouth · INCONCLUSIVE counted as a
pass · editing a playbook to make it pass · an obvious fault offered as proof · a hand-edited fault
left on the shared checkout · a fault that touches anything but `admin@admin.com`'s disposable records
· more than six playbooks · placeholder-looking markers · "tests pass" as the report · a script that
grades itself offered as the net · a fix from the weakness list before a run graded it · a runner sent
without the §4a preflight · turning any of this into something that runs on its own · a test through
General Chat · a verdict read from the reply alone · a grader brief carrying a ruling.

## Trigger relocation (description rewrite, 2026-10-22)

| Old trigger | Now |
|---|---|
| "around a change too wide for one agent to see every break" | "When this fires" above (a net) and [net-method.md](net-method.md) §0 |
| "told to use safety-net", "check whether an area really works now" | kept in the description |
