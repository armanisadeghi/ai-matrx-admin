# Tool Registry · Bundles

**Status**: shipped (Phase 3 of the tool-registry redesign)
**Owner**: tool-registry
**Routes**: `/admin/bundles`

## What this is

A master-detail admin page for `tl_bundle` and its `tl_bundle_member`
membership rows. Sidebar lists active (default) or all bundles with
inline filter and search; the right panel shows the selected bundle's
identity, metadata jsonb, and member list with inline alias editing
and tool search/add/remove.

Both system bundles (`is_system=true`, no owner) and personal bundles
(`is_system=false`, `created_by=auth.uid()`) appear in the same view —
the badge distinguishes them. Phase 4 ships the user-facing personal-
bundle UI under `/bundles`.

## Entry points

- Page: [app/(authenticated)/admin/bundles/page.tsx](../../../app/(authenticated)/admin/bundles/page.tsx)
- Client component: [features/tool-registry/bundles/components/BundlesAdminPage.tsx](./components/BundlesAdminPage.tsx)
- Service: [features/tool-registry/bundles/services/bundles.service.ts](./services/bundles.service.ts)

## What's in scope

- List all bundles with filter (active / all) and search.
- Edit bundle identity (name, description, active toggle), metadata jsonb.
- Add tools to a bundle (canonical-name autocomplete, default alias = local
  part of canonical, sort order).
- Edit `local_alias` per member inline (Save button surfaces only when dirty).
- Remove members (with confirm).

## What's intentionally NOT here yet

- **Bundle creation**: deferred. The lister-tool auto-create flow is
  non-trivial (insert `tl_def` with `bundle:list_<name>`, link
  `lister_tool_id`, ideally inside one transaction). Admins can use the
  existing tool admin to create the lister manually, then update the
  bundle's `lister_tool_id` via the metadata field if needed.
- **Hard-delete**: bundles are FK targets via `tl_bundle_member`; soft-
  delete via the active toggle is the safe path.
- **User-facing personal bundles**: Phase 4.

## Conventions baked in

- `confirm()` from `@/components/dialogs/confirm/ConfirmDialogHost` for
  destructive flows (member removal).
- No barrel files; direct imports.
- Bundle name is shown but not yet enforced as globally unique on the
  client — backend has UNIQUE on `tl_bundle.name` per migration 0022,
  so duplicates fail at save with a Postgres error that surfaces via toast.

## Change Log

- **2026-05-05** — Phase 3 shipped. Initial admin bundle page + service.
