---
name: safety-net
type: Skill
title: "safety-net — real tests a fresh agent walks in the live product: a check of today, or a net around a change"
description: "Real tests: a fresh agent walks the live product against sealed checks proven to catch a planted break. Use when told to use safety-net, to check whether an area really works now, or around a change too wide for one agent to see every break. NOT for one automated test (use forcing-function-tests)."
tags: [testing, migration, verification, doctrine, adversarial]
timestamp: 2026-10-15T00:00:00Z
---

<!-- SYNCED COPY — do not edit here.
     Canonical: common-docs/skills/safety-net/SKILL.md
     This file is distributed to every consuming repo by
     common-docs/meta/scripts/sync_skills.py. Edit the canonical, run the
     sync, and commit each repo. Edits made here are overwritten and lost. -->

# safety-net

Real tests are run by you right after big changes, never automatically; they block because a failure
stops you, never because a system blocks you; one pass means hundreds of things worked ([his words](/operations/real-tests/VISION.md)).

A **real test** is a playbook: a plain-language procedure that a fresh, cheap agent walks in the live
product against the live database as `admin@admin.com`, plus a **sealed check-sheet** that agent never sees.
It is **proven to fail** on a break it was not told about. Around a change it is written **before** the
change, run on the unchanged product, and run again after. As a **check** of how something works today,
it is run once on the product as it is. Pass → done. Fail → you stop and
fix the product.

This is not a test suite, not CI, not a gate, not a dashboard. Nothing here runs on its own and
nothing here blocks anyone. The playbooks are documents, and the discipline is yours.

**A script is never a playbook.** Anything that grades itself is outside this skill: a Playwright or
node script holding its own expected values, a fault switch an env var flips, an exit code that says
pass or fail. Those are automated tests (`forcing-function-tests`). In matrx-frontend,
`tests/smoke-journeys/` (smoke check) and `scripts/regression-bar/` (data-doctrine regression bar) are
such suites. Green there never stands in for a real test, and a brief that says "run the script, all
must pass" is not this skill. A red script is triaged like §4b (product first, then the script), but it
is that suite's business, not the net's. (2026-10-15: an npm-campaign brief called its Playwright journeys "the
safety net"; there was no weakness list, no sealed check, and the tests were edited until they passed.)

**Mechanics live elsewhere; this skill only orders them:**
| Need | Owner |
|---|---|
| Planting a break in a shared checkout and restoring it no matter what (`plant.py`) | `forcing-function-tests` §3, §4a |
| Finding every consumer and trigger path, including rows that are configuration | `safe-cutover` Step 1 |
| Briefs that can return what you do not already believe | reality-is-the-referee · `subagent-dispatch` §1 |
| Realistic data and people | test-data-looks-real · `@ai-matrx/records/use-cases` · persona factory · aidream `scripts/pick_test_subject.py` (businesses and people to test on) |
| The database tests run on | the live database, as `admin@admin.com`, on disposable records. The nightly clone is only for rehearsing destructive migrations or jobs that lock live 10+ minutes (`operations/clone/CURRENT.md`) |
| Where tests run | the **live** product: aimatrx.com and `server.app.matrxserver.com`, as `admin@admin.com`. Never localhost (§4a) |

## 0. Pick the scenario first — it decides what "before" means

Name the scenario in the first line of the ledger. Each one uses the same weakness list, playbooks,
runner and fault proof (§2–§5); they differ only in what the runs compare and what is committed when.

| Scenario | When | The runs | Done when |
|---|---|---|---|
| **A. Check** | "Does this really work?" Nothing is being changed: an area, a set of agents or mandates, a feature someone doubts. Also a kept net rerun later, whenever the area is doubted again. | One **check run** per playbook on the product as it is. Every FAIL is classified (§4b); a product defect is fixed (own commit) and that playbook rerun. No before/after. On a kept net, a red rerun after a green row is a regression since that row. | Every playbook PASS and fault-proven (§5), or each one left open reported by name as open and not fault-proven. Often a red check run, the fixes, and a green rerun are the whole job. |
| **B. Before a change** | A change not yet made, wide enough that one agent cannot see every break. | Baseline on the unchanged product (all PASS) → change → after-run (§1). | After-run PASS through every trigger → "shipped". |
| **C. Change already shipped** | The change landed before anyone built a net (agent-variables, 2026-10-15). | The shipped product is the start state: run it as a **check (A)**. Never claim the change was safe; there is no before. | As A. The report says plainly that no before-state was captured. |
| **D. Campaign over days** | Many changes by many lanes in one area (a package migration). | The owner builds ONE net at the start and runs it as a baseline. A **milestone** is a landed change that touches a channel a playbook covers; the owner (never the lane that made it) dispatches one after-run covering every milestone landed since the last, at most once a day, never per commit. | Each after-run PASS. On a FAIL, the lanes whose milestones since the last green run touched the failed marker's channel look first. Lanes receive this skill by name and their part of it, never a one-line command (§4). |

- **Fires** when the person says "use safety-net"; when someone asks whether an area really works
  (scenario A); and on your own judgment before a change wide enough that one agent cannot see every
  way it breaks: a shared primitive or package with many consumers, a cross-repo contract, a rewrite
  of a path many surfaces reach.
- **Does not fire** for a change inside one feature (`forcing-function-tests` is enough) or one
  replaced contract (`safe-cutover`).
- **Budget — this is where agents waste the owner's money, so it is a ceiling, not a target:**
  three to six playbooks in total; each one under fifteen minutes of walking for the runner (the end
  captures in the addendum are extra and do not count); one blind fault per playbook. Wide beats
  narrow: one playbook that crosses five channels is worth more than five that cross one each,
  because one pass then proves the whole chain. When the area holds more units than six playbooks
  reach (a dozen mandates, two dozen packages), chain them through the surfaces most people use and
  the channels most consumers share, and list by name every unit no playbook reaches as **not covered**.
- If the net takes longer to build and prove than the change takes to make, the change is too big
  for one net. Split the change.

## 1. Order is law, and the commits are the clock

1. **Weakness list** (§2) — written by a fresh agent from reality.
2. **Playbooks** (§3) — written by a different agent than step 1; when that truly cannot be arranged,
   the ledger says why. Either way step 1's list reaches step 2 as a file, never as your summary.
   **In A and C, commit the net now** (step 5's rules), before the first check run.
3. **Baseline run** (B, D) or **check run** (A, C) — a fresh runner (§4) walks every playbook. In B
   and D all must PASS on the unchanged product. A FAIL is graded by §4b before anything else: a
   product defect is fixed now, under its own commit, and the playbook rerun (in B and D that fix is
   not "the change"; it may precede the net commit). In A and C this step is a
   loop: check run → classify (§4b) → fix → rerun, until each playbook passes or is reported open.
4. **Fault proof** (§5) — one planted break per playbook, blind, fresh runner. Each must FAIL for
   the right reason. A fault is planted only on a playbook that has already passed; a playbook still red
   cannot tell the fault's FAIL from the defect's.
5. **Commit the net** (B, D; A and C did it at step 2) — playbooks and ledger, one commit, pushed,
   **naming its files by pathspec**. A sweeper commits strays under "local work not committed", and a
   net nobody committed has no clock. In B and D **this commit precedes every commit of the change**.
   Run rows, fixes and fault rows follow as their own commits in every scenario. No script checks this. Anyone who doubts
   the order reads the history, which cannot be rewritten on the shared remote.
6. **The change** (B, D only).
7. **After-run** (B, D) — a fresh runner walks every playbook through every trigger it names. All PASS → ship.
   Any FAIL → stop. Fix the product. Rerun the failed playbook and every playbook that shares the
   broken channel. **A playbook is never edited to make it pass.** It changes only when the intended
   behavior changed, and the ledger row says what changed and why.
8. **Keep the playbooks** (§6). They are the asset; the next change in this area starts from them.

**A defect the weakness list already names is not fixed before a run grades it.** The run's FAIL is
the proof the bug existed and the rerun's PASS is the proof the fix works; a fix made from the list
alone has neither (2026-10-15: fixes citing W-01…W-22 were pushed before any playbook existed). Write
the playbooks, run them, then fix.

The three cheats this order exists to stop, all observed in agents: writing the tests after the
change so they describe what was built instead of what must hold; one agent writing, running and
grading its own test; and a test that passes because nothing could make it fail.

## 2. The weakness list comes from reality

Everything downstream can only catch a weakness somebody listed. This step decides whether the net
is worth anything, so it is never written from memory of the code.

**Recipe — generalize channels, never copy a feature's list:**
- **Input channels:** what the user typed, attachments, page context, internal resources attached,
  variables, settings and knobs, which organization the person is acting in.
- **Output sinks:** database rows, the rendered page, the tool-call ledger, notifications, files.
- **Entry points:** every trigger that can perform the same job — chat, a context-menu shortcut, a
  surface binding, an agent-filled mandate, a schedule, an API call.

**Sources, each found by a command whose output can be shown:** every consumer and trigger path of
what the change touches, including stored definitions and configuration rows (`safe-cutover` Step 1
table) · the surfaces and routes that reach them · **what broke before** in this area: the error
ledger, `FOUND_DEFECTS.md`, patrol sightings, the feature's Change Log · the owner's own words
about the change.

**Each weakness** gets a stable id (`W-01`…), one line on what would go wrong *silently*, the
channel it rides, and the sink where it would show. A weakness that would show in no sink is marked
**UNTESTABLE**, stays on the list, and appears in the report. It is never dropped to make the
coverage look complete. A weakness the author proved with a probe is marked **CONFIRMED** with the
probe output; it still waits for a run (§1).

**Brief the list author like a discovery, not a confirmation — fill exactly these slots:**
```
Scenario: <A check / B before a change / C shipped / D campaign>
Outcome wanted: <what must be true for a person, in their words>
Area: <what a person does there, in their words — "add a business to Smart Add", never mandate keys>
The owner's words: <verbatim>
Return: WEAKNESSES.md in operations/real-tests/<area>/ per safety-net §2.
```
Nothing else. **Withheld:** file paths, table, mandate or agent keys, search words, bug lists, your own
suspicions. The author finds those; what you withheld is the test of what comes back. (Both 2026-10-15
nets handed the author files or mandate keys and a bug-list path.)

## 3. A playbook

One file per playbook, two halves under one id, template beside this skill: `playbook-template.md`.

**STEPS — the half the runner gets.**
- Precondition: which real-use-case dataset, and how the state is reached — created by the runner
  through the product, or seeded on live by you (as `admin@admin.com`, disposable records) before the run and named here.
- The steps in the language a person would use: what to open, what to type, what to attach, what to
  click, what to wait for. Name controls with the words the page shows today (a sheet said
  "Preferred / Ours / Not us"; the page offers Yes / No / Other).
- What to **capture** afterward, as raw observations: the exact text of this note, the list of tool calls
  shown in the conversation, a screenshot of this panel, and **every entry in the Error Inspector** (copy all)
  at the end of the run. Capture, never judge. Database reads belong to the GRADER, run right after the run:
  a browser-only runner has no database, and a human runner should not need one (learned 2026-10-01).

**SEALED CHECKS — the half the runner never gets.**
- One **marker** per channel the change touches: a unique, realistic fact from the use-case library,
  planted in exactly one input channel. Never a placeholder-looking value.
- For each marker: the sink where it **must** appear, and the sinks where it **must not** appear. The
  second half is what catches a swap, a leak, or content delivered through the wrong door.
- Which weakness ids each marker covers.

**Ambient platform values are part of every request.** The date, the organization and the person's
identity flow into every run by default (Arman's ruling). A question worded against time ("today", "this
delivery", "now") makes a dated fixture read as stale, and the model then rightly refuses it: PB-05 lost two
facts that had arrived intact, 2026-10-18. Name each fact by its own anchor ("the crew on the receiving
whiteboard"), never by time.

**When the subject is an AI agent or mandate**, every playbook carries an **identity row**: the grader
reads the run ledger and checks that each mandate ran on the holder agent and version its binding
names, read from the mandate binding before the run. A playbook that cannot say which agent answered
cannot tell a regression from a swapped agent.

**Every link must be addressable by the agent under test.** If the chain needs an agent to call another
agent, the skill or context it reads must carry that agent's id, because the agent-call tool takes an id and
nothing finds an agent by name (round 1, 2026-10-01: the tool arrived, the agent could not connect "lane
planner" to it). A link the agent cannot reach is a flaw in the playbook, not a finding against the product.

**Design for the chain.** Put the deciding marker at the end of the longest chain the change
touches. "The note now contains the pickup time from the attached file" is one check that cannot be
true unless the file was received, parsed, placed in context, the page tool was offered, the agent
chose it, the confirmation appeared, the person approved, the write landed, and the page re-rendered.
That is what makes one passing test worth hundreds of smaller ones.

**Hide the pieces behind the approved silent breaks.** Every playbook reads `silent-breaks.md` beside
this skill and hides each piece of its answer behind a different row there, so a missing piece names the
break. Only Arman adds rows; propose new ones to him in chat.

**One primary chain, one rich UI; every other test is short and different** ([his words](/operations/real-tests/VISION.md)). The server and the core
front-end work (variables, bindings, attachments, context, agent calls, the confirmed write) are proven once,
by the primary chain on one surface rich enough to exercise them (Notes). Another UI gets its own quick test
of only what that UI does differently: its surface map, its tools, one read and one write. Server-only
behavior (mandates, bindings resolved without a page, other ways in) is tested by direct calls to the
product's own API or the AI Dream connector, with no browser. Never repeat the primary chain on a second UI.

**Triggers are a slot, not a copy.** A playbook names the entry points that reach a DIFFERENT path for the
same job (a server-side door, a mandate), and a run is one playbook through one trigger. Two UIs that call the
same server path are one trigger, not two.
Agent runs have several server doors (the Builder's manual door, the agent door behind the run page and chat,
conversation continue): every baseline, fault and after-run picks its door AT RANDOM among the playbook's
triggers, and the after-run covers every door: testing only in the Builder tests one API.

**No screen.** When what is tested has no page (a server path, a package, an agent behind a mandate),
the runner's tool is the product's own door as the person: the AI Dream MCP (`agent_run`, the mandate
route) or the API with a real session, never a database write. The sink is the reply and the rows the
grader reads: for an agent run, the stored request snapshot and the run ledger row (`chat.request_snapshot`,
`chat.user_request` metadata), noting that the snapshot redacts pick-list and reference text, so those
channels prove themselves only by a marker the reply repeats. The halves, the markers and the blind fault
are the same. **The extension and the desktop app** have no runner seat yet: a channel reachable only
there is reached through the web page or the server door, or listed as UNTESTABLE.

**Reference playbook (chat, client side):** the agent must edit a note on the notes page so it
matches an attached markdown file and includes a detail that exists only in an attached internal
resource. The run must show the confirmation control, the runner approves it, and the note must end
up holding the file's marker and the resource's marker, in the note and nowhere else.

**Server side:** a chain of agent calls where a marker coming back in a reply proves several AI
providers, dozens of tools and the state between them. The same playbook shape with the reply as the
sink.

## 3b. Judgment playbooks — when the question is whether an agent UNDERSTANDS

A playbook of §3 proves the plumbing: the variables arrive, the tools fire, the write lands. A
**judgment playbook** proves the agent sees what a seasoned expert would see. Arman, 2026-10-18:
building a templated agent (guidance filled by variables) is a blind spot of the model that writes it,
and the agents under test are the same model, so they share its blind spots
([his words](/projects/brand-discovery/VISION.md) § The blind spot).

- **The truth comes from the owner, never from you.** Each scenario starts from something the owner
  (or a real expert, or the business itself) has said is true and that a capable model would miss:
  the free drop-off that brings people in but makes no money; "who do you serve?" answered "everyone"
  when the real question is "who will you spend ad money to win?". A truth you thought of yourself is
  probably one the agent will think of too. Cite the owner's words for every scenario.
- **Written before the agent is built or changed**, by a fresh agent given only the agent's one job, its
  inputs and its output shape. Never its instructions, examples or samples.
- **Set the agent up to fail.** Feed the real data of a real business where the obvious answer is
  the wrong one, so that the pass is reachable only through the insight. The sealed check names what
  must appear in the agent's own words (the flag raised, the question asked, the placement made) and
  what must not (the confident wrong answer).
- **No leak.** The agent's instructions, variable help text, examples and build samples must not carry
  the scenario's business, its tell-tale words, or its answer. Before a run, scan the definition for
  them; a leak voids the scenario until the leak is removed through the agent builder. A pass that a
  leak could explain proves nothing.
- **Held out.** For every scenario used while building, keep one more on a different business, of the
  same kind, that nobody tuned against. Only a pass there counts as the agent having learned the skill.
- **Cost is a check.** Record each run's cost, tokens and tool calls. A run that costs much more than
  the job deserves, makes tool calls for data that could have been in its context, or uses a large model
  for a small mechanical step is a definition defect, graded FAIL like a wrong answer.

## 4. The runner

- A **fresh agent** with no part in the change, on **Claude Haiku 5.5** (`quick` lane, `model: haiku`) by
  default ([his words](/operations/real-tests/VISION.md)).
  Raise it to Sonnet only when a run is INCONCLUSIVE for reasons of the runner, never of the product.
  The agents under test default to Haiku 5.5 too, unless the playbook tests a specific model.
- **Gets:** the STEPS half, the live URL (aimatrx.com) signed in as `admin@admin.com` in the in-app browser, or the API sender for a no-screen playbook, plus the
  read queries the steps name. **Never gets:** the checks, the markers' expected placement,
  whether a fault is planted, the diff, or the change's purpose.
- **Tools:** the provider's in-app browser on the live site, and read-only queries on the
  live database. No write tools, no file edits, no API calls outside the product. With only the product in
  hand, the end state can be made true only by the product doing its job.
- **Returns** raw observations in the ledger's run shape, or "could not complete step N because…".
  It never returns PASS or FAIL.
- **You grade** by laying observations against the sealed checks: **PASS**, **FAIL** (the product
  produced the wrong state), or **INCONCLUSIVE** (the runner did not finish). INCONCLUSIVE is never a
  pass. Twice on one playbook, for reasons other than the environment (§4a), means the steps are unclear or the product is unusable at that step,
  and you find out which.
- The product under test is the **live** product users run: aimatrx.com, `server.app.matrxserver.com` and the one
  database, signed in as `admin@admin.com` (never the clone). The runner touches only that account's disposable
  records. Record the live server build (`/health/version`) in every run row; a run during which the live build
  changed is INCONCLUSIVE. A change not yet released is tested after the next release (about 30 minutes), never on
  localhost. Never Arman's Chrome; never a sign-out.
- **Test subjects** (businesses, people) are never chosen by the agent
  ([his words](/systems/marketing/websites-and-brands/projects/smart-add-brand/VISION.md)). They come from aidream `scripts/pick_test_subject.py --category/--tag --claim "<run>"`, drawn at random
  from `operations/real-tests/SUBJECT-POOL.md`; a claimed subject is never reused. Every build is followed by a
  test on `--different-from <id>`. Record each id in the ledger.
- **A person driving it** ([his words](/operations/real-tests/VISION.md)): after the check run
  is graded, fixed and green, he gets the STEPS sheet and his own hostname, never the checks. He is a
  runner; the grader grades what he returns.
- **Delegating the net:** a manager who hands any step to a worker names this skill and the step in
  the brief. A worker brief that says only "run X, all must pass" has dropped the sealed checks and
  the fresh runner (2026-10-15, npm campaign).
- **A grader brief carries no rulings.** The coordinator hands a grader only the sealed playbook file, the run
  (its captures and ids) and the database. A ruling that changes how a row is read is first written into the sealed
  playbook with a ledger row (§4b), then graded; a grade taken under a ruling found only in a brief does not count
  (2026-10-19: PB-06 L2 passed under a brief's allow-list with a fourth tool present).

**The fix loop is cheap or it does not happen.** After the first run that reaches the end, the runner's own
transcript is the script: a browser-only Haiku `quick` agent replays the same sheet for every fix and every fault
run, and the owner grades from captures without re-reading the product. A fresh, unscripted runner is used
twice only: the baseline (or check run) and the final after-run. Never let the expensive owner model drive the browser.

**Reset, then verify, before every run.** The grader restores the start state (the fixture's canonical content,
values, chips) and PROVES it with the same queries the sealed checks use, before handing out the sheet. A run on a
dirty start state is INCONCLUSIVE whatever it shows (2026-10-01: a fault proof ran on a note still holding the
previous run's finished line; the agent "corrected" it instead of filling it, and the proof had to be repeated).
A fresh test subject per run is a clean start state; say so in the run row.
A release landing on the live site mid-run can change the runner's page; record the build before and after, and
treat a changed build or "page changed by itself" as INCONCLUSIVE.

### 4a. Preflight — the environment is proven before any runner is sent

On 2026-10-15 three runs of one playbook spent about 25 minutes and 320k tokens and finished nothing:
the preview had stopped itself after 30 idle minutes, then the in-app browser pane crashed from page
memory twice. A runner is dispatched only after the grader has shown, in this turn:
**Real tests run on the live product, never on localhost** (Arman, 2026-10-18: localhost is
"for when you're actively fixing the ui or a quick bug"; a test there runs in an environment users never
see and misses the biggest problems). Preflight:
1. Note the live server build (`GET https://server.app.matrxserver.com/health/version`) and whether the
   change under test is in it. If not, wait for the next release (about 30 minutes) — never test it locally.
2. No-screen playbook: the AI Dream MCP `server_status` healthy plus one harmless call through the same door.
3. Browser playbook: the in-app browser opens the sheet's first route on aimatrx.com signed in as
   `admin@admin.com`, with no error page.
4. The memory rules in `RUNNER-ADDENDUM.md` (watcher, heap per step) are in the brief.

**Two INCONCLUSIVE runs from the environment on one net → stop dispatching** (a crash that happened
with the memory rules followed counts too). Fix the environment, or
report "stopped, because the environment …". A third runner into the same broken environment is waste.

### 4b. A FAIL is classified before anything is rerun

Each FAIL or surprise is one of three, decided from the captures and written in the run row:
- **Product wrong** → fix the product now, under its own commit, and rerun the playbook. When the
  product is an AI agent or mandate, the fix goes through the agent builder (`create-agent`; agents
  never author agents), never a hand edit of its row.
- **Playbook wrong** (a control renamed, a step the intended behavior no longer has) → edit the
  playbook with a ledger row saying what changed and why, **citing the capture that shows it**, then rerun. Never after a FAIL whose cause
  is the product.
- **Environment** (live server down or mid-deploy, pane crash, a 500 on every page) →
  INCONCLUSIVE; §4a; never recorded as a baseline.

Never rerun hoping it comes back green, and never call a red run "flaky" without the captures that
show the environment did it.

## 5. Fault proof — a test is trusted only after it catches a break it was not told about

- **One per playbook**, each aimed at a different channel, so that across the set every channel's
  marker has been seen to fail at least once.
- **Subtle, at a boundary, everything else working:** an attachment type dropped at the edge, a
  resource's content replaced by the previous version, a tool silently absent from the agent's set,
  a denied write that returns as if it succeeded, channel A's payload delivered to channel B. A crash
  or a blank page proves nothing, because anything catches those.
- **Prefer breaking disposable data over breaking code** (`admin@admin.com`'s own records on live, never anyone else's). Detach the resource, remove the tool from
  the agent's definition, flip the binding, point the mandate at the old version (a user-rung binding
  for admin only). Reversible, no edit on the shared checkout. Restore it and read it back before the next run.
- **A code fault is planted on main or as data, never on a local preview.** A real test runs on the live product,
  and a local hot-reload never reaches it. Prefer a data fault on the same channel. When only code can break the
  channel, commit the fault to main (best: a server switch whose plant and restore are one small commit each),
  run blind only after `GET /health/version` shows a live build carrying the fault commit, then commit the restore
  and prove a live build carries it before any other run counts. Record both commits and both builds in the
  ledger row.
- **Blind.** The runner is not told. The grade must be **FAIL**, and the marker that failed must be
  the channel the fault hit. A PASS, or a FAIL for a different reason, means the playbook cannot see
  that channel: rewrite it before anything else counts.
- **A fault flag inside a script is not a fault proof.** The breaker must be someone other than the
  runner, and the runner must not know.
- **Every attempt is a ledger row**, caught or missed.

**The real-tests organization is fenced** (Arman, 2026-10-17). Every real-test fixture lives in the
organization `Safety Net Real Tests` (owner admin@admin.com, settings `real_tests_only`), and no other session
runs anything there: no feature work, no demos, no other lane's tests. Another session's runs inside a test
organization contaminate the fixtures, the costs and the run records. A second organization for a "must never
appear" twin is the only exception, and it holds nothing but the twin.

**Where the fixtures live.** A chat or agent run goes through the production server, so a real test of chat runs on live, as the
test admin (`admin@admin.com`), on disposable records in a test-fixture organization. Faults that touch data touch only those
disposable records. Check the organization is not archived before installing (a 2026-10-01 install went into an archived
twin; the server admitted it and the doors refused it).

**The channel is part of the test — a rehearsal that runs as a privileged database role proves nothing
about the production channel.** On 2026-10-01 the production final switch was refused twice (the copy
fence refused the press's own writes because the server presses as `app.actor_tier=code`, then an
organization wall refused the presser, who was not a member) after every clone rehearsal (a migration rehearsal, which is still what the clone is for) had passed: the
rehearsal synthesised the person's token and called the database functions as the store-owner role, which
every fence and wall lets through. A dress rehearsal drives the SAME doors the person's click reaches
(the server route, with a real session from the product's own auth) as a person shaped like the real one
(the admin lane, and NOT a member of what the step touches), so that the server channel's actor settings,
caller role, request headers and the person's memberships are the ones judged. Prove the rehearsal red
against the pre-fix bodies before trusting it green; a rehearsal that never saw the production sentence
cannot vouch for the fix. Method and proof: the retired data-doctrine lane report `v5/PROGRESS-PRESS-FENCE.md` (git history)
(the honest rehearsal, lane PRESS-FENCE-HONEST).

**Runners on one machine.** The provider's in-app browser pane is one per machine: every runner and every fixer takes
a lock before its first browser step — `mkdir /tmp/matrx-browser-lane.lock && echo <name> > …/owner` — checks the
owner is itself before every browser step, releases only its own lock, and never removes another's (2026-10-01: a
fixer tested without the lock and deleted a runner's; the runner's tab was navigated away twice). Each seat drives its own private headless browser on the live site (matrx-frontend
`node scripts/real-tests/pw.mjs <run> signin` then `goto https://www.aimatrx.com/<route>`), signed in by the helper,
never by typing a password. A run during which the live build changed is INCONCLUSIVE; say so and rerun.

**Many playbooks, one lane: the owner serialises, the runner never parks.** Eight runners dispatched at once
on 2026-10-02 did eight minutes of work: one took the lane, the other seven started a background wait for the
lock and ENDED THEIR TURN, returning "queued, no captures" as a completed task — a background wait dies with the
turn. The owner dispatches one runner at a time, after a wait that sees the lock directory absent for thirty
seconds, and the runner brief says in so many words: a report with no captures is a failed run; if the lane
is held, wait in the foreground and walk the sheet in this same turn. Budget one lane-run at a time: six
fifteen-minute playbooks plus their end captures and preflight is two hours of wall clock, not ten minutes.

**Performance is a capture, not an opinion.** When the question includes speed, or a rerun is compared with an
earlier one, the runner records, with its own clock (`date +%s` before
step one, before each send, at the first visible word, at the finished state) and the page's navigation timing
(`performance.getEntriesByType("navigation")`: ttfb, domReady, load, resource count), how long each step, each
turn and each page load took; the grader adds the server's own per-turn rows (iterations, tool calls, model and
tool milliseconds, tokens, cost) and the runner's harness usage. Numbers from two runs of the same sheet are the
only honest "faster"/"slower"; a speed claim without them is a story. The capture rules are `RUNNER-ADDENDUM.md` CX4;
the sheet says whether CX4 applies.

## 6. Where it lives

`common-docs/operations/real-tests/<area>/` — the playbooks and one `LEDGER.md`. Playbooks walk
the product, not a repository, so they live in common-docs (`docs` skill). The ledger names its
scenario (§0) on its first line and holds three small hand-written tables: the weakness list; playbook
× weakness coverage, with the marker that covers each cell; and the runs — date, playbook, trigger,
runner lane, commit, test subject, fault planted or none, grade, which marker decided it, and for a
FAIL its §4b class. Weakness ids and playbook ids are stable across changes in the area, so the next
net starts from this one. When a net stops before it is finished, the ledger ends with a **Next step**
line naming the exact run to dispatch, so the next owner starts there.

## 7. Report — plain language, in chat

Where the weaknesses came from and how many · each playbook and the chain one pass proves · every
fault, caught or missed, and what was rewritten when missed · the grade per playbook per trigger ·
every defect fixed and the rerun that proved it · what is UNTESTABLE and why. End with exactly one of:
- **"shipped"** (B, D: every after-run PASS);
- **"checked: N pass, M fixed, K open"** (A, C), naming each open one and why it is open
  (a defect not yet fixed, or "never completed: environment");
- **"stopped, because X"**;
- **"not finished: the next step is Y"** when the net is still being built.

Never "tests pass" or "fixes pushed" as the report, and never a pointer to the ledger in place of the words.

## Rationalizations

| Excuse (observed) | Reality |
|---|---|
| "Tests are green" offered as done (`forcing-function-tests`, 2026-09-10 reps) | Green from the builder's own tests on the builder's own data is a claim about the data. A fresh runner on the live product is the test. |
| "I'll write the regression checks once the change settles" | Written after, a test describes what was built. Written before, it describes what must hold. Only the second can fail. |
| "The existing test already covers this" — said before the fault proof | Until a planted break has made it fail, nobody knows what it covers. |
| "I know the expected values, I'll run it myself to save a dispatch" | A runner who knows the answer can make the state true by other means. The dispatch is the test. |
| "The change is urgent; the net can follow the first commits" (shared-checkout pressure) | The first commit is the change. A net that follows it has no baseline and proves nothing about the before. |
| "Website safety net `run.mjs` all PASS before and after" (npm campaign brief, 2026-10-15) | That is a script grading itself. §0's opening rule: it is not a real test and never stands in for one. |
| "Stale tests, not app defects" — then the tests were edited until green (npm campaign, 2026-10-12) | §4b: classify from the captures first. A playbook changes only for intended behavior, with a ledger row. |
| Fixer brief citing W-01…W-22 before any playbook existed (agent variables, 2026-10-15) | §1: the run proves the bug and the rerun proves the fix. A fix from the list alone proves neither. |
| "Another lane's import" — it was a stale install (agent variables, 2026-10-15) | §4a step 2: diagnose before blaming. |
| "I'll test it on localhost first" / "waiting for the preview" | Live has the code within one release (about 30 minutes) and is what users run. Localhost is only a fix-and-look loop (§4a). |
| "I'll wait in the background and resume when notified" (2026-10-02) | A background wait dies with the turn; wait in the foreground. |

## Red flags — thoughts that precede the violation

- "This is basically a one-feature change" — said about something with consumers in another repo.
- "Let me adjust the playbook; the step was ambiguous" — right after an after-run FAIL.
- "A quick fault, I'll just edit the file and put it back" — on the shared checkout.
- "The runner clearly got confused; I'll call it a pass."
- "Eight playbooks is fine, they're small."
- "I'll seed the final state directly so the run is quicker."
- "The weakness list already proves it; I'll fix it now and test later."
- "Probably flaky — send it again."
- "The script has a fault switch, so it is proven."

## Banned

Tests written after the change (scenarios B, D) · one agent writing, running and grading · a runner with
write tools or the sealed checks · PASS or FAIL from the runner's mouth · INCONCLUSIVE counted as a
pass · editing a playbook to make it pass · an obvious fault offered as proof · a hand-edited fault
left on the shared checkout · a fault that touches anything but `admin@admin.com`'s disposable records
· more than six playbooks · placeholder-looking markers · "tests pass" as the report · a script that
grades itself offered as the net · a fix from the weakness list before a run graded it · a runner sent
without the §4a preflight · turning any of this into something that runs on its own.
