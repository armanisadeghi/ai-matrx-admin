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
| CRM outreach lists "mine or my orgs" (`features/crm/outreach-lists/service.ts`) | crm.outreach_list |
| CRM deals list + board (`features/crm/deals/service.ts`) | crm.deal |
| CRM duplicate review, badge count, recent merges (`fetchMergeCandidates` / `fetchPendingCandidateCount` / `fetchRecentMerges`, now argument-free) | crm.merge_candidate, crm.party_merge |
| CRM deal dialog party search (`searchPartiesByName({ orgId: ALL_MY_ORGANIZATIONS })`) | crm.party |
| masterwork browse All / My Orgs lanes (`features/masterwork/browse/service.ts`) | platform.rulebook via `listed_in_my_organizations` |
| note sidebar organization names (`NoteSidebar.tsx`) | names only: `useOrganizationsWith(ids her notes name)` |

Third migration `migrations/20261018160000_in_my_organizations_crm_rest_and_rulebook_shown_to.sql`
(inverse in `migrations/inverse/`): `in_my_organizations` overloads for crm.deal, crm.merge_candidate,
crm.party_merge, platform.rulebook, plus `platform.listed_in_my_organizations(platform.rulebook)` =
`iam.is_my_organization(org) and platform.shown_to_lists(shown_to, ..., platform.shown_to_context('rulebook'))`
- the masterwork "Shown to" rule, server-side (same functions the `*_list_scoped` RPCs use; the
retired row column is not read, T-13 guard). `shown_to_context` is cached per transaction.

## Proof
- Guard test `features/organizations/service/__tests__/org-scoped-readers-ask-the-server.test.ts`
  (guard rows extended to the third migration's readers). Red on origin/main sources: every reader had 0 server-scope sites and 1–3 id-list sites.
- Live parity as test@test.com (39 organizations), first page forced to 10 by passing `p_limit: 10`
  to `iam.my_organizations_page` (the knob only supplies that default; the live knob was NOT changed,
  so nothing to restore — it stays 50): server scope == full-list query on all 9 tables;
  first-page-only would have shown platform.tag 814/970, platform.saved_view 1085/1741,
  workflow.definition 335/372, crm.party 138/422. `iam.my_organization_ids()` == the full paged list (39).

## Not converted yet (next lane) - each needs more than a computed field
- content-ir instance list (`features/content-ir/studio/instance-service.ts`, `personOrganizations`):
  loops per organization over `whereKindRecordsLive`, which asks the records gateway (`tableFind`
  by slug) per org. Needs a server read "which of my organizations have the `kind_instance` Table
  adopted" - the record-store registry is not a plain table this lane could read.
- masterwork browse My Team lane still builds `shownToBlendedFilter` from `fetchMyTeamReach` org ids
  (team reach comes from the server, not the first page) - leave unless team reach is paged.
- Per-organization loops / directories that call a per-org door (a screen needs paging or a
  set-based door, not a filter): box identity directory (`useBoxIdentity.ts`: members + teams of
  every org), notification scopes (`notification-preferences.ts`: a picker), marketing spend
  (`spend.ts`: one spend door call per org), hub org counts (`useHubOrgCounts.ts`: a count per org),
  user connections (`messaging/hooks/useUserConnections.ts`: members per org), mandate home lists
  (`mandates/browse/*`: the list door takes the homes), custom tables admin, `useListDimensions`
  (`scopeDoors().types(ids)`), kits (`kitScope.ts`: `recentOrganizationIds` + scope types), agent-context
  hierarchy (`hierarchyService.ts`), scope tree (`scopesService.ts`), dedup scans
  (`runDedupScan(orgId)` loop in `crm-assists-producer.ts` / `DuplicateReviewPage.tsx`), and CRM
  `ctx.orgIds` as a column-definition input (`useStandardFieldColumns`, `memberOrgIds`). Each of
  these needs its own set-based server door (take no ids, or page) - the computed-field family
  cannot answer a per-org loop.

## Apply verification (2026-10-17, after the coordinator's check)
Both migrations applied through `pnpm db:apply` in one transaction each and ledgered; the ledger
checksums equal the sha256 of the committed files (0ad7aa05… and e6ffdf2f…). `pnpm check:migrations`
names no problem with either file (its two FAILs are other lanes' files: campaign files in the swept
directory, and missing based-on headers in mnd_admin_list_model_and_spend_columns.sql /
notify_from_sql_options_and_the_server_door.sql).

## Not verified
Signed-in browser spot check: the shared preview handed out a slot (sd9901744.localhost:3001), but
the Browser pane refused to navigate to it twice, so no screen walk was done. The proof is the live
PostgREST parity run above, made as test@test.com through the same supabase-js calls the app makes.

## Proof, third step (2026-10-18)
Applied through `pnpm db:apply` (ledger checksum a589b364... == sha256 of the file); `pnpm check:migrations`
names no problem with it. Live parity as test@test.com (39 organizations, first page forced to 10 with
`p_limit: 10`; head counts through the same supabase-js calls): crm.deal server 9 = full list 9;
platform.rulebook server 161 = full list 161 (first page only 159); rulebook My Orgs lane with the
old client rule over all 39 ids 8 = server 8; All lane 9 = 9; deal mine-or-orgs 1 = 1; outreach_list
mine-or-orgs 1 = 1; crm.party across my orgs 298 = 298. crm.merge_candidate and crm.party_merge hold 0
rows for her (parity is trivial there). `pnpm type-check` clean; guard test passes. `pnpm db-types` not
rerun: no table shape changed. `features/crm/outreach-lists/service.test.ts` "keeps real PostgREST
failures loud" fails on origin/main too (expects "gateway failed (PGRST500)"; commit 0b8df9d67c3 changed
the wording) - not this lane's.
