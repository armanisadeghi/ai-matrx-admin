# Builder panel — FEATURE

The admin window that shows everything a page has and can do. Product truth:
`../common-docs/systems/platform/ui-shell/builder-panel/FEATURE.md`.

## Files

| File | Role |
|---|---|
| `hooks/useBuilderFeed.ts` | THE publish door. Admin-gated (`selectIsAdminDebugger`), JSON-copies values, skips unchanged, `prune` sets |
| `lib/redux/preferences/adminDebugSlice.ts` | `builderFeeds` store + `builderPublish` / `builderRemove` / `builderClearSurface`, `selectBuilderFeeds` |
| `features/builder-panel/types.ts` | Entry, group, ref shapes; history and size limits |
| `features/builder-panel/selectors.ts` | Feed list, route match, refs per tab, whole-feed snapshot |
| `features/builder-panel/data.ts` | `mandate.proposal` + `mandate.definition` reads; `fetchRunTruth` (`workflow.run`, `workflow.node_outcome`, `mandate.provision_snapshot` by run id / record id, and the `workflow.definition` nodes the runs used — labels, icons, `ready_when`) |
| `features/builder-panel/requestLog.ts` | Admin-only `window.fetch` log: every page request with route, method, URL, headers, body, status, raw response / stream text (secrets redacted). Installed by the sidebar Builder item and `useBuilderFeed` |
| `lib/diagnostics/loadLedger.ts` + `components/BuilderLoadTab.tsx` | **Page load** tab: every Supabase call of each page load (the one proxy in `supabaseErrorCapture.ts` records it), grouped by relation, with when it left (Before paint · Settling · Settled), repeats flagged, and the code that built the query (stack taken at `.from()`/`.rpc()`, formatted only when opened). THE LOAD LAW: only what the page shows leaves before it settles; nothing repeats |
| `features/builder-panel/requests.ts` | One ordered request list (page + server `output.requests`), the Activity timeline, `isFlowRequest` |
| `features/builder-panel/story.ts` | The run as a numbered story (`buildStory`): inputs as row 0, each run's steps in finish order, calls inside (searches grouped per engine with the exact queries), idle steps greyed with the definition's `ready_when`; `derivedFor` + `findInResponse` (the path in the raw response a derived value came from) |
| `features/builder-panel/hooks/*` | `useRequestLog`, `useRunTruth` (re-reads while a run is going) |
| `features/builder-panel/components/*` | Story sidebar + story detail (Sent · Received · What we took from it), Values list (group icons) + entry detail, Page calls, Activity, Workflow, Mandates, AI calls, Provision, proposal card; every value through `BuilderJson` (= `JsonInspector`) |
| `features/window-panels/windows/admin/BuilderPanelWindow.tsx` | The window (lazy overlay `builderPanelWindow`) |
| `features/overlays/openers/builderPanelWindow.tsx` | `useOpenBuilderPanel`, `useToggleBuilderPanel` |
| `features/shell/components/controls/SidebarBuilderToggle.tsx` | Sidebar admin item with dot + count; mobile row in `AdminMobileMenu` |

## Publishing from a page

```tsx
const builder = useBuilderFeed("marketing.brands.smart_add");
useEffect(() => {
  if (!builder.isActive) return;
  builder.publish(
    [
      { key: "input.website", label: "Website", group: "inputs", data: website, source: "typed" },
      { key: `workflow.round.${id}`, label: "Round 1", group: "workflow", data: view, ref: { type: "workflow_run", id: runId } },
      { key: `finding.${f.key}`, label: f.label, group: "derived", data: f, certainty: f.confidence, fromNodes: [f.source.node] },
    ],
    { prune: ["finding."] },
  );
});
```

- Keep the page's publisher admin-only code: import only the surface key statically and load the
  publisher with `import()` inside the admin-gated effect (Smart Add: `builderSurface.ts` +
  `builderFeed.ts`).
- Publish data exactly as the page holds it. Anything the page COMPUTED goes in group `derived`
  with `fromNodes` (the step ids whose raw output it came from). Never reshape a value for display.
- Steps, their raw outputs, every server-side external call (`output.requests`, aidream
  `request_ledger.py`) and provision snapshots need no publishing: the panel reads them from the
  database for every `workflow_run` ref (and `record` ref for snapshots of a saved record).
- `ref` drives the tabs: `workflow_run` → Workflow, Requests, Activity, Provision; `record` →
  Provision; `ai_run` → AI calls (a workflow run is never counted as an AI call);
  `provision_snapshot` → Provision; `mandate` (`mandateKey` / `provisionKey`) → Mandates.

## Layout (round 3: step first)

- **Sidebar = the run story.** Row 0 what the person typed; each run heads a section; each step
  and each external call inside it is a numbered row with its exact query or URL, status, time
  and cost. A step with one call is one row (Check the website · GET https://…). A step that did
  nothing or has no record is greyed with its reason (`waits for: name confirmed`).
- **Run tab** (a story row): Sent (exact request) · Received (exact raw response) · What we took
  from it (derived entries with `fromNodes` = the step; on a call row only those its response
  holds or its engine found, each with the response path it came from). Step input/output below.
- **Secondary tabs:** Values (every published entry, grouped with icons; Derived inside) · Page
  calls (page requests; All / Server still list every server call) · Activity · Workflow ·
  Mandates · AI calls · Provision. Round 2 tab ids `data` / `requests` map to `values` / `calls`.

## Rendering

Every value renders through `BuilderJson` → `JsonInspector` (formatted / path explorer / tree /
truncator; ONE Alchemy copy menu — JSON, text, Copy for AI — and an expand button that shows the
same inspector full size and back). No smart view, no summaries. Activity: the flow's own
requests (`isFlowRequest`), steps (time, cost, step labels), gates, run starts and provision
captures, each opening its raw record; a server call opens its story row.

## Proposals

`mandate.proposal` rows (by `surface_key`) feed the Proposed areas of Workflow (`shape_type =
workflow`) and Mandates (`shape_type = mandate`). Add one with SQL or any writer that carries an
explicit `organization_id`; nothing in code holds a proposal.

## Change log

- 2026-10-13 — round 3 (Arman: "more intuitive, don't lose any data"): the sidebar is the run as a
  numbered story; a row shows Sent · Received · What we took from it; Data → Values (group icons),
  Requests → Page calls; `JsonInspector` copy is the one Alchemy menu and panes expand to full size.

- 2026-10-13 — round 2 (Arman's review): Requests + Activity, page request log, server request
  ledger read from node outcomes, values only through `JsonInspector`, Derived group, Provision
  from the database by run id (it showed only Create's capture), all proposals in Mandates, AI calls
  no longer counts workflow runs, Workflow links the definition the run used.
- 2026-10-12 — created: publish API, window, sidebar entry, `mandate.proposal`, Smart Add consumer.
