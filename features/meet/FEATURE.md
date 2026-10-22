# Meet — calls and meetings on aimatrx.com

**Package:** [`@ai-matrx/meet`](https://www.npmjs.com/package/@ai-matrx/meet) `latest` (the installed version is in `package.json`).

Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/communications/meet/FEATURE.md — read it before touching this feature in ANY repo.

This folder is the HOST BINDING and nothing else. Every behavior — ringing, the
lobby, host controls, the stage arithmetic, device fallbacks, recording consent,
the AI seam — lives in the package. What lives here is identity injection, app
chrome, and the routes.

> The Board (`/board`) is owned by [`features/board/FEATURE.md`](../board/FEATURE.md); this doc owns the meeting's Board layout and the meeting parts only.

## Where everything is

| Piece | File |
|---|---|
| THE ONE `<MeetProvider>` mount | [`../../providers/MeetHost.tsx`](../../providers/MeetHost.tsx) |
| The two invitation handlers on `<MessagingProvider actions>` | [`../../providers/MessagingHost.tsx`](../../providers/MessagingHost.tsx) |
| `<CallButton>` — the one place a person is shown on messaging surfaces | [`../messaging/components/MessagingChrome.tsx`](../messaging/components/MessagingChrome.tsx) |
| `<IncomingCallHost>` — mounted ONCE, directly | [`../../providers/MeetHost.tsx`](../../providers/MeetHost.tsx) |
| The room, both lanes | [`components/MeetingSurface.tsx`](./components/MeetingSurface.tsx) |
| `/meetings` — Upcoming / Past / Cancelled / Archived, New meeting, Start now, row actions | [`components/manage/MeetingsHome.tsx`](./components/manage/MeetingsHome.tsx); data [`hooks/useMeetingsDirectory.ts`](./hooks/useMeetingsDirectory.ts) |
| `/meetings/[id]` — the meeting's home (details, guests, occurrences, settings, record); `chrome="embedded"` is the same home on a Board tile (sections + actions in a strip) | [`components/manage/MeetingDetail.tsx`](./components/manage/MeetingDetail.tsx) |
| The meeting's agent surface `matrx-user/meeting` — values (meeting, guests, plan, settings, and after it happened the record: summary, decisions, action items, notes, transcript excerpt) and write targets `meeting_title`, `meeting_agenda`, `ai_note_taker` through `useMeetingActions`; mounted by `MeetingDetail`, so the page and a Board tile share it | [`agent-surface/MeetingSurfaceHost.tsx`](./agent-surface/MeetingSurfaceHost.tsx), `features/surfaces/manifests/meeting.manifest.ts` |
| The one meeting form (create / edit / reschedule / duplicate) + repeat editor | [`components/manage/MeetingFormDialog.tsx`](./components/manage/MeetingFormDialog.tsx), [`RecurrenceEditor.tsx`](./components/manage/RecurrenceEditor.tsx); model [`lib/meeting-draft.ts`](./lib/meeting-draft.ts), [`lib/recurrence.ts`](./lib/recurrence.ts), [`lib/zoned-time.ts`](./lib/zoned-time.ts) |
| Every management write + `announce` | [`hooks/useMeetingActions.ts`](./hooks/useMeetingActions.ts); dialogs dispatched by [`components/manage/useMeetingActionHost.tsx`](./components/manage/useMeetingActionHost.tsx) |
| Guests (invitees + RSVP), used by the page AND the Invite panel | [`components/manage/MeetingGuests.tsx`](./components/manage/MeetingGuests.tsx), [`GuestPicker.tsx`](./components/manage/GuestPicker.tsx) |
| RSVP: in-app Going? / pre-join / the emailed-link page `/rsvp/[secret]` | [`components/manage/RsvpControl.tsx`](./components/manage/RsvpControl.tsx), [`PreJoinRsvp.tsx`](./components/manage/PreJoinRsvp.tsx), [`components/rsvp/RsvpLanding.tsx`](./components/rsvp/RsvpLanding.tsx) |
| The Invite panel (link, invitation, calendar, invite people) | [`components/invite/`](./components/invite/) (`MeetingInviteButton`, `MeetingInviteDialog`); text + calendar event in [`lib/invitation.ts`](./lib/invitation.ts); calendar links/.ics in [`../../lib/calendar/eventLinks.ts`](../../lib/calendar/eventLinks.ts) |
| The meeting RECORD after `ended_at` | the package's `<MeetingRecordView>`, routed to by `<MeetingSkinRoot>` — nothing here |
| Room ⇄ Board layout choice (connected phase only; per viewer, this browser) | [`components/MeetingLayout.tsx`](./components/MeetingLayout.tsx) |
| One meeting, one box: the home and the live room in the same place (Board meeting tile) — Join switches to `MeetingSurface chrome="embedded"` (stage contained by `--mx-meet-height: 100%`, @ai-matrx/meet 0.7.78), Leave or Details returns; the home stays mounted so its agent surface keeps answering | [`components/MeetingHomeAndRoom.tsx`](./components/MeetingHomeAndRoom.tsx) |
| The Board layout — the person's own Board (`UserBoard`) as a saved board linked to the meeting + floating people strip + captions; the "Meeting notes" parts are a registered board item type | [`components/board/`](./components/board/) (`MeetingBoard`, `PeopleStrip`, `MeetingNotesBodies`, `useGuestMeetingBoard`, `LayoutSwitch`), `features/board/items/meeting-items.tsx` |
| One meeting + invitees + occurrences, one read per meeting per tab, in Redux by meeting id — the meeting's home, a meeting tile, its "Meeting notes" parts and the surface all select it; a wake or remount reads nothing (plus the meeting templates per organization and person) | [`redux/meetingsSlice.ts`](./redux/meetingsSlice.ts), [`hooks/useMeetingById.ts`](./hooks/useMeetingById.ts), [`hooks/useMeetTemplates.ts`](./hooks/useMeetTemplates.ts) |
| The meeting, live: one channel per meeting per tab (ref-counted, `openShared`) — an edit elsewhere (newer `version`) re-reads the meeting, a guest's RSVP re-reads the guest list, a reconnect re-reads; held by `useMeetingById` and by the Board tiles' `Keep` so a sleeping tile stays current | [`hooks/useMeetingLive.ts`](./hooks/useMeetingLive.ts) |
| An existing meeting runs in its own organization, never the active one (the app-wide `<MeetHost>` is bound to the active org) | [`components/MeetingOrgScope.tsx`](./components/MeetingOrgScope.tsx) |
| A signed-out visitor at `/meetings` sees the truth and one door (joining never needs an account) | [`components/SignedOutMeetings.tsx`](./components/SignedOutMeetings.tsx) |
| Keep your notes: a guest looking at a finished record is offered a free account (`POST /v1/meet/claim`) | [`components/KeepNotes.tsx`](./components/KeepNotes.tsx), [`lib/guest-claim.ts`](./lib/guest-claim.ts) |
| Meet app panels: a meeting's `metadata.app_panel` key opens the panel registered here beside the call, loaded on demand | [`app-panels/registry.tsx`](./app-panels/registry.tsx) |
| Where each Meet job runs, drawn on `/intelligence/meet` (proved by `features/mandates/feature-intelligence/__tests__/declared-places.test.ts`) | [`intelligence-places.ts`](./intelligence-places.ts) |
| aidream base URL | [`lib/meetBaseUrl.ts`](./lib/meetBaseUrl.ts) |
| Stylesheets (tokens → brand → structure) | `app/layout.tsx` imports 1 and 3; the brand map is the `--mx-meet-*` block in `app/globals.css` |

## Routes

| Route | Group | Why |
|---|---|---|
| `/meet/[slug]` | **`(meet)`** — a NEW chrome-free group | `(core)` renders `AppShell` (wrong for a stage, and a guest has no org to switch); bare `(public)` renders the marketing header/footer AND seeds no `initialReduxState`, so a signed-in person would arrive as a Redux guest with an inert `<MeetHost>`. `(meet)` is the `(kiosk)`/`(portal)` shape plus `getServerAuth()` + `initialReduxState`. Header of [`app/(meet)/layout.tsx`](<../../app/(meet)/layout.tsx>) carries the full evidence. |
| `/meetings`, `/meetings/[id]` | `(core)` | Managing meetings is ordinary signed-in work and wants the shell. |
| `/rsvp/[secret]` | `(link)` | The emailed Yes / No / Maybe link: a link somebody was SENT, often to a person with no account — no shell, no marketing chrome, `noindex`. |

`/meet/*` is deliberately **ungated**: `utils/auth/protected-routes.ts` is a
denylist and names no `/meet` family, so `proxy.ts` never bounces it to `/login`
(verified 2026-09-08). That absence IS the guest path (D6) — do not "fix" it.
The `(meet)` group is absent from `PARKABLE_GROUPS` in `next.config.js`, like
`(kiosk)` and `(portal)`: a durable link must resolve in whatever build is
deployed. The satellite hosts still hand `/meet/*` back to the main origin.

## The laws this binding keeps

- **No agent id in code, and no prop to put one in.** Since `@ai-matrx/meet`
  0.3.0 every meeting capability is a Mandate the SERVER resolves at run time
  (`meet.live_notes`, `meet.live_intelligence`, `meet.wrap_up`), so this app
  injects nothing at all and an organization rebinds a job in the Mandate admin
  with no deploy here. `lib/meetMandates.ts` and `lib/useMeetIntelligences.ts`
  are DELETED; a Mandate with no Holder now produces the server's own refusal on
  the meeting screen, which is more honest than a control that never appeared.
- **Every write carries an explicit `organization_id`** — the package's RPCs take
  it, and `/meetings` refuses to render the form until an org is active.
- **A guest is a first-class identity.** The guest provider is room-scoped, has
  no session and no call center; `<CallButton>` renders nothing for it by the
  package's own rule.
- **Nothing dead, nothing lying.** Every state on these surfaces has a sentence:
  no org, no meet host, an unresolvable slug, an inert provider.
- **A guest who attended can read what the meeting produced, and NOTHING here
  decides how much.** `@ai-matrx/meet` 0.5.0 (MRF-1): `useMeetingRecord` picks
  the guest door by itself — `GET /api/v1/meet/record`, authorized by the room
  token that device kept, with the shared subset resolved server-side from the
  meeting's own setting, then the organization's `meet.guest_record_access`
  knob, then the platform default `summary`. This repo changed **nothing** for
  it: `GuestRoom` already mounts the provider with the resolved meeting row and
  `<MeetingSkinRoot>` already flips to the record when `ended_at` is set. An
  administrator changes the organization's answer at
  **/administration/users/limits → Feature knobs**; a host changes one meeting's
  from the record view or the People panel.

## Zero wrappers (and why that is the point)

**There is no host code here that stands in for a package defect.** `<PreJoin>`, `<IncomingCallHost/>`, `<CallButton/>` and `<MeetingSkinRoot>` are mounted directly and render nothing or an honest sentence on their own while the provider is inert; `<MeetProvider client={supabase}>` and `createMeetRepository({ client: supabase })` take the app's own client with no cast; the package renders its own note-taker consent banner and People-panel row for every participant (D10); there is no `agents` prop and no `transport` prop. Do not re-create `lib/meetClient.ts`, `components/MeetCallSurfaces.tsx`, `lib/meetMandates.ts`, `lib/useMeetIntelligences.ts` or a host-side consent notice.

If a future defect tempts a fifth wrapper, the answer is the same: fix it in the package, release, adopt — never a crossing in here.

## Management — Meet wave 1 UI (2026-09-27)

Bar: Google Calendar's agenda + event page and Zoom's Meetings page. Backend: aidream
`services/meet/FEATURE.md` § Management; package `@ai-matrx/meet` ≥ 0.7.3 (repository wave-1
doors + `announceMeeting`).

- **The client writes, the server tells.** Every write is a `communication.meet_*` door through
  the package repository (`useMeetingActions`); after a write invitees should hear about,
  `announceMeeting` sends the invitation / update / cancellation email with its `.ics`.
  "Email guests…" is ON by default on every form and dialog. A failed telling says the meeting
  IS saved.
- **`/meetings` lists the reader's OWN meetings** (host, co-host, invitee) — RLS is the ceiling,
  not the view: a platform admin can read every meeting, so the list scopes by role
  (`agenda.inScope`, `useMeetingsDirectory`). Upcoming = `meet_occurrences_between` (the database
  expands series; moved rows marked, a canceled occurrence struck through), grouped by day **in
  the viewer's zone** with the zone named; instant meetings started in the last 12 h are
  "Happening now" (older unended rooms go to Past). Tabs are `?tab=` in the header's
  `RouteModeNav`; search + whose-meetings + zone share one toolbar row.
- **Reading needs no organization** (access is personal): without one the Meet provider is inert,
  so reads use a plain `createMeetRepository({ client })` + the signed-in id. **Writes HOLD**: New
  meeting / Start now / row writes open the organization picker (`ensureOrganizationContext`)
  and continue once one is set.
- **The form shows the person's own defaults** (`platform.knob_resolve` over the `meet.default_*`
  knobs, `useMeetDefaults`) and sends only settings they changed, so an org default still moves
  every meeting nobody overrode. Time zone defaults to the browser's; the wall clock is authored
  in the meeting's zone (`lib/zoned-time.ts`, no date library).
- **Recurring = one row, one link.** The repeat menu offers the start's own presets (Weekly on
  Tuesday, Monthly on the first Tuesday…) and Custom (interval, weekday chips, day-of-month or
  Nth weekday, ends never / on / after N) → the RRULE subset `meet_rrule_parse` accepts
  (`lib/recurrence.ts`). Edit/Reschedule from an occurrence ask "This occurrence" (an exception
  row via `meet_set_occurrence` move) or "All occurrences" (the series shifts by the same amount);
  Cancel asks the same. Title, agenda, guests and settings are series-wide.
- **Guests** are the invitees door (`meet_add_invitees` → account resolution + share grant; co-host
  = admin grant via "Make co-host"); removing archives the grant and revokes the RSVP link. The
  guest list shows each answer and whether they were emailed; "Email invitation to N guests"
  covers anyone not yet told. A true per-person RESEND is not available (announce only sends what
  a person has not been told) — named, not built.
- **RSVP** three ways: in-app Going? on the meeting page and the pre-join screen (invitees only)
  goes through aidream `POST /api/v1/meet/meetings/{id}/rsvp` (`lib/in-app-rsvp.ts`), which writes
  `meet_respond` for the caller and notifies the host of a changed answer; a server without that
  route (deploy lag) falls back to the door with a console warning; the emailed link `/rsvp/<secret>` reads `meet_invitation_by_token` and answers
  through aidream `POST /api/v1/meet/rsvp` (secret in the body) so the host is notified
  (`meet.rsvp_received`). The clicked answer rides `?answer=` and is sent once the page is on
  screen (a scanner fetching the URL runs no script).
- **Calendar links carry the rule** (`lib/calendar/eventLinks.ts`): Google gets `recur` + `ctz`,
  the `.ics` writes `DTSTART;TZID=` + `RRULE` (a date-only UNTIL becomes end of day UTC), and the
  UID is the server's `<id>@meet.aimatrx.com` so importing both is one event. Outlook on the web
  cannot take a series from a link, so that button is absent for one (the `.ics` covers Outlook).
  Exceptions (EXDATE) are only in the server's emailed `.ics`.

## After the meeting — Meet wave 3 (2026-09-27)

Bar: Zoom's recording page (video beside a searchable transcript) + Google Meet's notes doc.
Package `@ai-matrx/meet` ≥ 0.7.7 (`core/after.ts`, repository `myRecordings` / `searchMeetings`
/ `renameRecording` / `setRecordingArchived`); server `followup.py` (aidream FEATURE § After the
meeting). UI lives in [`components/record/`](./components/record/).

| Piece | File |
|---|---|
| `/meetings/[id]?tab=record` — video + Transcript / Chat / People side panel, summary, decisions, action items, notes, ask, guest access, Export, Email recap. `?t=<line>` / `?note=<note>` deep-link, `?recap=1` opens the recap | `MeetingRecordWorkspace.tsx` |
| Seekable player (the package's file-session / bytes lane via `host.api.fileMedia`) | `RecordingSeekPlayer.tsx` |
| Transcript: search within (count, prev/next), click a line's time to play from it, follow-along | `TranscriptPanel.tsx` |
| Action items → `projects.tasks` (one with owner + due date, or all); provenance `source_type='meet_note'`, `source_id` = the note, `dedupe_key='meet_note:<id>'` (the org+dedupe unique index = no duplicates); status read back on focus | `ActionItemsSection.tsx`, `hooks/useActionItemTasks.ts` |
| Attendance (as what, joined / left / time, totals, CSV) | `AttendancePanel.tsx` |
| Saved chat after the meeting | `ChatLogPanel.tsx` |
| Export: notes (copy / .md / Word / PDF via `@ai-matrx/print/document`), transcript (copy / .txt / .vtt / Word), attendance CSV | `RecordExportMenu.tsx` |
| Recap email: server draft from the wrap-up, host edits + picks recipients, "Check delivery" = dry run, Send only on click | `RecapDialog.tsx` |
| "Share with everyone in the meeting" — host / co-host only, in the record bar beside Email recap; `?share=1` (the meeting-end offer notice) opens it. The group-sharing primitive (access ladder T-32) lives in `features/sharing/audience/` | `MeetingRecordWorkspace.tsx` → `ShareWithAudienceButton` |
| `/meetings?tab=recordings` — library (state, play in place, download, Share… on the file, rename, archive/restore via `ArchiveFilter`) | `RecordingsLibrary.tsx` |
| `/meetings` search also searches inside meetings (agenda, summary, decisions, action items, transcript) → hit opens the line | `MeetingContentSearch.tsx` |

Without an active organization the workspace says so and offers the picker (the recording,
chat and recap ride the org-aware Meet client). The public `/meet/<slug>` record is still the
package's `MeetingRecordView`.

## Before and after the meeting — Meet wave 4 (2026-09-27)

Bar: Google Calendar's agenda + Find a time, Zoom's templates and Workflows, Salesforce/HubSpot
meeting logging. Server: aidream `services/meet/FEATURE.md` § Meet wave 4. No package change —
everything here is the host (the package publishes nothing new for it).

| Piece | File |
|---|---|
| Synced Google / Outlook events in Upcoming — timed, not declined, not an AI Matrx meeting already listed; marked with their calendar and call provider; click opens the calendar event (item presentation `calendar_event`); menu: "Open/Move to AI Matrx, with the note-taker" (the New meeting form prefilled: title, time, length, guests), "Open the call link", the honest line "Zoom call — the AI note-taker joins AI Matrx meetings only."; toolbar switch "Calendar events" = the person's knob `meet.show_external_calendar_events` | `components/manage/MeetingsHome.tsx` (`ExternalEventRow`), `hooks/useExternalEvents.ts`, `lib/external-events.ts` |
| Find a time — host + every guest with an account; free/busy only (`communication.calendar_free_busy`); first N slots in the host's working day (knobs `working_hours_*`, `working_days`, `find_time_*`); says whose calendar was not checked and why | `components/manage/FindTimePanel.tsx`, `hooks/useFindTime.ts`, `lib/find-time.ts`, knobs `hooks/useMeetPlanningKnobs.ts` |
| Draft agenda (form) and Prepare (meeting page header + Details "Brief") — aidream streams, the stream is ADOPTED (`adoptForeignStream`) and shown in the floating LiveRunWindow; a refusal (nobody assigned yet, AI off) is the server's sentence + remedy | `hooks/useMeetPrepStream.ts`, `MeetingFormDialog.tsx`, `MeetingDetail.tsx` (`BriefBlock`) |
| Templates — "From a template" in the New meeting header; "Save as template…" in the meeting's "…" (just for me / everyone in the organization when the knob's door allows); delete from the same dialog. Knob-backed: `meet.personal_templates` (user), `meet.templates` (org) | `lib/meeting-template.ts`, `hooks/useMeetTemplates.ts`, `components/manage/SaveTemplateDialog.tsx` |
| After the meeting — workflows picked with the ONE workflow picker, on the form's and the page's Settings; saved to `metadata.after_meeting_workflows` through `mergeJsonColumn`; what ran (run doors) and the CRM log (contact/company doors) read back from `metadata.after_meeting` | `components/manage/AfterMeetingWorkflows.tsx`, `useMeetingActions.setAfterWorkflows`, `MeetingDetail.tsx` (`CrmLogLine`) |

Guards: `lib/find-time.test.ts`, `lib/external-events.test.ts`, `lib/meeting-template.test.ts`.

## The Invite panel (2026-09-27)

One panel, opened from **Invite** in the room header (`headerControls`, both
lanes), the top-right corner before joining (`MeetingLayout` `preJoinControls` —
the package draws no header there; an invitee also gets **Going?** there), every
`/meetings` row menu and the meeting page. It offers: the link with **Copy link**
and **Share…** (`useShare`), a ready-to-paste **invitation** (title, time in the
meeting's zone with length, the repeat rule in words, link, agenda, "No account
needed…") with Copy invitation and Email invitation (`mailto:`), **Add to
calendar** (Google, Outlook for a one-off, `.ics`) with the repeat rule, and
**Guests** — the same `MeetingGuests` as the meeting page.

Guests are the meeting's INVITATION LIST, never raw share grants: no
Viewer/Can-view picker, no "add everyone in an organization". An invited account
gets the viewer grant from the door (so it skips the waiting room); co-host is the
only role, set with "Make co-host". Only the host or a co-host sees the controls;
anyone else sees the list and a sentence.

The share notification's door: `meet_meeting.hrefFor` → `/meet/<id>`;
`MeetingSurface` reads a uuid-shaped path as a meeting id and replaces the
address with `/meet/<slug>`.

## The Board layout (2026-09-27)

While connected, a person can swap the package's room for a **Board**: the
person's own Board — `UserBoard`, the same host `/board` renders, with every item
type, tool, shelf, layers, undo, drop/paste and the board's agent tools — fills
the stage, people and captions float over it in screen space, and the board
opens on a "Meeting notes" frame of live parts (transcript, notes, decisions,
action items, summary). Rules:

- **Only the connected room is swappable.** Pre-join, lobby, a failed join,
  leaving and the post-meeting record always render through `<MeetingSkinRoot>`.
  The room engine lives in the provider's store, so switching never rejoins.
- **Composed, not re-implemented.** `ConsentNotice`, `AttendanceNotice` and
  `RecordingIndicator` render in the Board for every participant exactly as the
  package ships them; faces are `ParticipantTile` ordered by the package's
  `orderParticipants`; `Captions` and `ControlBar` (with its chat, people and
  Meeting-assistant panels) are the package's — imported from the Meet skin's
  parts, `@ai-matrx/meet/skins/meet` (S1); hooks and the record stay `/react`. The root carries the package's
  `mx-meet` class so those pieces sit in their own structure and tokens.
- **The meeting's board is a SAVED BOARD** (2026-10-02): the viewer's own
  `projects.boards` row with `settings.meeting_id` (`getMeetingBoard`,
  through `useSavedBoard({ meeting })`), created on first open with the Meeting
  notes frame (`meetingNotesDocument`) in the organization new work is filed in
  (none chosen → the organization gate asks). It autosaves like `/board`, is
  listed in All boards and opens at `/board/<id>` (the header's open icon).
  The database holds one live board per person per meeting (index
  `boards_one_board_per_person_per_meeting`); `getMeetingBoard` creates with the
  link in the same insert and re-reads the winner of a refused duplicate, so two
  tabs never make two. The header carries a **Notes** button (flies to the
  Meeting notes frame) and a **Live** badge while the room is in call; each
  meeting-notes tile's "…" menu has **Send to Notes** (a new note holding the
  part's reference).
  What a person adds is theirs alone — nobody else in the meeting sees it.
  A **guest** has no account: the same document is kept in this browser
  (`matrx.meet.board.v2.<meetingId>`, `useGuestMeetingBoard`).
- **Meeting notes are a board item type** (`meeting_part`, one part of one
  meeting): the live AI seam (`useMeetAi`) while this tab is in that meeting's
  room, the durable record (`useMeetingRecord`; action items through the Record
  tab's `ActionItemsSection`) anywhere else — so any board can hold a meeting's
  decisions. Surface: `matrx-user/meeting` via `MeetingSurfaceHost`. Bring in:
  "Meeting notes" (this meeting's parts first, or pick a meeting).
- **The layout choice** is per viewer, this browser (`matrx.meet.layout`, default
  `room`); blocked storage = the default.
- **Host menu:** the package's `HostMenu` (lock / end for everyone, @ai-matrx/meet
  0.7.5) renders in the Board header for hosts — the "Host controls" hop back to
  the Room layout is gone.
- **Meet wave 2 arrives through `ControlBar`** in both layouts: reactions, the
  hand queue, per-person menus (mute / ask to unmute / stop video / spotlight /
  co-host / make host / rename / remove / report — all server-decided), saved
  chat + private messages, audio/video/effects settings, keyboard shortcuts.
  Package doc: `aidream/apps/shared/meet/FEATURE.md` § In the meeting.

## In the meeting and after — Meet wave 5 (2026-09-29)

Polls, Q&A, the shared whiteboard, breakout rooms and translated captions all live in
`@ai-matrx/meet` (the Activities control in the package's `ControlBar`, so the Room and the
Board layout both have it; server `aidream/services/meet/collab.py`, `breakouts.py`,
`captions.py`). This app adds nothing in the room. After the meeting, the record's right side
has an **Activity** tab (`components/record/ActivityLogPanel.tsx`): poll results, every question
with its answer, and the whiteboard as it was left, read through the package's
`loadMeetingActivities` (`GET /v1/meet/collab`) — what a reader sees is the server's decision.

## Change log

- 2026-10-22 — One row of chrome (platform component review): the embedded `MeetingDetail` bar no longer prints the meeting name (the host does: the Board tile header, or the admin strip via `onMeeting`) and the details body keeps the title only for screen readers. The bar is sections + state + the main button (Join / Start / Open record) + Invite, and every other action sits in ONE "…" menu, the shared `RecordActionsMenu` (`components/official/`, canonical v3 `ItemMenu`); the page's "…" uses it too. Guard: `components/manage/__tests__/one-row-chrome.contract.test.ts`.
- 2026-10-22 — The embedded bar is the shared `HostedRecordBar` (`features/shell/host-chrome`): the meeting name drops only when a host naming this meeting holds it — the Board tile, and the admin meeting view (`AdminMeetingDetail` wraps it in `RecordHostChrome host="frame"`); any other embedded host keeps it.
