// utils/auth/adminFeaturesOnUserPages.ts — ADMIN FEATURES BUILT INTO USER PAGES.
//
// THE RULE (Arman, 2026-10-06): the admin lane stops admin status from
// following an admin around the normal app — on a user page an admin SEES and
// READS exactly what anyone else does. That is right and stays. But some
// controls were built ON PURPOSE for admins inside normal pages, and those must
// keep working there. His example: on his own agent's page, Linked Agent Sync
// lets a super admin write into a SYSTEM agent. "This is not my admin
// capabilities following me to a normal ui in a way that it should not. This is
// a feature SPECIFICALLY BUILT to do this."
//
// The line between the two:
//   - AMBIENT reach — extra rows in a list, someone else's record opening,
//     an RLS admin arm widening a read. NEVER on a user page (admin lane).
//   - A DELIBERATE ACTION — a named control that exists for admins, does one
//     job, and is decided by one database door. ALLOWED on a user page, but
//     only when it is registered here.
//
// How a registered feature works, end to end:
//   1. The screen asks `selectAdminFeature(state, "<id>")` — true for a person
//      who holds the listed admin tier, on ANY page. Nothing else on a user
//      page may read admin identity to gate a control (`pnpm check:admin-lane`).
//   2. The ONE request the control fires is wrapped in
//      `withAdminFeature("<id>", request)`, which opens the admin lane for that
//      request alone. The database is unchanged: its admin checks still need
//      the lane AND an admin identity, so the marker grants nothing to anyone
//      who is not an admin, and no other request on the page is touched.
//      API routes under /api/admin get the lane by path already.
//   3. Reads stay ordinary. A registered action never makes another person's
//      private record visible; it acts on platform-owned things (system agents,
//      global catalogues) the feature exists to maintain.
//
// Adding an entry needs Arman's ruling, quoted with its date (law 12).
// Canonical doc: common-docs/systems/platform/access/STATE.md
// ("Admin features on user pages").

import type { AdminLevel } from "@/utils/supabase/userSessionData";
import { ADMIN_LANE_HEADER } from "@/utils/supabase/adminLane";

export interface AdminFeatureOnUserPage {
  /** Who may use it. `super_admin` = super admins only; `admin` = any admin tier. */
  level: "super_admin" | "admin";
  /** What it lets the admin do, in plain words. */
  allows: string;
  /** Where it lives in the normal app. */
  where: string;
  /** The requests that carry it: database doors / tables, or /api/admin routes. */
  doors: readonly string[];
  /** The ruling that allows it. */
  ruling: string;
}

export const ADMIN_FEATURES_ON_USER_PAGES = {
  "agent.system-sync": {
    level: "super_admin",
    allows:
      "Push changes from an agent into its linked SYSTEM agent, or pull a system agent's changes into a system copy, from Linked Agent Sync.",
    where: "Agent page → Linked Agent Sync (features/agents/components/admin/AgentSyncBody.tsx)",
    doors: ["public.agx_sync_linked_agents_reviewed"],
    ruling: "Arman, 2026-10-06: \"As a super admin, I have the ability to write to system agents, therefore, this page should allow me to do that.\"",
  },
  "agent.make-system": {
    level: "super_admin",
    allows: "Turn your own agent into a new system agent from Linked Agent Sync.",
    where: "Agent page → Linked Agent Sync → Make system agent (features/agents/components/admin/ConvertAgentToSystemBody.tsx)",
    // An /api/admin route: the proxy opens the admin lane for it by path, and
    // the route re-checks super admin before writing.
    doors: ["/api/admin/agent-builtins/convert-from-agent", "/api/admin/agent-builtins/by-source"],
    ruling: "Arman, 2026-10-06: \"As a super admin, I have the ability to write to system agents, therefore, this page should allow me to do that.\"",
  },
  "agent.global-shortcut": {
    level: "super_admin",
    allows: "Create a global shortcut on a built-in agent, or promote a shortcut to global.",
    where: "Agent shortcuts (/agents/shortcuts, the shortcut editor)",
    doors: ["public.agx_promote_shortcut_to_global", "public.agx_promote_shortcut_to_global_m", "agent.shortcut (insert, global scope)"],
    ruling: "Arman, 2026-10-06: features \"explicitly actions in the normal ui that were for admins\" keep working; admin status must not widen what an admin SEES on a user page.",
  },
  "agent.system-app": {
    level: "super_admin",
    allows: "Create the global system app for a built-in agent.",
    where: "Agent menus → create app (POST /api/applets)",
    doors: ["/api/applets (POST)"],
    ruling: "Arman, 2026-10-06: features \"explicitly actions in the normal ui that were for admins\" keep working; admin status must not widen what an admin SEES on a user page.",
  },
  "agent.hindsight-cases": {
    level: "admin",
    allows: "Save a run as a regression case and replay examples.",
    where: "Agent → Hindsight (/agents/[id]/hindsight)",
    doors: ["aidream hindsight routes (_require_admin)"],
    ruling: "Arman, 2026-10-06: features \"explicitly actions in the normal ui that were for admins\" keep working; admin status must not widen what an admin SEES on a user page.",
  },
  "mandate.system-seat": {
    level: "super_admin",
    allows: "Promote a mandate to a system mandate, and enable, disable, archive or set system-level overrides on a SYSTEM mandate.",
    where: "Mandate window and record preview (/mandates/record-preview/[key])",
    doors: ["mandate.duplicate_mandate (as system)", "mandate.definition (update, system rows)"],
    ruling: "Arman, 2026-10-06: features \"explicitly actions in the normal ui that were for admins\" keep working; admin status must not widen what an admin SEES on a user page.",
  },
  "knob.system-default": {
    level: "admin",
    allows: "Choose the System destination in a settings pane: change a feature knob's platform default.",
    where: "Settings panes on user pages",
    doors: ["platform.feature_knob_set"],
    ruling: "Arman, 2026-10-06: features \"explicitly actions in the normal ui that were for admins\" keep working; admin status must not widen what an admin SEES on a user page.",
  },
  "surface.platform-agent-role": {
    level: "super_admin",
    allows: "Set or clear the platform-wide agent-role override for a surface.",
    where: "Surface inspector window",
    doors: ["ui.ui_surface_agent_pref (insert; clearing is a soft-delete update), platform rows"],
    ruling: "Arman, 2026-10-06: features \"explicitly actions in the normal ui that were for admins\" keep working; admin status must not widen what an admin SEES on a user page.",
  },
  "library.publish": {
    level: "admin",
    allows: "Publish to or revoke from the platform Library, and list existing grants (data stores, rulebooks).",
    where: "/rag/data-stores, /knowledge/data-stores, /masterwork/[id]",
    doors: ["public.library_publish", "public.library_revoke", "public.library_list_grants"],
    ruling: "Arman, 2026-10-06: features \"explicitly actions in the normal ui that were for admins\" keep working; admin status must not widen what an admin SEES on a user page.",
  },
  "ai.translation-approvals": {
    level: "admin",
    allows: "See and approve or archive settings-translation cells in the approvals queue.",
    where: "/approvals → settings translation",
    doors: ["public.is_platform_admin (screen gate)", "ai.save_translation_cell", "ai.archive_translation_cell", "ai.translation_cell (read)"],
    ruling: "Arman, 2026-10-06: features \"explicitly actions in the normal ui that were for admins\" keep working; admin status must not widen what an admin SEES on a user page.",
  },
  "scheduler.system-jobs": {
    level: "super_admin",
    allows: "Pause, disable or mark failed a system job.",
    where: "/schedules/[id]",
    doors: ["scheduler.admin_disable_task", "aidream PATCH /scheduling/admin/system-tasks (pause/enable; identity)"],
    ruling: "Arman, 2026-10-06: features \"explicitly actions in the normal ui that were for admins\" keep working; admin status must not widen what an admin SEES on a user page.",
  },
  "seo.place-detection": {
    level: "admin",
    allows: "Run place detection over keywords.",
    where: "SEO keyword pages → place detection strip",
    doors: ["seo.fn_backfill_keyword_places"],
    ruling: "Arman, 2026-10-06: features \"explicitly actions in the normal ui that were for admins\" keep working; admin status must not widen what an admin SEES on a user page.",
  },
  "feedback.triage-fields": {
    level: "admin",
    allows: "Set category and assignee when filing feedback.",
    where: "Feedback overlay on every page (server action submitFeedback)",
    doors: ["submitFeedback (server action)"],
    ruling: "Arman, 2026-10-06: features \"explicitly actions in the normal ui that were for admins\" keep working; admin status must not widen what an admin SEES on a user page.",
  },
  "skills.system-catalogue": {
    level: "admin",
    allows: "Edit, ingest and create system skills and categories.",
    where: "/skills",
    doors: ["aidream /skills routes (ctx.is_admin)"],
    ruling: "Arman, 2026-10-06: features \"explicitly actions in the normal ui that were for admins\" keep working; admin status must not widen what an admin SEES on a user page.",
  },
  "google.internal-review": {
    level: "super_admin",
    allows: "Run the Google internal-test controls (contacts import, agenda, directory review, read-only sweep) and Google Ads, Analytics and YouTube campaign access.",
    where: "/google-read-only-review, connections, /marketing/[brandId]/ads and /analytics",
    doors: ["aidream google_integrations (ctx.admin_level)"],
    ruling: "Arman, 2026-10-06: features \"explicitly actions in the normal ui that were for admins\" keep working; admin status must not widen what an admin SEES on a user page.",
  },
  "outreach.bring-up": {
    level: "super_admin",
    allows: "Run the sending-identity bring-up checklist.",
    where: "/crm/sending-identities",
    doors: ["outreach bring-up steps"],
    ruling: "Arman, 2026-10-06: features \"explicitly actions in the normal ui that were for admins\" keep working; admin status must not widen what an admin SEES on a user page.",
  },
  "sandbox.admin-panels": {
    level: "super_admin",
    allows: "See sandbox details, exec and force stop on a sandbox page.",
    where: "/sandbox/[id]",
    doors: ["sandbox instance routes (ownership checked)"],
    ruling: "Arman, 2026-10-06: features \"explicitly actions in the normal ui that were for admins\" keep working; admin status must not widen what an admin SEES on a user page.",
  },
  "ai.watch": {
    level: "super_admin",
    allows: "Watch any AI run on the page: the mandate, holder and version, provision values as filled, goal, output kind, the exact provider request and the live stream.",
    where: "Sidebar → Watch AI (Eye, orange while a run is live) → the Watch AI window; Watch AI on run windows and Applet job output. Shown only with debug mode on.",
    // Reads stay ordinary (rule 3): the run's own stream and its own chat.user_request /
    // chat.request_snapshot rows under normal RLS. No request carries the lane.
    doors: ["chat.user_request (read, ordinary RLS)", "chat.request_snapshot (read, ordinary RLS)"],
    ruling: "Arman, 2026-10-13: \"it detects when the user is a system admin. And so I get a icon that lights up orange in my sidebar menu. And if I click on it, I see the window panel\" — \"Only system admins for now; debug mode is the switch.\"",
  },
  "shape.promote-to-system": {
    level: "super_admin",
    allows: "Promote shapes into Matrx System — one shape from its page, or many at once from the Shapes table — with everything that belongs to them.",
    where: "/shapes/[kind] header → Promote to system; /shapes/all row menu and bulk bar",
    doors: ["content_ir.promote_kinds_to_system"],
    ruling: "Arman, 2026-10-13: \"I'm a system admin which means that we need to add a feature here where I can quickly and easily promote things of mine to the system so they're no longer just mine.\"",
  },
  "provision.open-any-snapshot": {
    level: "admin",
    allows: "Open any provision snapshot in the Provision window, including one owned by an organization the admin is not a member of.",
    where: "Provision window (features/provision-window/data.ts loadProvisionSnapshot)",
    doors: ["mandate.provision_snapshot (read, platform_admin_read)"],
    ruling: "Arman, 2026-10-12 (smart-add-brand VISION Part 4): \"I will never again allow agents to run randomly without me having full visibility into the inputs and the outputs.\" Provision windows are how he sees those inputs, for every organization.",
  },
} as const satisfies Record<string, AdminFeatureOnUserPage>;

export type AdminFeatureOnUserPageId = keyof typeof ADMIN_FEATURES_ON_USER_PAGES;

/** Does a person with this admin tier hold this registered feature? */
export function adminTierHoldsFeature(
  tier: AdminLevel | null | undefined,
  feature: AdminFeatureOnUserPageId,
): boolean {
  if (!tier) return false;
  const needed: AdminFeatureOnUserPage["level"] = ADMIN_FEATURES_ON_USER_PAGES[feature].level;
  return needed === "admin" ? true : tier === "super_admin";
}

interface HeaderSettable<B> {
  setHeader(name: string, value: string): B;
}

/**
 * Opens the admin lane for ONE request a registered feature fires — a
 * `supabase.rpc(...)` / `.from(...)` builder, before it is awaited. The
 * database still checks the caller is an admin; for anyone else the marker
 * changes nothing.
 */
export function withAdminFeature<B extends HeaderSettable<B>>(
  feature: AdminFeatureOnUserPageId,
  request: B,
): B {
  void ADMIN_FEATURES_ON_USER_PAGES[feature];
  return request.setHeader(ADMIN_LANE_HEADER, "1");
}
