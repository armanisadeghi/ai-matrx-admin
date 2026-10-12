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
| `features/builder-panel/data.ts` | `mandate.proposal` + `mandate.definition` reads |
| `features/builder-panel/components/*` | Sidebar, entry detail (smart/raw/history/copy), tabs, proposal card |
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
      { key: `finding.${f.key}`, label: f.label, group: "findings", data: f, certainty: f.confidence, source: f.source },
    ],
    { prune: ["finding."] },
  );
});
```

- Keep the page's publisher admin-only code: import only the surface key statically and load the
  publisher with `import()` inside the admin-gated effect (Smart Add: `builderSurface.ts` +
  `builderFeed.ts`).
- Node outputs need no publishing: the Workflow tab reads them live from `workflowRuns` for every
  `workflow_run` ref.
- `ref` drives the tabs: `workflow_run` → Workflow + AI calls, `ai_run` → AI calls,
  `provision_snapshot` → Provision, `mandate` (`mandateKey` / `provisionKey`) → Mandates.

## Rendering

`BuilderValue`: own or declared `__kind` → `KindValueFrontDoor`; http(s) string → image preview /
new-tab link; anything else → `StructuredValueView` (arrays of objects = sortable table); Raw →
`JsonTreeViewer`. Copy is the Alchemy `CopyButtons` per entry, per proposal and for the whole feed.

## Proposals

`mandate.proposal` rows (by `surface_key`) feed the Proposed areas of Workflow (`shape_type =
workflow`) and Mandates (`shape_type = mandate`). Add one with SQL or any writer that carries an
explicit `organization_id`; nothing in code holds a proposal.

## Change log

- 2026-10-12 — created: publish API, window, sidebar entry, `mandate.proposal`, Smart Add consumer.
