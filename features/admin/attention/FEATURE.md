# Super-admin attention dock

**What it is.** ONE floating card, on every page, for everything that needs a
person responsible for the platform — with a way out. Mounted once in
`app/DeferredSingletonCore.tsx`; super-admin only; absent when nothing needs
a person.

The dock waits for auth before it polls, and for nothing else: every source
is a platform-level read (schedules: super-admin RPC; outages: a GET, which
the transport sends without an organization when none is selected; dated
changes: super-admin read). None of them depends on the selected
organization, so a super admin sees the platform's alerts with none picked.

**Why it exists (Arman, 2026-09-14).** Two floating notices had grown side by
side — the schedule alarm (bottom-right) and the provider outage notice
(top-centre) — each with its own snooze, mute store, layout marker and idea
of a row. The schedule one had become furniture:

> "It keeps reminding me and telling me that things are off, but some of
> these things should be off, and there's nothing wrong with the fact that
> they're off, but it's not giving me an out."

Three commerce schedules were red for sixteen days because the commerce
module is unbuilt. Two SEO schedules were orange because ONE transient run
had failed. Every row was a title with a link: no reason, no failed run, no
page in the product where the damage showed, no action — and the reason text
carried raw uuids.

## The model

| Piece | File | Role |
|---|---|---|
| Types | `types.ts` | `AttentionItem` (a decision, not a title), `AttentionSourceState` |
| Sources (pure) | `sources/schedule-alarms.ts`, `sources/provider-outages.ts`, `sources/dated-changes.ts`, `sources/spend-alarms.ts`, `sources/deploy-freshness.ts`, `sources/dev-server-freshness.ts` | rows → items; summaries |
| Sources (live) | `sources/useScheduleAlarmSource.ts`, `sources/useProviderOutageSource.ts`, `sources/useDatedChangeSource.ts`, `sources/useSpendAlarmSource.ts`, `sources/useDeployFreshnessSource.ts` | React Query read + the injected writes |
| Notice | `build-notice.ts` | live/muted partition, the title, the pill, `null` at zero; `info` counted apart; `SECTION_LIMIT` (8) rows per source, worst first, `hidden` → "+N more" to its review |
| Row | `AttentionItemRow.tsx` | the same row on the dock AND the review page |
| Dock | `AdminAttentionDock.tsx` | float, collapse, snooze, note dialog, runway marker |
| Mutes | `item-mute.ts` + `useLocalMutes.ts` | durations; the LOCAL store (external store, no effects) |
| Snooze | `dock-snooze.ts` | whole-dock, this browser, timed |
| Poll | `poll.ts` | KNOB MIRROR of `platform.attention.poll_ms` |

A **row** carries: severity; the record as an `EntityRef` door (open / new
tab / peek); a short state ("switched off 16 days ago", "2 runs failed in a
row"); one honest sentence through `TextWithDoors` (never a bare uuid);
"Where it shows:" — the product pages the job feeds, each opening in a new
tab, or the honest "This job has not said which pages it feeds"; the evidence
("The run that failed"); the fix beside the complaint (Re-enable, with its
consequence stated before it runs); the **fix line** ("What to do: …") when the
record says; **Copy / Copy for AI** (THE copy door, `CopyButtons`) when the source
supplies `copy`; and **Mute** — 1 hour … 30 days, or 30 days with a note.
Severity is critical / warning / **info**: info is listed last, never turns the
dock red, and the pill counts it apart ("3 things need a person · 2 to know").

**Two mute scopes.** A schedule's mute is a FACT ABOUT THE RECORD: written to
`sch_task.metadata.alarm_mute {until, reason, by, at}` through RLS
(`platform_admin_all`) with `mergeJsonColumn`, returned by the RPC, seen by
every super-admin on every device, listed on the review page with its note.
An outage has no row a person can annotate, so its mute is LOCAL (this
browser), keyed by the server's outage id — a new outage is a new id and is
never muted by an old click. Nothing is muted forever: the longest choice is
a month, and silence beyond that is a decision about the schedule, not the
alarm.

**The clock.** `hooks/useNow.ts` (30-second external store) is the only
"now" in render; the nearest expiry among the items on screen arms a timer
that refreshes the clock, the local store, and every source, so silence ends
by itself in this tab without a reload.

**It floats.** A notice never modifies the page under it (Arman, 2026-09-12).
While visible it sets `data-admin-attention="compact|expanded"` on `<html>`;
`styles/shell.css` reserves a responsive scroll runway on the shell scroll
owner from that state alone (guards: `styles/__tests__/no-overlay-layout-reservation.test.ts`,
`features/shell/layout-gate/shell-scroll-runway.spec.ts`).

## The data half (schedules)

`scheduler.system_schedule_alarms(p_overdue_grace_minutes integer = NULL)` —
super-admin SECURITY DEFINER; v2 on 2026-09-14
(`migrations/scheduler_system_schedule_alarms_v2_*.sql`):

- `suspended` (critical) — guard-suspended and off; `succeeded_since_suspension`
  says when a later run succeeded, so the sentence is "off for no live reason".
- `overdue` (warning) — enabled, due more than `scheduler.alarms.overdue_grace_minutes` ago.
- `failing` (warning) — `failed_streak` ≥ `scheduler.alarms.failing_streak`
  consecutive terminal failures. One failed run between successes is not an alarm.
- Every row: `last_run_id/status/error`, `description`, `tags`, `approval`,
  `impact` (from `metadata.impact`), and the mute columns. Muted rows ARE
  returned; the dock hides them, the review page lists them.
- 20 ms live (v2b walks `sch_run_task_due_idx` per task; v2c makes the
  streak one grouped aggregate).

**Impact is declared by the job.** aidream
`register_system_task(..., impact=[SystemTaskImpact(href, label, what)])`
is reconciled onto `sch_task.metadata.impact` at worker boot (aidream
`0686` seeded the first five). A job with no declaration shows "has not said
which pages it feeds" — honest, and the nudge.

## Spend alarms

Source `spend-alarms` (`sources/spend-alarms.ts` + `useSpendAlarmSource.ts`): every unresolved
`billing.spend_alarm` record, read through `billing.spend_alarms_for_attention` (super-admin
SECURITY DEFINER, so it answers on every page; the table's RLS answers only inside the admin lane).
Row: level → severity; record door `/administration/billing/alarms/<id>`; state "1,388 times ·
last 4:51 PM"; sentence = `detail` with ids swapped for names (`readable`); the blocked records
(`refLinks`) as "Where it shows"; the latest occurrence as evidence; `fix` (or the fix shipped in
code) as the fix line; actions from `alarmActions` — Approve / Reject (held approval), Pause /
Resume / Run once now (task) — plus Resolve, each with its consequence first, through the record
page's own writes. **Mute is a fact about the record**: `spend_alarm_set_status('snoozed',
p_snoozed_until, p_note)` stores until + `snooze_note` + `snoozed_by`; Unmute reopens. Review: the
alarm list `/administration/billing/alarms` (Snoozed filter shows the note). This dock is the ONLY
in-app surface for spend alarms; aidream e-mails critical ones and nothing else (guard
`aidream/scripts/check_no_direct_alarm_announcements.py`, `--live`).

## Who an item is for (2026-10-11)

Arman: "What do I do with these?" Every item may carry `audience` (`types.ts` `AttentionAudience`):
`owner_decision` (absent = this) is a row; `agent_fix` is never a row: the source sets
`delegated: {count, href}` and the section shows one quiet line "N being fixed by agents" (not in the
pill; at zero owner decisions the card is absent); `info_only` stays on the review page. Spend alarms
read `audience` from `billing.spend_alarm_rows` (aidream `alarm_audience.py` classifies; agent_fix is
filed into the agent work queue `users.user_feedback` and resolves with it; an escalated one comes back
as `owner_decision` with `audience_note` on the row's `about`). The alarm list opens on "Your decision"
with "Agents fixing" and "Worked as designed" beside it (`?audience=`). Tests:
`__tests__/spend-alarm-items.test.ts` "who an alarm is for".

## Dated changes (when they speak)

Quiet until the lead window, loud inside it — decided in the database, rendered here and by
`components/admin/CredentialExpiryNotifier.tsx` (same items, toast + dock). Rule and reasons in
the 2026-09-29 change log entry. Sources: `sources/dated-changes.ts` (pure),
`sources/useDatedChangeSource.ts`; words in `features/admin/dated-changes/describe.ts`; tests
`__tests__/dated-change-items.test.ts` and
`components/admin/__tests__/CredentialExpiryNotifier.dated-changes.test.tsx`.

## Review page

`/administration/automation/scheduling/scanner-health` renders the SAME
source and the SAME row (live rows, then a "Muted — quiet on purpose"
section with the note, who, until, and Unmute), so it can never drift from
the card that points at it.

## Adding a source

One pure module (`rows → AttentionItem[]`, a summary sentence), one hook
returning `AttentionSourceState`, one line in `AdminAttentionDock`. Set
`loud` honestly: a direct DB read that fails must be said; a Python poll
that fails is already captured by `lib/python-client`.

## Tests

`__tests__/build-notice.test.ts` (null at zero, ordering, both mute scopes,
expiry), `__tests__/mutes-and-snooze.test.ts` (never permanent, garbage-safe),
`__tests__/schedule-alarm-items.test.ts` (RPC-shaped fixtures → doors,
actions, mutes), `__tests__/spend-alarm-items.test.ts` (record → row, actions,
mute → record status, Copy for AI, summary), `__tests__/AdminAttentionDock.test.tsx` (real component:
one card for two sources, doors, local vs server mute, non-admin issues no
request, loud vs silent failure, never an all-clear, expired mute ignored).

## Anti-noise: audience, readiness, budget, signal (2026-10-11)

Arman: "they bombard me so the important things get missed ... I stop looking, and eventually I
turn the feature off." The DATABASE triages every dock item once, for this dock and for the agents'
`attention` MCP tool (aidream `aidream/services/attention`, `aidream/api/mcp/agent_service/attention_tools.py`):

| Piece | Where |
|---|---|
| Audience per source + kind (`owner_decision` / `agent_fix` / `info_only`); `override_*` is the knob | `platform.attention_audience_rule` (kind `*` = source default) |
| Per-item override, prepared card sentence + recommended action, resolution, filed work item | `platform.attention_item_state` |
| Rulings on records: hold on a general-purpose agent, limit hit on a system job → `agent_fix` | `platform.attention_spend_ruling`; knob `platform.attention.general_purpose_agents` |
| Readiness gate + duplicate + stale + budget (pure, tested with fixtures) | `platform.attention_classify(items, now)` |
| Every source normalized | `platform.attention_raw_items()` |
| The dock's read (settles the signal first) | `platform.attention_card()` |
| Signal metric: one episode per showing, closed `acted` / `muted` / `expired` | `platform.attention_showing`, written by `platform.attention_record` |
| Auto-demotion: a kind muted or ignored `demote_after` (2) times in `demote_window_days` (7) without acting → `agent_fix`, with a note | `platform.attention_settle` |
| Report: shown, acted, signal rate per kind, card vs budget | `platform.attention_report(days)` |
| Agent writes, audited (who, when, note) | `platform.attention_write` → `platform.attention_audit` |

Audience precedence: per-item override → the record's own audience (spend alarms: the ruling,
then `billing.spend_alarm.audience`) → kind rule (override, then default) → `info` severity is
`info_only` → source rule → `agent_fix`. Readiness (owner decisions only): one plain sentence (no
uuid, hex id, snake_case code or error code; ≤ 220 chars; one sentence), evidence (run, occurrence
or record link), ONE recommended action with its consequence, no duplicate on the card, not stale
(`stale_days`, 7, unless recurring). A failure routes the item to `agent_fix` with the reason.
The card holds `card_budget` (5) items; the rest is "N more being prepared by agents" (muted,
links to the review page) — never a bigger pill. Nothing ready → no dock at all. Spend today is a
fact: shown beside a decision, or alone only when critical. A failed triage read is loud and the
card falls back to `FALLBACK_CARD_BUDGET` items. Review page: the signal panel
(`AttentionSignalPanel.tsx`) on scanner-health. Runbook: `common-docs/skills/attention-triage`.
Files: `triage.ts` (pure), `triage-service.ts`, `sources/useAttentionTriage.ts`,
`build-notice.ts` (`NoticeTriage`). Tests: `__tests__/triage.test.ts`, the anti-noise cases in
`__tests__/AdminAttentionDock.test.tsx`; live: aidream
`aidream/services/attention/tests/test_attention_triage_live.py`; tool:
`aidream/api/mcp/agent_service/tests/test_attention_tools.py`.

## Deploy freshness

Source `deploy-freshness`: every separately deployed service the Ship Manager reports behind its
latest release or unhealthy, read through `platform.deploy_freshness_for_attention` (super-admin
SECURITY DEFINER over `ops.ops_issue_class` `fleet:*`, which the Manager rewrites every 5-minute
sweep). A class not rewritten in the last hour is not shown; the Manager's heartbeat `fleet:watch`
older than 30 minutes is its own critical item ("the deploy watch has gone quiet"). Audience rule:
`agent_fix` for every kind, so the triage agent fixes or files it; the card sees one only when it is
escalated. The row's fix line is the reason the Manager recorded (e.g. the failed preflight line).
Files: `deploy-freshness-service.ts`, `sources/deploy-freshness.ts`, `sources/useDeployFreshnessSource.ts`;
test `__tests__/deploy-freshness-items.test.ts`. Producer: matrx-ship `server-manager/FEATURE.md`
§ Release freshness.

## Dev server freshness (development only)

Source `dev-server-freshness`: the LOCAL dev server running @ai-matrx packages older than
`node_modules` (an install relinked them under it). Read from `GET /api/dev/server-freshness`
(404 in every build; contract `lib/dev-server/server-freshness.ts`), every 15 s, quiet on failure
because the read fails exactly while the server restarts. The preview watchdog
(`scripts/agent-dev-server.sh` `restart_if_node_modules_moved`) restarts the server once the install
settles, so the row normally lives under a minute; after 3 min it turns critical. `machineLocal`:
the database has never heard of this machine, so the row skips triage and goes on the card first.
Files: `sources/dev-server-freshness.ts`, `sources/useDevServerFreshnessSource.ts`; tests
`__tests__/dev-server-freshness-items.test.ts`, `lib/dev-server/__tests__/server-freshness.test.ts`.

## Change log

- **2026-10-14** — Dev server freshness joins the dock. An install relinked @ai-matrx/api under the
  running preview and a page logged `First-touch persistence failed 500 ""` — a stale server, not a
  bug in that feature. The watchdog now restarts on its own; the dock says why while it does.

- **2026-10-13** — Deploy freshness joins the dock. files.matrxserver.com ran a 4-day-old build
  (13 releases refused to install) and pasted images failed on every page; the Manager's warning
  reached nobody because its database mirror had skipped every sweep since 2026-08-23.

- **2026-10-11** — Anti-noise triage (section above). Live: 27 pending → 0 on the owner card
  (19 being prepared by agents, 15 info only, 4 muted).

- **2026-10-10** — Every dock read answers on EVERY page: `scheduler.system_schedule_alarms` and
  `platform.dated_changes_for_attention` (via `_dated_change_caller_ok`) gated on the
  admin-lane-bound `is_super_admin()`, so outside `/administration` the dock said "Schedules could
  not be read". All three DB doors now gate on `is_super_admin_person()` (identity). Outages are a
  Python GET gated on the admin level, not the lane. Live proof:
  `aidream/services/billing/tests/test_attention_dock_doors_live.py`.

- **2026-10-10** — Spend alarms join the dock (source `spend-alarms`) and the loud in-app notice
  rail is deleted (`features/notifications/components/LoudNotices*`, `loud/`, `/demos/loud-notices`,
  `communication.my_loud_notices`). Arman: "I need this thing to be on the proper admin
  notification system so I can snooze it." Kept from the alarm system and made dock primitives
  for every source: `info` severity, a fix line, Copy / Copy for AI (schedules and outages supply
  it too), and a per-section cap with "+N more" for ~30 rows. Tests: `spend-alarm-items.test.ts`,
  `build-notice.test.ts` (info, cap), `AdminAttentionDock.test.tsx` (spend rows, 1-hour mute →
  record, +22 more).

- **2026-09-29** — The dock no longer waits for an active organization. Schedule alarms and
  provider outages were gated on `selectOrganizationId`, so a super admin with no organization
  picked got no request and no alerts (a switched-off job, an outage) while dated changes alone
  showed. Neither read needs one (RPC / org-less GET). Test: "polls every platform source with no
  organization selected".

- **2026-09-29** — Dated changes: quiet until the lead window, loud inside it (owner's ruling
  joining Arman's "super annoying, always gets my attention" with the 2026-09-28 rule below, whose
  reason still holds: no permanent global alert months before the date). The database decides
  (`platform.dated_changes_for_attention`): a scheduled change raises NOTHING until
  `dated_changes.remind_days` before its effective time (the knob, read live per organization and
  person — never a constant); inside the window it is `upcoming`, loud on the dock and as a
  never-timing-out toast in `CredentialExpiryNotifier` (restored); `drift` and `zone_unconfirmed`
  also speak only inside the window; refused, failed and overdue speak at once and cannot be
  dismissed or muted until resolved; applied is a notice for `dated_changes.notice_hours`. A
  change whose time zone was never stated alerts in its window with "Confirm the time zone this
  change uses" and a door (`Confirm time zone` on the Dated Changes page, new door
  `platform.dated_change_set_time_zone`); months ahead it stays on that list only. The
  "created" notice is deleted (it was a global alert on day one).
- **2026-09-28** — Future changes with an unstated time zone stay on the Dated
  Changes page without a global alert. Removed the duplicate permanent toast;
  the dock continues to show actionable dated changes even without an active
  organization. (Superseded in part 2026-09-29: the reason stands, the rule is now the lead window.)
- **2026-09-14** — Built. Replaces `features/scheduling/components/alarm/SystemScheduleAlarmBanner.tsx`,
  `features/scheduling/lib/{system-schedule-alarm-notice,alarm-snooze}.ts` and
  `features/admin/system-errors/{PlatformOutageBanner.tsx,outage-mute.ts}` (deleted, no shims).
  Knob `platform.system_errors.outage_poll_ms` → `platform.attention.poll_ms`.
