// Server-only: write one admin.admin_audit_log row for an admin action on one person that a Next
// admin route performs with the service-role client (auth.admin.* calls the database cannot make).
// Every SQL door that acts on a person writes its own row through the same helper,
// admin._audit_user_action; this is the route-side caller of it. Guard: pnpm check:user-action-audit.

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database, Json } from "@/types/database.types";

export type RouteUserAction =
  | "onboarding_flag_set"
  | "mcp_full_access_grant"
  | "mcp_full_access_revoke"
  | "magic_link_create"
  | "password_reset_link_create";

export interface RouteUserActionInput {
  action: RouteUserAction;
  /** The person acted on. */
  targetUserId: string;
  /** The signed-in super admin (requireSuperAdmin's id): the service role has no auth.uid(). */
  actorUserId: string;
  before?: Json;
  after?: Json;
  reason?: string | null;
  metadata?: Json;
}

/** Throws when the row was not written, so the route reports it instead of hiding it. */
export async function recordUserAction(
  serviceClient: SupabaseClient<Database>,
  input: RouteUserActionInput,
): Promise<void> {
  const { error } = await serviceClient.schema("admin").rpc("_audit_user_action", {
    p_action: input.action,
    p_target: input.targetUserId,
    p_actor: input.actorUserId,
    p_before: input.before ?? undefined,
    p_after: input.after ?? undefined,
    p_reason: input.reason ?? undefined,
    p_metadata: input.metadata ?? {},
  });
  if (error) {
    throw new Error(`The change was made but its audit row was not written: ${error.message}`);
  }
}
