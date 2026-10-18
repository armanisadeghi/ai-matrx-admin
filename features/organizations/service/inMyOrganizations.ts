// features/organizations/service/inMyOrganizations.ts — "SCOPED TO MY ORGANIZATIONS", ASKED ON THE SERVER
//
// Bounded organizations (2026-10-17, lane C): the app holds only the FIRST PAGE of her
// organizations, so a list filter built from that page (`.in("organization_id", myOrgIds)`)
// silently drops every row in the organizations past it. The filter cannot simply be removed —
// RLS also admits public / admin / global-readable rows — so the scope is asked of the database:
// `in_my_organizations` is a PostgREST computed field on each table read this way, every body one
// line over `iam.my_organization_ids()` (the whole set `iam.my_organizations_page` pages through).
// Migrations: 20261018030000_in_my_organizations_scoped_reads.sql (the set),
// 20261018040000_in_my_organizations_per_row_lookup.sql (per-row form + CRM tables) and
// 20261018160000_in_my_organizations_crm_rest_and_rulebook_shown_to.sql (deal, duplicate review, rulebook),
// 20261018200000_in_my_organizations_projects.sql (the scope tree's projects). The client never
// ships the id list. A table not listed there answers PGRST "column does not exist" — add it to
// that migration's family (one more one-line overload), never a per-feature twin.

/** The computed-field column: `.is(IN_MY_ORGANIZATIONS, true)`. */
export const IN_MY_ORGANIZATIONS = "in_my_organizations" as const;

/** The same scope as one arm of a PostgREST `or(...)` filter. */
export const IN_MY_ORGANIZATIONS_ARM = `${IN_MY_ORGANIZATIONS}.is.true` as const;

/** The tables that carry the computed field (keep in step with the migration). */
export const TABLES_SCOPED_TO_MY_ORGANIZATIONS = [
  "platform.judge_verdict",
  "platform.tag",
  "platform.saved_view",
  "media.source_library",
  "workflow.definition",
  "content_ir.kind_instance",
  "crm.party",
  "crm.outreach_list",
  "platform.outcome_event",
  "crm.deal",
  "crm.merge_candidate",
  "crm.party_merge",
  "platform.rulebook",
  "projects.projects",
] as const;
