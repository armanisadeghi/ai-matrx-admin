# Tool Battle

**Status:** `active` · **Tier:** 2 · **Last updated:** 2026-10-16

Admin screen that runs ONE catalog job (a Tool) across several of its sources side by side, over one or
many subjects, and shows what each source really does: did it answer, how fast, what it cost (vendor $ and
the points a member would pay), which fields came back, and where the sources disagree. Charter:
common-docs `projects/third-party-services` (VISION: the Tool Battle reply; CONTRACT §5, §8, §11, §12a,
§16 row L8; REGISTER rulings L8-1…L8-8). Server half: `aidream/services/tool_battle/FEATURE.md`.

## Entry points

**Routes** (admin group, `/administration/tool-battle`; never `/agents/battle/tools`)
- `/administration/tool-battle` — the list of saved battles.
- `/administration/tool-battle/new` — pick a job, its sources (2–6), the inputs (a row each, or a pasted list), blind or not.
- `/administration/tool-battle/[battleId]` — lane cards, the subject × source grid, field coverage, promote an order.

**Data** — reads go straight to Supabase (`tool.battle`, `tool.battle_cell`, and the catalog tables for the setup
screen; RLS = platform admins). Compute goes through `callApi` to aidream `/tool-battles`: create(+run), `/{id}/run`
(unfinished | all | named cells), `/{id}/cancel`, `/{id}/promote`. The page never writes a cell.

**Files** — `service.ts` (reads, `callApi` doors), `derive.ts` (pure: competition ranking, formatting, blind
labels), `subjectFields.ts` (a job's declared inputs → form fields), `useBattleData.ts` (the rows are the stream:
re-read every 2 s while anything is queued or running), `components/` (`ToolBattlePage`, `ToolBattleListPage`,
`NewBattlePage`, `LaneCard`, `ResultGrid`, `CellTile`, `CellDetail`, `CoveragePanel`, `PromotePanel`, `BypassStrip`).

## Rules this feature carries

- **Every call is live and says so.** `BypassStrip` sits on the setup and results screens: saved answers, replay and
  test modes are off and the calls bill the Tool Battle cost centre. A cell whose attempts show a replay, a caller's key
  or a non-bypass cache policy is **Void** (shown with the reason, counted as failed).
- **Numbers are the server's.** `battle.summary` (lane rollups, ranking, field coverage) is derived once in
  `analysis.py` and rewritten after every cell; this feature only formats it and ranks lanes per metric.
- **Blind** reuses Agent Battle's pure `blindAnonLabel` / `shuffleIds` (`features/agent-comparison/shared/blind.ts`) by
  import, unchanged. The shuffle is fixed when the battle is created; names, source badges and cost stay hidden until
  Reveal. Agent Battle's blind Redux state and `runsRanking.ts` (typed to agent run stats) are not used.
- **Prices read exact** (sub-cent): a battle compares prices. Points are what a member's call of that cost would be.
- **Promote** reorders the job's sources for the router; direct sources still run before treg (R-9) and the panel says so.
- A battle that lost its runner (a lease lapsed on a running cell) is picked up once by the page asking the server to run
  the unfinished cells; the idempotency key makes the re-call a free replay.

## Change log

- 2026-10-16 — Built (L8): list, setup, results page, blind, field coverage, promote; render tests (names, blind
  hide/reveal, failed cell reason, coverage) and pure-logic tests.
