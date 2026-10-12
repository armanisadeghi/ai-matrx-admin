# Provision window (client)

Policy: `common-docs/policies/agents-never-author-agents.md` § Provision first. Where an AI step would run, the
platform shows the EXACT values available there and the expected output instead of running anything.

- `data.ts` — `captureProvision(dispatch, pointKey, subjectId, orgId, trigger)` (server door
  `POST /provision-window/{point_key}/capture`), `loadProvisionSnapshot(id)` and `listProvisionSnapshots(point, subject)`
  (direct reads of `mandate.provision_snapshot`), `snapshotJson` / `snapshotMarkdown` (paste-ready samples).
- `ProvisionWindowBody.tsx` — every value (expand to full, size, source, missing + why, copy), Copy all JSON / Markdown,
  earlier captures picker, and the **Expected output** section (kind schema + example, each copyable).
- `ProvisionCaptures.tsx` — buttons for each capture of a point for a subject ("At Create", "After setup", "Captured").
- Window: `features/window-panels/windows/provision/ProvisionWindow.tsx`, overlay `provisionWindow`, opener
  `features/overlays/openers/provisionWindow.tsx` (`useOpenProvisionWindow()(snapshotId, title)`), address
  `?panels=provision:<snapshot id>` (the window passes `urlSyncId={snapshotId}`).

Used by: Smart Add (`features/marketing/smart-add/SmartAddBrand.tsx`) and the brand Identity page
(`BrandAnalysisInputs.tsx` on `app/(core)/marketing/[brandId]/identity/page.tsx`). Server: aidream
`aidream/services/provision_window/FEATURE.md`.
