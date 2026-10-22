/**
 * What the platform answers for ANY signed-in screen, whatever the tile: the
 * person's membership in their organization, the settings snapshot, who lists
 * are shown to, sharing authority on their own records. Shapes are the RPCs'
 * own (their callers' row types, cited beside each); values are one property
 * manager in one organization.
 */

import { ORGANIZATION, PERSON } from "./people";
import { seed, seedRpc } from "./fake-backend";

/** The platform's seeded knob rows a board tile reads (`feature.key` → value). */
const KNOBS: Record<string, unknown> = {
  "tables.density.mode": "normal",
  // features/settings/universal/knobEnumVocabularies.generated.ts — the copy door's flavor (a chat reply's copy action).
  "copy.default_flavor": "markdown",
  "lists.landing_tab.note": "all",
  "lists.landing_tab.task": "all",
  "lists.landing_tab.project": "all",
  "lists.landing_tab.file": "all",
  "lists.landing_tab.default": "all",
  // migrations/chat_composer_knobs_2026_09_27.sql
  "agents.chat_composer.default_mode": "chat",
  "agents.chat_composer.remember_last_mode": true,
  "agents.chat_composer.compact_input_max_height_pct": 50,
  "selection_toolbar.highlight_while_editing": false,
  // migrations/campaign/merge7_the_merged_grid_is_a_feature_knob.sql
  "data_tables.merged_grid": false,
  // platform.feature_knob billing.points_per_usd (live row, 20000): costs convert at it (components/cost/pointsRate.ts),
  // which every fetched-table bar and fetch estimate reads (features/data-sources/hooks.ts).
  "billing.points_per_usd": 20000,
  // features/marketing/social/post-count.ts POST_COUNT_KNOB (platform default 50): the profile tile's "how many posts" control.
  "social.profile_posts_default": 50,
  // @ai-matrx/chat tool-call-visualization/registry/inlineVisibility.js and ReplySuggestedActionsSlot.js — a knob read
  // that finds no row logs a console.error (a stand-in announces itself); the platform's own defaults.
  "agents.tool_cards.inline_visibility": "compact",
  "agents.reply_actions.enabled": true,
};

/** `iam.organizations` row of the person's one organization (features/organizations/service/myOrganizationsPage.ts `MyOrganizationRow`). */
const ORGANIZATION_ROW = {
  abbreviation: "HP",
  archive_reason: null,
  archived_at: null,
  archived_by: null,
  created_at: "2026-03-14T16:00:00.000Z",
  created_by: PERSON.id,
  description: null,
  id: ORGANIZATION.id,
  is_system: false,
  logo_file_id: null,
  logo_url: null,
  metadata: {},
  name: ORGANIZATION.name,
  settings: null,
  slug: "harborview-properties",
  test_expires_at: null,
  test_run_id: null,
  updated_at: "2026-03-14T16:00:00.000Z",
  updated_by: null,
  website: null,
};
const ORGANIZATION_ENTRY = {
  organization: ORGANIZATION_ROW,
  role: "owner",
  status: "active",
  joined_at: "2026-03-14T16:05:00.000Z",
  member_count: 4,
};

export function seedPlatform(): void {
  // iam.my_organizations_by_ids / my_organizations_page — the bounded reads of her organizations
  // (organizationLookup.ts keeps each id once per tab; an unseeded read FAILS, and a failed read is never kept).
  seedRpc("my_organizations_by_ids", (args: unknown) => {
    const ids = ((args as { p_ids?: string[] } | undefined)?.p_ids ?? []) as string[];
    return { organizations: ids.includes(ORGANIZATION.id) ? [ORGANIZATION_ENTRY] : [] };
  });
  seedRpc("my_organizations_page", {
    organizations: [ORGANIZATION_ENTRY],
    total: 1,
    has_more: false,
    next_cursor: null,
    page_size: 50,
  });
  // features/organizations/service/orgMemberRows.ts `OrganizationMemberRow` (kept once per organization per tab).
  seedRpc("get_organization_members_with_users", [
    {
      id: "c1e7a3f0-2b9d-4c58-8e16-5a0f3d7b9c21",
      invited_by: PERSON.id,
      joined_at: "2026-03-14T16:05:00.000Z",
      organization_id: ORGANIZATION.id,
      role: "owner",
      user_avatar_url: "",
      user_display_name: "Dana Whitfield",
      user_email: PERSON.email,
      user_id: PERSON.id,
    },
  ]);
  // custom.context_tree* — her organization has no scopes yet (an unseeded read maps to `door_absent`, logged to console.error).
  seedRpc("context_tree", { types: [], scopes: [] });
  seedRpc("context_tree_types", { types: [] });
  seedRpc("context_tree_type_scopes", { scopes: [], total: 0, offset: 0, next_offset: null });
  seedRpc("context_scopes", []);
  // features/rich-document/annotations/service.ts — a record's comments (none yet), may she edit it (she owns it),
  // and the association pairs a kind offers for highlights and links (none: `annotationPairs` keeps one answer per kind).
  seedRpc("cmt_list", []);
  seedRpc("has_access", true);
  seedRpc("association_link_sources", []);
  // features/unified-data/hub/doors.ts — the custom-fields read and the "Linked records" section any record page
  // asks once (a scope's page too): no custom values, no row linking here.
  seedRpc("entity_record_read", {});
  seedRpc("entity_back_links", { target: null, items: [], next_cursor: null });
  // the add-a-column control on any record page (entity_field_rights): she owns the organization, so she may.
  seedRpc("entity_field_rights", (args: unknown) => ({
    token: (args as { p_token?: string }).p_token ?? null,
    label: "Records",
    may_declare: true,
    reason: null,
    may_fill_in: true,
  }));
  // @ai-matrx/chat's background dock (chat.conversation_background_facts: one row per conversation it is asked
  // about, none have background work) and its server look (`ues_touch`, a write the dock records once per point).
  // An answered conversation is "readable"; an empty answer reads as a row the server does not have yet, which
  // makes the dock probe again every few seconds (the wait it keeps for a brand-new chat).
  seedRpc("conversation_background_facts", (args: unknown) =>
    ((args as { p_conversation_ids?: string[] } | undefined)?.p_conversation_ids ?? []).map((id) => ({
      conversation_id: id,
      turn_status: null,
      last_activity_at: "2026-09-30T19:00:00.000Z",
      last_viewed_at: "2026-09-30T19:00:00.000Z",
      runs: [],
    })),
  );
  seedRpc("ues_touch", null, "write");
  // platform.home_names — the names of the homes a note lives in (features/notes/homes/useNoteHomes.ts `HomeNameRow`).
  seedRpc("home_names", []);
  // features/organizations/service/membershipsService.ts `MbrForUserRow`
  seedRpc("mbr_for_user", [
    {
      id: "c1e7a3f0-2b9d-4c58-8e16-5a0f3d7b9c21",
      organization_id: ORGANIZATION.id,
      container_id: ORGANIZATION.id,
      user_id: PERSON.id,
      role: "owner",
      status: "active",
      created_at: "2026-03-14T16:05:00.000Z",
    },
  ]);
  // lib/scoped-config/effectiveKnobs.ts — `{ resolved, stamp }`; nothing overridden.
  // features/organizations/service/membershipsService.ts `MbrCountRow`
  seedRpc("mbr_count", [{ container_id: ORGANIZATION.id, member_count: 4 }]);
  seedRpc("knob_snapshot", { resolved: KNOBS, stamp: "2026-10-02T08:00:00.000Z" });
  // KNOB-SNAPSHOT (2026-10-08): the same answer in its two halves. `knob_defaults` is the platform's values
  // (kept once per tab, in memory + localStorage), `knob_snapshot_delta` the person's difference (nothing here).
  // Unseeded, both fail, and a failed read is never kept - every wake would ask again.
  seedRpc("knob_defaults", { version: "d1", unchanged: false, defaults: KNOBS });
  seedRpc("knob_snapshot_delta", { etag: "e1", defaults_version: "d1", unchanged: false, overrides: {} });
  // @ai-matrx/sharing src/core/shownTo.ts `ShownToContext`
  seedRpc("shown_to_context", { [ORGANIZATION.id]: { d: "everyone", t: [PERSON.id] } });
  // @ai-matrx/sharing src/core/service.ts — the person owns what the tile shows.
  seedRpc("may_manage_sharing", true);
  // features/tasks/redux/taskAssociationsSlice.ts — no task links this record yet.
  seedRpc("get_tasks_for_entity", { tasks: [] });
  seed("public.app_instances", []);
  // lib/organizations/systemOrg.ts — the platform's own organization (not the person's).
  seed("iam.system_orgs", [
    { key: "system", organization_id: "00000000-0000-4000-8000-0000000000a1" },
    { key: "library", organization_id: "00000000-0000-4000-8000-0000000000b2" },
  ]);
  // @ai-matrx/associations `listForSources` — nothing attached yet.
  seedRpc("assoc_for_sources", []);
  seedRpc("assoc_for_targets", []);
  seedRpc("assoc_for_entity", []);
  seedRpc("conversation_files", []);
  // favorites/pins (`ues_get_bulk`): only rows that HAVE state come back — none yet.
  seedRpc("ues_get_bulk", []);
  // features/file-actions (useFileFavorites, useRecordsOpened): the person's starred and recently opened files — none yet.
  seedRpc("ues_list", []);
  // lib/knobs/unifiedDataCampaign.ts — the record store is on for this organization.
  seedRpc("unified_data_store_on", { on: true });
}
