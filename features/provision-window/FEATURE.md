# Provision window (client)

Policy: `common-docs/policies/agents-never-author-agents.md` § Provision first. Where an AI step would run, the
platform shows the EXACT values available there and the expected output instead of running anything.

- `data.ts` — `captureProvision(dispatch, pointKey, subjectId, orgId, trigger)` (server door
  `POST /provision-window/{point_key}/capture`), `loadProvisionSnapshot(id)` (server door
  `GET /provision-window/snapshots/{id}?debug_view=1` — values only while watching AI, else each value `withheld` with
  its size, drawn "Withheld"; the browser never selects `provision_values` — client-excluded since stage 5, 2026-10-20, so naming it or `*` is 42501), `listProvisionSnapshots(point, subject)`
  (direct read of ids, times and sizes only), `snapshotJson` / `snapshotMarkdown` (paste-ready samples).
- `ProvisionWindowBody.tsx` — every value (expand to full, size, source, missing + why, copy), Copy all JSON / Markdown,
  earlier captures picker, and the **Expected output** section (kind schema + example, each copyable).
- `ProvisionCaptures.tsx` — buttons for each capture of a point for a subject ("At Create", "After setup", "Captured").
- Window: `features/window-panels/windows/provision/ProvisionWindow.tsx`, overlay `provisionWindow`, opener
  `features/overlays/definitions/provisionWindow.overlay.tsx` (`useOpenProvisionWindow()(snapshotId, title)`), address
  `?panels=provision:<snapshot id>` (the window passes `urlSyncId={snapshotId}`).

- Capture now lives in the Builder (Provision tab, one "Capture <inputs>" button per provision point a page names), not on pages:
  `features/builder-panel/components/BuilderRunsTabs.tsx`. The brand Identity page names its five points through
  `features/marketing/brand-guide/BrandIdentityBuilderFeed.tsx` (`brand_guide.voice` / `.messaging` / `.audience` / `.words`,
  `brand_intake.smart_add_create`).

Used by: Smart Add (`features/marketing/smart-add/SmartAddBrand.tsx`) and the Builder's Provision tab (any page that publishes a `record` ref with `organizationId` and `mandate` refs with `provisionKey`). Server: aidream
`aidream/services/provision_window/FEATURE.md`.

## Change log

- 2026-10-17 — Claude: `BrandGuideInputs` / `BrandAnalysisInputs` removed from the brand Identity page (Arman: ugly top row with a scrollbar). Their capability moved to the Builder Provision tab as Capture buttons + the subject's captures.
