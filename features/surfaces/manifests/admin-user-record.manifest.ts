/**
 * Surface manifest — one person's admin record (`matrx-admin/user-record`).
 *
 * ADMIN SURFACE. Drives `/administration/users/<id>[/<tab>]` — the ONE page every user name in
 * admin opens (features/admin/users/record/UserRecordPage.tsx). Emits the person the admin is
 * looking at: identity, status, plan and usage, what needs attention, and which tab is open. The
 * page's emitter (`UserRecordSurface.tsx`) builds the scope synchronously from the page's one
 * `admin.user_overview` read — it never fetches.
 *
 * Write targets: none, by design (same ruling as `matrx-admin/users`): every action on this page
 * (close, reopen, plan, free months, sign-out, links, messages) is an admin button press that asks
 * a reason and is audited. No fixed AI worker is placed here, so no agent role is declared.
 */

import type {
  SurfaceManifest,
  SurfaceScopePayload,
  SurfaceValue,
  SurfaceValueGroup,
} from "@ai-matrx/chat/surfaces/types";
import { mergeBaselineValues, pickBaseline } from "@ai-matrx/chat/surfaces/manifests/_baseline.manifest";
import { MATRX_WEB_APP_EXECUTOR } from "@ai-matrx/chat/surfaces/executor";

export const ADMIN_USER_RECORD_SURFACE_NAME = "matrx-admin/user-record";

const groups: SurfaceValueGroup[] = [
  { key: "person_identity", label: "Person", sortOrder: 100 },
  { key: "person_plan", label: "Plan & usage", sortOrder: 200 },
  { key: "person_attention", label: "Needs attention", sortOrder: 300 },
  { key: "record_view", label: "Open view", sortOrder: 400 },
];

export interface AdminUserRecordAttentionItem {
  kind: string;
  label: string;
  detail: string | null;
}

const surfaceSpecific: SurfaceValue[] = [
  { name: "person_id", label: "Person id", description: "The uuid of the person this record is about. Always set.", valueType: "string", alwaysAvailable: true, typicalCharCount: 36, group: "person_identity", sortOrder: 100 },
  { name: "person_name", label: "Name", description: "What the page calls this person: their name, else email, else Guest.", valueType: "string", alwaysAvailable: true, typicalCharCount: 24, group: "person_identity", sortOrder: 110 },
  { name: "person_email", label: "Email", description: "The person's email address. Absent for a guest without one.", valueType: "string", alwaysAvailable: false, typicalCharCount: 28, group: "person_identity", sortOrder: 120 },
  { name: "person_status", label: "Status", description: "The one status word the page header shows: Active, Closed, Guest or Admin.", valueType: "string", alwaysAvailable: true, typicalCharCount: 6, group: "person_identity", sortOrder: 130 },
  { name: "person_admin_level", label: "Admin level", description: "developer, senior_admin or super_admin when the person is a platform admin; absent otherwise.", valueType: "string", alwaysAvailable: false, typicalCharCount: 12, group: "person_identity", sortOrder: 140 },
  { name: "person_created_at", label: "Created", description: "When the account was created (ISO time).", valueType: "string", alwaysAvailable: false, typicalCharCount: 24, group: "person_identity", sortOrder: 150 },
  { name: "person_last_sign_in_at", label: "Last sign-in", description: "The account's last sign-in (ISO time). Absent when never.", valueType: "string", alwaysAvailable: false, typicalCharCount: 24, group: "person_identity", sortOrder: 160 },
  { name: "plan_name", label: "Plan", description: "The plan the person's allowance comes from. Absent when unknown.", valueType: "string", alwaysAvailable: false, typicalCharCount: 12, group: "person_plan", sortOrder: 100 },
  { name: "plan_source", label: "Plan source", description: "Where the plan comes from: grant, organization, default or guest.", valueType: "string", alwaysAvailable: false, typicalCharCount: 8, group: "person_plan", sortOrder: 110 },
  { name: "usage_state", label: "Usage state", description: "ok, near or over — the person's AI-points usage against their plan's limits.", valueType: "string", alwaysAvailable: false, typicalCharCount: 4, group: "person_plan", sortOrder: 120 },
  { name: "ai_requests_30d", label: "AI requests (30d)", description: "Chat requests the person made in the last 30 days. Absent when the usage rollup is unavailable.", valueType: "number", alwaysAvailable: false, typicalCharCount: 4, group: "person_plan", sortOrder: 130 },
  { name: "attention_count", label: "Needs attention", description: "How many items the Overview lists under Needs attention (closed, support live, usage, approvals, held runs, open feedback).", valueType: "number", alwaysAvailable: true, typicalCharCount: 2, group: "person_attention", sortOrder: 100 },
  { name: "attention_items", label: "Attention items", description: "Each attention item: kind, label and detail, in the Overview's order. Absent when nothing needs attention.", valueType: "array", alwaysAvailable: false, typicalCharCount: 400, group: "person_attention", sortOrder: 110 },
  { name: "active_tab", label: "Open tab", description: "The tab the admin has open: overview, activity, billing, organizations, content, support, notes, security, preferences, acquisition or history.", valueType: "string", alwaysAvailable: true, typicalCharCount: 10, group: "record_view", sortOrder: 100 },
];

export const adminUserRecordManifest: SurfaceManifest = {
  surfaceName: ADMIN_USER_RECORD_SURFACE_NAME,
  situation:
    "As a platform admin they are looking at another person's account, not their own: {person_name} ({person_email|no email}), {person_status}, on the {plan_name|unknown} plan with usage {usage_state|unknown}, {attention_count} items needing attention, on the {active_tab} tab.",
  inheritsFrom: "matrx-default/account",
  client: "matrx-admin",
  executor: MATRX_WEB_APP_EXECUTOR,
  executionMode: "python-stream",
  description: "One person's admin record: identity, status, plan, attention and the open tab.",
  label: "Users & Access — Person record",
  urlPattern: "/administration/users/[id]",
  intro: `<surface_intro>
This is an ADMIN surface: one person's record page in platform admin. The admin opened it from a name somewhere in admin to look at, support or change this ONE account.

person_* values describe the person (not the signed-in admin). person_status is the same word the page header shows. plan_name, plan_source and usage_state say what the person is on and how close to their limits they are. attention_items is the Overview's Needs attention list, in order. active_tab says which part of the record the admin is reading.

Every change here (close, reopen, plan, free months, sign out, links, messages) is a button the admin presses and records with a reason; this surface has no write path, so describe what you would do and let the admin press it.
</surface_intro>`,
  groups,
  values: mergeBaselineValues(pickBaseline("selection", "context"), surfaceSpecific),
};

/** Type-safe payload: required keys mirror `alwaysAvailable: true`. */
export function createAdminUserRecordScope(values: {
  person_id: string;
  person_name: string;
  person_status: string;
  attention_count: number;
  active_tab: string;
  selection?: string;
  context?: Record<string, unknown>;
  person_email?: string;
  person_admin_level?: string;
  person_created_at?: string;
  person_last_sign_in_at?: string;
  plan_name?: string;
  plan_source?: string;
  usage_state?: string;
  ai_requests_30d?: number;
  attention_items?: AdminUserRecordAttentionItem[];
}): SurfaceScopePayload {
  return values as SurfaceScopePayload;
}
