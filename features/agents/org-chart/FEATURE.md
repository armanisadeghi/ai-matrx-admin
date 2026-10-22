# FEATURE.md — agent org chart

**Status:** `active`
**Tier:** `2`
**Last updated:** `2026-10-22`

---

## Purpose

Shows how an organization's agents are arranged: who sits under whom. 2026-09-27: a high-value
employee becomes 50–100 agents, and Orchestras already work like an org chart (managers over managers
over the ones doing the work), so the chart is real structure, not decoration.

## Boxes and links

**Boxes** (any can sit under any): **Agent** (an Orchestra's Conductor is an agent),
**Person** = a `membership` (their place in ONE organization — `iam.has_access` has no rule for a
bare `user`), **Team** (`iam.team`), **Position** (`agent.position`, a named seat a person may
fill — vocabulary row ruled 2026-10-04). Box ids are `type:entityId` (`constants.ts`).

**Link types** are a registry (`ORG_LINK_KIND_META`), not code paths:

| Type | Tree or arrow | Enforced? | Drawn as |
|---|---|---|---|
| **Directs** | tree | yes — an Orchestra; derived from its member edges | solid `--primary` |
| **Reports to** | tree (one manager per box) | no | dashed `--warning` |
| **Hands off to** | arrow across the tree | no — work passes on and doesn't come back | `--success` arrow |
| **Dotted line** | arrow across the tree | no — advises, no authority | dashed muted arrow |

## Data — no new link table

- Directs links ARE the Orchestra member edges (`features/agents/docs/ORCHESTRAS.md`).
- Every other link: `platform.associations`, **role `org_chart`**, source = the box above (or the
  arrow's start), target = the box below (or its end), type in `metadata.link_kind`. All 16 pairs of
  {agent, membership, team, position} are registered in `platform.association_types` (no access
  conveyed). Written only through `associationsService` via `orgChartService.ts`.
- One recorded manager per box; a tree loop is refused (read fresh from the server); hand-offs may loop.
- Positions: `positionsService.ts` (canonical entity, certified; `agent` schema because `iam` is
  write-through-doors only). A new position lands in the active organization, shown and changeable in
  the picker — never a silent wait on the organization gate.
- Redux: `orchestras.manualOrgChart` (links + positions). Refreshes MERGE; links leave the store only
  through the remove thunks (a read racing a save once erased a new link).

## Entry points

- `/agents/org-chart` — the whole chart the viewer can see (`components/AgentOrgChartPage.tsx`).
- `/agents/orchestras/[conductorId]?view=chart` — the chart rooted at one Conductor.
- The Orchestra builder **canvas** shows each member's own team (nested Orchestra and manual reports)
  beneath it, read-only, with a "Team of N" toggle (`OrchestraBuilderCanvasImpl.tsx`).
- `/agents/orchestras` header → "Org chart".

## How it is built

- `buildAgentOrgForest.ts` (pure, tested) turns Orchestras + manual links into the forest. An agent
  under several parents appears under each and says how many other places it holds; a loop is cut where
  it closes and labeled; an agent only reachable inside a loop still gets a tree.
- `useAgentOrgChart.ts` loads level by level: Orchestra list → every reachable Orchestra's members →
  manual links of every reachable agent, until nothing new appears.
- `useOrgChartActivity.ts` — live activity on every agent box: running (×N), stalled, or how its last
  run ended and when. Read from `chat.user_request` (row security decides which runs a viewer sees),
  kept live by one realtime channel (the table is in the `supabase_realtime` publication), re-read on
  reconnect. Knobs: `agents.org_chart.activity_window_hours`, `agents.org_chart.stalled_after_minutes`.
  Cards read it through context, so a status tick never re-lays the chart.
- **The open-position ladder** (vision: `common-docs/systems/agents/org-chart/VISION.md`). A position
  is a seat: noted (name + description) → "Define the job" (`components/DefineSeatJobDialog.tsx`: goal,
  what it's given, what it hands back) creates an ORGANIZATION soft mandate in the seat's
  organization through `createSoftMandate` and links it (`agent.position.mandate_id`) → the job opens
  IN PLACE (`useOpenMandateWindow`), where the goal writer, Create Agent and Test already live. The card
  derives its rung from the job (`positionsService.readSeatJobs`: default Holder or a live agent
  binding): Noted / Needs an agent / Agent at work / Job off. Seat jobs re-read when the job window
  closes and on mandate-cache invalidation.
- **A department from a description** (vision rule 5; `department/PlanDepartmentDialog.tsx`). "Plan a
  department…" on any box's menu (or "Add to chart" → "Plan a department…" for the top of the chart):
  the person describes it in plain words → `org_chart.department_planner` (kind `department_plan`,
  headless JSON) proposes seats → they rename, remove, add, re-parent and edit each seat's goal /
  inputs / output → Create makes the positions in the box's organization (a position box's own, else
  the active one), placed under the box (and under each other per `reports_to`, managers first —
  `department/departmentPlan.ts`, pure + tested), each with its job through `seatJob.ts`
  `createSeatJob` (the same door as "Define the job"). Optional next steps: "Build their agents"
  (`seatAgent.ts`: `mandates.holder_draft` → `createAgentFromBuilder` owned by the organization →
  the job's default Holder; per-seat progress, each failure named with Retry, a made-but-unbound
  agent is re-bound, never rebuilt) and "Put them in an Orchestra" (leader in the same organization
  under the box, the built agents as members, prompt synced). "Undo" archives the batch's positions
  (toast Restore).
- The drawing is the shared `components/official/org-chart/OrgChart.tsx` — THE org chart primitive for
  any hierarchy (layout adapted from Paperclip, MIT, credited in `layout.ts`). Never a second one.
  Its consumers: this chart and HR's `/hr/people/org-chart`. What it offers both: `forest.ts`
  (`buildParentForest` — flat parent rows to a forest, cycle-safe, optional deterministic sibling
  order), one PNG/PDF export (`exportChart.ts`; `exportCaption`/`exportFileName` override the burned
  caption and file name, a success toast names the file), and `framing="once"` for charts redrawn
  for another date.

## Published charts (share and publish)

- **Publish** (toolbar; a box's menu → "Publish this branch…") opens `components/PublishChartDialog.tsx`:
  title, address (slug), blurb (ProTextarea; **Suggest** runs the `org_chart.publish_blurb` mandate,
  kind `org_chart_blurb`, headless JSON — an idea, never a decision), a live preview, Publish / Update /
  Take down, Copy link (kit clipboard door).
- Storage: `agent.org_chart_publication` (certified entity, org = the active organization). What is
  stored is a SNAPSHOT (`publish/snapshot.ts`, pure + tested, kind `org_chart_snapshot`): names, title
  lines, box types, link kinds, public avatars only — never emails or record ids (opaque keys `b1…`).
  Publishing is the row's `published_to_web` (the anonymous lane; columns pinned in
  `lib/security/public-exposure.ts`). Republish replaces in place; take down turns the lane off.
- The page: `app/(link)/chart/[slug]` — `(link)` because it is a link somebody sent (no marketing
  chrome), but indexable: metadata, canonical, OG image (shared branded renderer), JSON-LD ItemList.
  Drawn by the ONE `OrgChart` primitive read-only (`publish/PublishedOrgChart.tsx`, motion-safe
  animate-in). Comments: the canonical `CommentThread` on token `org_chart_publication` — any signed-in
  person may comment on a published row of a type listed in `iam.public_rows_take_comments` (the access
  kernel's public arm). "Message the creator": `sendDirectActionMessage` with an `open_link` back to the
  page. Signed-out visitors get sign-in links that keep their place.

## Change log

- 2026-10-16 — The primitive is now the only org-chart renderer: HR's chart draws through it. Added
  `buildParentForest`, export caption/file-name overrides, a success toast on export, `framing`.

- 2026-10-05 — Removal: every card's menu ends with "Remove from the chart…" (all recorded links,
  Undo; Orchestra membership stays and the confirm says so) and "Archive agent/team/position…"
  (archived records keep their links and are simply not drawn; Undo restores). Multi-select removes
  many at once. Both ways to make an Orchestra; seat-job Suggest.

- 2026-10-05 — Open-position ladder rungs 1–4 live (define the job → mandate → build its agent → the
  seat reads "Agent at work"). Health check menu. Suggestions at rung 2 and the department-from-a-
  description summit are parked in the node task list.

- 2026-10-05 — Live activity across the whole chart (any run the viewer may see, from any surface).
  Second review fixed: a canceled drag never unplaces; a touch hold no longer also opens the menu;
  remembered view per chart; removed or re-typed links are not undone by an older read; a failed
  placement keeps the pair's hand-off; directory failures shown with Retry; fill picker scoped to
  the position's organization.

- 2026-10-04 — Link types as a registry (directs / reports to / hands off to / dotted line);
  drag to move with Undo, multi-select, right-click, "+", keyboard, branch focus, deep links,
  remembered view; Person (membership), Team and Position boxes with one picker; positions
  (`agent.position`) with rename / fill / delete; `@ai-matrx/associations` 0.13.146.

- 2026-09-28 — Separate trees wrap into rows to fit the screen; phone layout fixed (the chart layer opts
  out of the phone `max-width: 100%` default that collapsed cards); canvas teams reuse the shared stacked
  layout with one trunk line; independent review findings fixed (safe moves, whole reads past the
  1000-row cap, loop check read fresh from the server, failed Orchestras say so).
- 2026-09-27 — Created (Claude Opus 5.5, with Arman): automatic + manual links, one UI, nested
  Orchestras on the builder canvas.

## People in Orchestras and seat gates (2026-10-18)

- **A person is an Orchestra member by the seat they hold.** Drop a position box on a Conductor →
  "Add to the … Orchestra" (`orchestrasService.addSeatMember`: a `member` edge agent → `position`).
  The run asks whoever holds the seat when it reaches them and waits for the answer (aidream
  `services/orchestras/FEATURE.md` § Seat members). Seats load with the Orchestra
  (`OrchestraDetail.seats`) and sit under the Conductor as **Directs**. Delete takes the seat out.
- **Refused at save time for a Supervisor Orchestra** (`seatMemberRefusal`): adding a seat to one, or
  switching an Orchestra that seats a person to Supervisor, is refused with the reason in words.
- **A position box shows its holder** ("Filled by …", their avatar) and, when a workflow decision is
  waiting on that seat, a "Decision waiting" chip that opens the run (`seatGates.ts`; from the one
  waiting-on-you projection `useWaitingRuns`, so a viewer sees gates on runs they can reach and every
  gate that asked them). An empty seat's chip is red with "No one holds …". The decision panel prints
  the same seat line above the items.

## Change Log

- **2026-10-22** — Department from a description: "Plan a department…" (planner mandate
  `org_chart.department_planner`, kind `department_plan`), batch seats + jobs + agents + Orchestra,
  Undo. Seat-job creation extracted to `seatJob.ts`; job fields are ProTextarea.
- **2026-10-22** — Published charts: Publish dialog, `agent.org_chart_publication`, `/chart/[slug]`
  with comments and "Message the creator", blurb mandate `org_chart.publish_blurb` (lane ORG-CHART-PUBLISH).
- **2026-10-18** — Seat members in Orchestras (drop a position on a Conductor; supervisor refused at
  save time), the "Decision waiting" chip on position boxes, the seat line on the decision panel.
