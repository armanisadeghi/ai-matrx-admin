// admin.user_overview(p_user) — THE one read behind /administration/users/<id>
// (migrations/20261017190000_admin_user_overview.sql). The RPC returns jsonb; this file is its
// typed shape, narrowed at ingress, plus the derived facts the page shows.

import { createClient } from "@/utils/supabase/client";
import { isJsonObject } from "@/types/json";
import { MCP_FULL_ACCESS_PERMISSION } from "../lib/mcp-access";
import { TOP_TIER_MODELS_PERMISSION } from "@/features/ai-models/topTierAccess";
import type { UserActionSubject } from "./useUserActions";

export interface UsageWindow {
  period: string;
  used: number;
  limit: number | null;
  remaining: number | null;
  state: string;
  resets_at: string | null;
}

export interface UserOverview {
  identity: {
    id: string;
    email: string | null;
    phone: string | null;
    display_name: string | null;
    avatar_url: string | null;
    created_at: string | null;
    last_sign_in_at: string | null;
    email_confirmed_at: string | null;
    phone_confirmed_at: string | null;
    banned_until: string | null;
    is_anonymous: boolean;
    providers: string[];
    permissions: string[];
    onboarding_completed: boolean;
  };
  /** billing.user_usage_state(p_user); null when that read failed (see usage_error). */
  usage: {
    state?: string;
    plan_key?: string | null;
    plan_name?: string | null;
    binding_period?: string | null;
    near_ratio?: number | null;
    resets_at?: string | null;
    windows?: UsageWindow[];
    free_period?: { status?: string; ends_at?: string | null; days_left?: number | null } | null;
  } | null;
  usage_error: string | null;
  plan: {
    key: string | null;
    name: string | null;
    source: "guest" | "grant" | "organization" | "default";
    grant_expires_at: string | null;
    grant_note: string | null;
  } | null;
  admin_level: string | null;
  closure: {
    id: string;
    closed_at: string | null;
    reason: string | null;
    reopened_at: string | null;
    erased_at: string | null;
  } | null;
  acquisition: {
    traffic_kind: string | null;
    campaign: string | null;
    referrer_host: string | null;
    identity_state: string | null;
    blocked: boolean | null;
  } | null;
  counts: { organizations: number; conversations: number };
  ai: {
    requests_30d: number;
    cost_30d: number;
    active_days_30d: number;
    requests_total: number;
    cost_total: number;
    last_ai_at: string | null;
    as_of: string | null;
  } | null;
  attention: {
    approvals_waiting: {
      id: string;
      subject_kind: string;
      subject_id: string;
      subject_name: string | null;
      blocked_runs: number | null;
      last_blocked_at: string | null;
    }[];
    approvals_waiting_count: number;
    held_runs: { id: string; agent_name: string | null; mandate_key: string | null; gate: string | null; last_seen_at: string }[];
    held_runs_count: number;
    feedback_open: { id: string; status: string; feedback_type: string | null; description: string | null; created_at: string }[];
    feedback_open_count: number;
    support_live: { id: string; status: string; expires_at: string | null; started_at: string | null } | null;
  };
  computed_at: string;
}

/** One person's overview, or null when no such account exists. */
export async function fetchUserOverview(userId: string): Promise<UserOverview | null> {
  const { data, error } = await createClient().schema("admin").rpc("user_overview", { p_user: userId });
  if (error) throw new Error(error.message);
  if (data === null) return null;
  if (!isJsonObject(data) || !isJsonObject(data.identity)) {
    throw new Error("admin.user_overview returned an unexpected shape");
  }
  // The RPC builds every key above with jsonb_build_object; the guard checks the envelope.
  return data as unknown as UserOverview;
}

/** A generic placeholder ("User") is never a name. */
export function realName(name: string | null | undefined): string | null {
  const n = name?.trim();
  return n && n.toLowerCase() !== "user" ? n : null;
}

/** What the page calls this person: their name, else email, else "Guest" — never the uuid. */
export function personTitle(o: UserOverview): string {
  return realName(o.identity.display_name) ?? o.identity.email ?? (o.identity.is_anonymous ? "Guest" : "Unnamed account");
}

export function isClosed(o: UserOverview): boolean {
  const until = o.identity.banned_until;
  return Boolean(until && new Date(until) > new Date());
}

/** The overview as the shared actions' subject (same derivations as the roster route). */
export function actionSubjectOf(o: UserOverview): UserActionSubject {
  return {
    id: o.identity.id,
    email: o.identity.email,
    display_name: realName(o.identity.display_name),
    is_anonymous: o.identity.is_anonymous,
    banned: isClosed(o),
    erased: Boolean(o.closure?.erased_at),
    admin_level: o.admin_level,
    mcp_full_access: o.identity.permissions.includes(MCP_FULL_ACCESS_PERMISSION),
    top_tier_models: o.identity.permissions.includes(TOP_TIER_MODELS_PERMISSION),
    onboarding_completed: o.identity.onboarding_completed,
  };
}
