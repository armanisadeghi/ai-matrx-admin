# Notifications — the shell Inbox

**Purpose:** THE one place a person is told things. Every in-app notice the
platform sends lands in `communication.notification` (the canonical spine,
aidream `services/notifications/`, `in_app` channel: *the row IS the
delivery*); this feature is the reader. One bell in the header, one panel,
one route. Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/communications/notifications/FEATURE.md — read it before touching this feature in ANY repo. Follow-ups: `/Users/armanisadeghi/code/common-docs/systems/communications/notifications/projects/notification-system/HANDOFF.md`.

The bell is one of the three fixed header controls, never hidden (see `features/shell/FEATURE.md`). A notification is never a chip, and no feature builds its own notifier.

## Entry points

| File | Role |
|---|---|
| `components/InboxHeaderButton.tsx` | The bell. Badge = unseen Needs-you + For-you notices + anything new from a counting source since the bell was last opened (`badge.ts`); clears on open. Source marks live in synced preferences (`preferences.inbox`, `useInboxMemory.ts`), so they follow the person to every device. Updates add a dot, never a number; an unreadable part shows a neutral dot. Toggles the Notifications canvas tab (`canvas/notificationsKind.tsx`), opened in a pane below what the canvas shows; pressed while in front. `G` then `N` opens the inbox window from anywhere. |
| `components/BellPanel.tsx` | THE bell body — the Notifications canvas tab (`variant="pane"`, touch-sized on a phone; the phone ⋮ sheet opens the same tab). For you / Updates tabs, Needs-you section (3 + "N more"), time buckets, grouped rows, All places strip, footer "Open inbox" as a WINDOW (Ctrl/Cmd-click: new tab). **Clear all** (every Inbox notice Done, every page, one call, Undo in the toast) and ⋯ **Clear a kind** (every kind with its count, `my_inbox_kinds`). |
| `components/InboxWorkspace.tsx` | THE inbox — `/notifications` (`InboxPage`, `?org_filter=`, `?view=`) and the inbox window (`windows/InboxWindow.tsx`). Rail (views + Places), grouped list, detail pane, Snoozed (with `HiddenElsewhere`) and Done views, keyboard (J/K, Enter/O, E, Shift+E, U, H, X, Z, ?), bulk, search, type filter, organization filter (default All, never the active org). |
| `components/NoticeRow.tsx` | ONE row anatomy for bell, sheet and page: unread dot, lead (avatar or type icon), actor · title, context · plain preview, time → hover Done / Snooze / ⋯; 52/64px fixed; swipe on the phone (left Done, right read). |
| `components/NoticeDetail.tsx` | Detail pane: triage bar, full body (`NotificationBody`), group members. |
| `components/HiddenElsewhere.tsx` | Snoozed view's cross-source half: snoozed/silenced assists, snoozed/dismissed tasks, snoozed record-store items — each with its way back . |
| `components/PlacesStrip.tsx` | "All places" strip and the rail's `SourceItem`. Each place's number is its count above what the person last cleared; its ⋯ holds **Clear** and **Hide from bell** (hidden places come back from "Hidden · N"). |
| `sources/registry.tsx` | THE notice-source registry : approvals, record-store work, workflows waiting, assists, tasks, HR tasks. Each opens its CANONICAL list as a window (or a new tab when the list owns the address). A new system joins here, never by editing the bell. |
| `openNotice.ts` | `useOpenNotice` — the one opener. `?panels=` → window in place; route with a window → that window; any other link → NEW TAB, announced (`notice-no-window` / `notice-no-hydrator`). Never the router. |
| `useInbox.ts` | `useInboxCounts` (badge, dot, shared seen-store), `useInboxFeed` (paged view), `useInboxActions` (optimistic triage + undo), `useWorkWaiting`. |
| `useNoticeHandlers.ts` | Row actions, once: open marks the group read (never Done-on-open), Done, Snooze, read toggle, new tab, Turn off this type (`setNotificationPreference`, in_app). |
| `presentation.ts` · `grouping.ts` | Titles (subject → event-type label → humanised key, never the raw key), plain previews, buckets, categories/icons, times; client grouping (target, or event family for updates). |
| `service.ts` | Door calls with an honest fallback to the pre-triage doors (`triage: false` → Done/Snooze/Snoozed/Done-tab absent). |

Windows that wrap canonical lists (registered in `features/overlays/definitions/registry.ts`, metadata, `OverlayWorldHost`, openers): `notificationsInboxWindow` (this workspace), `assistsWindow` (`features/assists/windows`, wraps `AssistsManager`), `workInboxWindow` (`features/unified-data/windows`, wraps records-ui `ActionInbox`, all organizations, records open in a new tab), `waitingRunsWindow` (`features/workflow-runtime/discovery/windows`, wraps `WaitingInbox`).

## The doors

Pre-triage (live since 2026-09-19): `my_notifications`, `my_notification_unread_count`, `mark_my_notifications_read`, `mark_notification_read`, `custom.inbox_counts`.

Triage (`migrations/notifications_inbox_triage.sql`, live): columns `seen_at`, `done_at`, `snoozed_until`; `config.bucket` defaults on every event type; doors `inbox_notifications(p_state, p_limit, p_before, p_unread_only, p_org_id)`, `my_inbox_summary()`, `mark_inbox_seen()`, `set_notifications_state(p_ids, p_action, p_until)`, `my_inbox_organizations()`. Snooze needs no schedule: a past `snoozed_until` reads as back, unread, sorted at that moment. Inverse: `migrations/inverse/notifications_inbox_triage_down.sql`. Still to do now that it is live: regenerate types, drop the `as never` seam, delete the pre-triage fallback and `my_notifications` / `my_notification_unread_count` (aidream `scripts/check_db_memory_budget.py` names the latter).

Clear by kind (`migrations/notifications_inbox_clear_by_kind.sql`, live 2026-10-07): `my_inbox_kinds()` (every kind in the Inbox with its count and unseen) and `clear_inbox(p_action done|read|snooze, p_event_keys text[] null = all, p_until)` → the ids it changed, for Undo through `set_notifications_state(ids, 'undone')`. Inverse: `migrations/inverse/notifications_inbox_clear_by_kind_down.sql`.

All `SECURITY DEFINER`, `auth.uid()` resolved inside, anon holds no EXECUTE, each declared in `platform.client_callable_door`.

## Invariants

- **One home.** Anything that tells a person something that they did not just do is a declared spine event, delivered to `in_app`, read here. Toasts are for the person's own action.
- 🚨 **The bell never moves the page** . The bell, the phone sheet, the inbox window and every source open a window over the page or a new tab — never the router, never a same-tab link. Guard: `__tests__/bell-never-navigates.test.tsx` clicks every control of the bell with one notice of every link kind and fails on any router call or same-tab anchor; a static half refuses `useRouter` / `next/link` / `AppLink` in the bell's tree. Shown red on the pre-2026-10-01 `InboxPanel` (5 router pushes + the same-tab footer link), green after. Opener contract: `__tests__/notice-opens-without-moving-the-page.test.tsx`.
- 🚨 **Never a number the person cannot clear**. The badge counts only what is new since the bell was opened. Every notice, every kind (`Clear a kind`, `Turn off this type` clears its kind too), the whole Inbox (`Clear all`) and every place (`Clear`, `Hide from bell`) leaves the bell in one or two clicks; hard work (38 workflows waiting) lives on its own page. Marks move only when the person opens the bell or clears — never on a refetch. Workflows waiting is compared by run id (one handled + one new shows 1); approvals, tables and assists answer only counts, so one handled + one new between two opens reads 0 until the count passes the mark (known limit, `badge.ts`). The bell reads every place once (`usePlaceStates`), so Clear all clears places folded under More too. Guards: `__tests__/the-badge-counts-only-what-is-new.test.ts`, `__tests__/a-waiting-place-clears-in-one-click.test.tsx`, `__tests__/opening-the-bell-writes-the-seen-mark.test.tsx`, `__tests__/clear-all-clears-every-place.test.tsx`, `__tests__/the-badge-asks-the-triage-doors.test.ts`; live door check `node scripts/check-inbox-doors.mjs` (`--plant` shows it red; one rolled-back transaction); live walk `scripts/bell-zero-walk.mjs`.
- **Triage to zero** . Done is the main gesture; every action is undoable (`Z`, toast Undo) and Done is recoverable from the Done view. Opening never marks Done.
- **Honest badge** . Counts only what is new and needs you or is addressed to you. Never "N unread" in the header.
- **One door to every notice system**  — the source registry; hidden things are listed in Snoozed.
- **Read is a fact the person made.** Opening a row (or its group) marks it read; never on delivery.
- **Every row opens.** A row with no link still opens into the detail pane.

## Freshness — and the named follow-on

`communication.notification` is NOT in `supabase_realtime`, and its select
policy has no recipient arm, so a `postgres_changes` subscription would join,
say SUBSCRIBED and deliver nothing — the class `pnpm check:realtime-publication`
guards. Today: refetch on window focus, every `INBOX_POLL_INTERVAL_MS` (60 s),
and after every mark-read. **Next:** a broadcast on insert (`realtime.send` to
a per-recipient private topic from the dispatcher or a trigger) consumed
through `@ai-matrx/data/realtime` — invoke the `supabase-realtime` skill first.
- **Guards beyond the above:** `__tests__/the-bell-opens-notifications-in-the-canvas.test.tsx` (the bell opens the `notifications` canvas kind, body `BellPanel variant="pane"`, in a vertical split below the tab in front; a second press closes it; no popover, phone drawer or `sheet` variant); `__tests__/absent-door-is-not-an-incident.test.ts` (a triage door with a working pre-triage fallback goes through `allowAbsentDoor` in `lib/diagnostics/supabaseErrorCapture.ts`; Done/Snooze against an absent door and every other error still capture; the stand-in announces itself once per page).
- **A short pane keeps its notices:** in a split canvas the notices keep a 96px floor and the All places strip yields first, scrolling inside itself (`BellPanel`).
- **`?panels=` notice links open their window in place;** every linked row gets Open in new tab; an unknown window key falls back loudly.
- **Web push for study reminders:** browser half `lib/pwa/push.ts` + `usePushDevice` (one row per browser in `communication.push_subscription`), push/notificationclick in the root worker (`blob-sw.js`), the "Push in this browser" switch atop Settings → Notifications (`push/PushDeviceRow.tsx`), the once-only ask on a finished study session (`features/education/reminders/StudyReminderOptIn.tsx`). Sender: aidream `services/notifications/web_push.py`.
- **`custom.inbox_counts` is set-based** (inverse `migrations/inverse/inbox_counts_one_pass_over_every_organization_down.sql`) and `useInboxCounts` reads it on `requestIdleCallback`, never on mount; it counts what waits on the person in the record store across their organizations, excluding snoozed and cleared items; the record store's own reminders (`custom.inbox.reminder`, `custom.inbox.snooze_ended`) arrive as ordinary rows. Walk: `scripts/s5prime2-badge-walk.mjs`.
- **One reader over one spine:** never re-add a second notification reader (`useNotificationBell.ts`, `display.ts`, `types/notification.types.ts` were dropped for it).
