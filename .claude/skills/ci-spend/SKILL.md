---
name: ci-spend
subject: policies/ci-spend
type: Skill
title: "ci-spend — GitHub Actions cost discipline"
description: "The CI cost rules ($100/week of real money, all CI). Use when editing .github/workflows, adding a schedule or cron, dispatching a workflow, publishing a package version, hitting a billing block, or seeing a CI SPEND OFF TRACK line, ci-breaker issue or spend alert."
tags: [skill, ci, cost, github-actions]
timestamp: 2026-10-18
---

<!-- SYNCED COPY — do not edit here.
     Canonical: common-docs/skills/ci-spend/SKILL.md
     This file is distributed to every consuming repo by
     common-docs/meta/scripts/sync_skills.py. Edit the canonical, run the
     sync, and commit each repo. Edits made here are overwritten and lost. -->

# ci-spend

<!-- rules:stamp -->
> Rules from `common-docs/policies/ci-spend.md` — edit there, never here (`python3 common-docs/meta/scripts/one_home.py --write`).

1. **Ceiling: $100 a week of real money for building and shipping software**. One total, never one service judged alone:
   - GitHub Actions actually billed (`netAmount`; organization `AI-Matrix-Engine` and personal `armanisadeghi`), never list price;
   - RunsOn's AWS cost (Cost Explorer, tag `stack=runs-on`);
   - CI subscriptions as a weekly share, 52 weeks a year (monthly x 12 / 52, yearly / 52): GitHub Enterprise seats (count and price read from GitHub), GitHub Pro, the RunsOn license (from its start date).
   Each line shows its $/week and its share of the total. Every price and the cap are `billing.ci_spend.*` knobs; no lane raises the cap.
   List price only forecasts when the free GitHub minutes run out: that is a future-billing alarm, never "off track".
2. **Cadence.** Only aidream and ai-matrx ride the ~30-minute train. Every other app releases on meaningful change. Matrx Desktop: macOS builds only on Arman's Mac (never on GitHub), Windows/Linux at most twice a week. Matrx Local: paused, no builds. Overnight releases run hourly when main changed. No package version without a real content change. Waste to hunt first: cascading package republishes from small changes.
3. **Every workflow change states its cost.** Each workflow has an entry in the repo's `.github/ci-cost.json` (trigger, runs/week, minutes, OS, $/week, benefit). `check_workflow_runner_cost.py` warns on a missing or stale entry and fails only an undeclared paid runner (macOS, Windows or larger without a manifest leg or allowlist reason). It never judges spend and has no per-repo share: the weekly total of real money against $100 is judged only by the server spend watch.
4. **Cost without benefit is a defect.** Recognize it by these shapes:
   - Red runs repeated without a fix. The `ci-breaker` label pauses a workflow after 3 reds in a row.
   - Mac or Windows runners on push.
   - A schedule more frequent than the thing it watches changes.
   - Republishing or rebuilding unchanged artifacts.
   - Duplicate workflows doing one job (in one repo or across repos).
   - Polling or waiting on a paid runner.
   - A job with no `timeout-minutes`.
   - Manual dispatch loops. Every dispatch carries `requested_by`.
5. **Never work around a billing or spending block.** No moving the job to another repo, account or runner. Stop and tell Arman in plain English.
6. **A spend report is the weekly total, then each component with its $/week and % of total, then the waste found and fixed** (cascading package republishes from small changes first). The agent-facing notice stays silent unless the 7-day GitHub list-price figure (`week_usd`) is at least $200; below that only Arman and the owner session see alarms.
<!-- rules:stamp-end -->

The law is [ci-spend.md](/policies/ci-spend.md); read it, it is short. How to apply it:

1. **Before touching a workflow**, write its `.github/ci-cost.json` entry first (trigger, runs/week, minutes, OS, $/week, benefit). Run `python3 scripts/check_workflow_runner_cost.py`. If $/week has no benefit you can name, do not add the workflow.
2. **Prefer** `paths:` filters, Linux runners, `timeout-minutes`, `concurrency` with cancel-in-progress, and a path or content-hash check before publishing.
3. **Dispatching a workflow**: pass `requested_by`; never loop a dispatch; if a run goes red, fix it before dispatching again.
4. **Billing or spending block**: stop. Do not move the job elsewhere. Tell Arman in plain English.
5. **Seen cost without benefit** (any shape in the policy): fix it if it is yours, else one plain sentence to Arman: what, roughly how much, no benefit.
6. **Check spend**: `GET /ci-spend/status` (the weekly total, each component's $/week and share, the cap), or the one-liner in the policy for GitHub alone. Off track means the weekly total of real money is over the cap; free minutes running out is future billing.
