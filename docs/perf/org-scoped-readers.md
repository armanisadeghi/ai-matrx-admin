# Org-scoped readers ask the server (bounded organizations, lane C — 2026-10-17)

## The defect
The app holds only the first page (knob `organizations.switcher_page_size`, 50) of a person's
organizations. Readers that built `organization_id in (<my org ids>)` from that page silently
dropped every row in the organizations past it. The filter cannot simply go: RLS also admits
public / admin / global-readable rows on these tables.

## The canonical path (one, never a twin per feature)
- `iam.my_organization_ids()` — set form (SQL, STABLE, INVOKER): her memberships (any status, not
  deleted) in organizations that are not archived — exactly the set `iam.my_organizations_page('active')`
  pages through. For RPC / view bodies.
- `iam.is_my_organization(uuid)` — per-row form (plpgsql, STABLE, DEFINER, one unique-index probe on
  `iam.memberships (container_type, container_id, user_id)`), door row in `platform.client_callable_door`.
- `<schema>.in_my_organizations(<table>)` — a PostgREST computed field, one line over
  `iam.is_my_organization`, on each table a list reads this way. The client writes
  `.is(IN_MY_ORGANIZATIONS, true)` or the `IN_MY_ORGANIZATIONS_ARM` arm of an `or()`
  (`features/organizations/service/inMyOrganizations.ts`). A new table = one more overload in the family.
- Migrations: `migrations/20261018030000_in_my_organizations_scoped_reads.sql`,
  `migrations/20261018040000_in_my_organizations_per_row_lookup.sql` (inverses in `migrations/inverse/`).
- Trap found: the first body (`organization_id in (select iam.my_organization_ids())`) is never
  inlined (sub-select), so the set was rebuilt per row — `platform.tag` (9.3k rows) hit the 8 s
  statement timeout. The per-row probe form fixed it.

## Converted (tables carrying the computed field)
| Reader | Table |
|---|---|
| decision review queue + facets (`features/agents/decision-review/service.ts`) | platform.judge_verdict |
| hub tags (`features/knowledge/hub/tags/tagApi.ts`) | platform.tag |
| hub libraries (`features/knowledge/hub/hooks/useHubSidebarData.ts`) | media.source_library |
| hub saved views → `listSurfaceViews` (`components/official/table-saved-views-service.ts`) | platform.saved_view |
| masterwork encore "from your organizations" shelf (`features/masterwork/encore/service.ts`) | workflow.definition |
| content-ir kind records lanes + counts (`features/content-ir/studio/records/records-service.ts`) | content_ir.kind_instance |
| CRM party list All / My Orgs (`features/crm/service.ts`) | crm.party |
| CRM outreach report (`features/crm/analytics/service.ts`) | crm.outreach_list, platform.outcome_event |

## Proof
- Guard test `features/organizations/service/__tests__/org-scoped-readers-ask-the-server.test.ts`
  (10 pass). Red on origin/main sources: every reader had 0 server-scope sites and 1–3 id-list sites.
- Live parity as test@test.com (39 organizations), first page forced to 10 by passing `p_limit: 10`
  to `iam.my_organizations_page` (the knob only supplies that default; the live knob was NOT changed,
  so nothing to restore — it stays 50): server scope == full-list query on all 9 tables;
  first-page-only would have shown platform.tag 814/970, platform.saved_view 1085/1741,
  workflow.definition 335/372, crm.party 138/422. `iam.my_organization_ids()` == the full paged list (39).

## Not converted yet (next lane)
Need their own shape, not the computed field as-is:
- masterwork browse (`features/masterwork/browse/service.ts`) — per-organization "Shown to" filter
  (`shownToBlendedFilter`) embeds ids per org; needs the shown-to rule server-side.
- content-ir instance list (`features/content-ir/studio/instance-service.ts` `personOrganizations`) —
  loops per org over `whereKindRecordsLive`; needs a "which of my orgs keep records in the store" read.
- Display/name or per-org-loop consumers from the previous lane's list, still on the first page:
  box identity (`features/agents/org-chart/useBoxIdentity.ts`), notification scopes
  (`features/settings/notification-preferences.ts`), marketing spend (`features/marketing/data/spend.ts`),
  hub org counts (`useHubOrgCounts.ts`), user connections (`useUserConnections.ts`), mandate home lists
  (`features/mandates/browse/*`), note sidebar names (`NoteSidebar.tsx`), custom tables admin,
  dimensions (`lib/entity-list/useListDimensions.ts`), kits (`features/education/kits/kitScope.ts`),
  agent-context hierarchy (`features/agent-context/service/hierarchyService.ts`, `useHierarchy.ts`),
  scope tree org list (`features/scopes/service/scopesService.ts`), CRM `ctx.orgIds` remaining uses
  (team reach, `crm/service.ts` ~1473/1702/1729/1810). Names-only consumers belong on
  `useOrganizationsWith(ids)`; filter consumers on `in_my_organizations` (add the table's overload).
