# Builder panel — FEATURE

The admin window that shows everything a page has and can do.

Cross-repo system-of-record: /Users/armanisadeghi/code/common-docs/systems/platform/ui-shell/builder-panel/FEATURE.md — read it before touching this feature in ANY repo.

## Files

| File | Role |
|---|---|
| `hooks/useBuilderFeed.ts` | THE publish door. Admin-gated (`selectIsAdminDebugger`), JSON-copies values, skips unchanged, `prune` sets |
| `lib/redux/preferences/adminDebugSlice.ts` | `builderFeeds` store + `builderPublish` / `builderRemove` / `builderClearSurface`, `selectBuilderFeeds` |
| `features/builder-panel/types.ts` | Entry, group, ref shapes; history and size limits |
| `features/builder-panel/selectors.ts` | Feed list, route match, refs per tab, whole-feed snapshot |
| `features/builder-panel/data.ts` | `mandate.proposal` + `mandate.definition` reads; `fetchRunTruth` (`workflow.run`, `workflow.node_outcome`, `mandate.provision_snapshot` by run id / record id, and the `workflow.definition` nodes the runs used — labels, icons, `ready_when`) |
| `features/builder-panel/requestLog.ts` | Admin-only `window.fetch` log: every page request with route, method, URL, headers, body, status, raw response / stream text (secrets redacted). Records only while debug mode is on (`setRequestRecording`); off drops everything kept |
| `features/builder-panel/hooks/useBuilderRecording.ts` | THE recording switch: an admin with debug mode on. Drives the request log; `useBuilderFeed` publishes only while it is true; the debug-mode reducer drops every feed when debug turns off |
| `lib/diagnostics/loadLedger.ts` + `components/BuilderLoadTab.tsx` | **Page load** tab: every Supabase call of each page load (the one proxy in `supabaseErrorCapture.ts` records it), grouped by relation, with when it left (Before paint · Settling · Settled), repeats flagged, and the code that built the query (stack taken at `.from()`/`.rpc()`, formatted only when opened). THE LOAD LAW: only what the page shows leaves before it settles; nothing repeats |
| `features/builder-panel/requests.ts` | One ordered request list (page + server `output.requests`), the Activity timeline, `isFlowRequest` |
| `features/builder-panel/story.ts` | The run as a numbered story (`buildStory`): inputs as row 0, each run's steps in finish order, calls inside (searches grouped per engine with the exact queries), idle steps grayed with the definition's `ready_when`; `derivedFor` + `findInResponse` (the path in the raw response a derived value came from) |
| `features/builder-panel/decisions.ts` + `components/BuilderDecisionsTab.tsx` | **Decisions** tab: per run, the stored `path_decision` step output (aidream `brand.identify.path_decision`): path, signals vs thresholds, entry checks, escalation, skipped steps with reasons (story rows), cost per run and per path. `runPathLabel` puts the path on the story's run row. Design: common-docs smart-add-brand `PATHS.md` |
| `features/builder-panel/hooks/*` | `useRequestLog`, `useRunTruth` (re-reads while a run is going) |
| `features/builder-panel/components/*` | Story sidebar + story detail (Sent · Received · What we took from it), Values list (group icons) + entry detail, Page calls, Activity, Workflow, Mandates, AI calls, Provision, proposal card; every value through `BuilderJson` (= `JsonInspector`) |
| `features/window-panels/windows/admin/BuilderPanelWindow.tsx` | The window (lazy overlay `builderPanelWindow`) |
| `features/overlays/definitions/builderPanelWindow.overlay.tsx` | `useOpenBuilderPanel`, `useToggleBuilderPanel` |
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
- What to publish and what the panel reads by itself (`derived` + `fromNodes`, `output.requests`): see the node.
- `ref` types and the tabs they drive: see the node (Publish API).
- Every value renders through `BuilderJson` (= `JsonInspector`); never a smart view or summary.
- `decisions.ts` `runPathLabel` puts the path on the story's run row.
