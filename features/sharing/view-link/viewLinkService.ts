// features/sharing/view-link/viewLinkService.ts — SHARE ONE SAVED VIEW BY LINK (lane VIEW-LINK).
//
// A view link is the platform's Anyone link (`platform.share_links`, resource type `platform_saved_view`)
// minted through the ONE existing mint door `public.create_share_link` — so the rule "Edit may share;
// outside the organization follows the inside rule" is the store's, never a copy here. What a link OPENS is
// `/v/<token>` (`custom.shared_view_read`): that one view, read-only. The short `/r/` alias the mint door
// also makes opens the generic record viewer, so it is never the URL handed out here.
//
//   list    `custom.view_share_links(p_view_id)`        rows only for a person who may make one; who made each
//   mint    `public.create_share_link(...)`             viewer level only
//   revoke  `custom.revoke_view_share_link(p_link_id)`  its maker, or anyone who may make one
//
// Doors speak a sentence when they refuse; it is passed on as is.

import { storeDoors } from "@ai-matrx/records/core";

import { supabase } from "@/utils/supabase/client";
import { createShareLink } from "@/utils/permissions/shareLinks";

export interface ViewLink {
  id: string;
  token: string;
  label: string | null;
  useCount: number;
  lastUsedAt: string | null;
  createdAt: string;
  createdBy: string;
  createdByName: string | null;
  madeByMe: boolean;
}

/** Where the holder of this token opens the view: `/v/<token>`, never the `/r/` alias. */
export function viewLinkUrl(token: string, base?: string): string {
  const origin = base ?? process.env.NEXT_PUBLIC_APP_URL ?? (typeof window !== "undefined" ? window.location.origin : "");
  return `${origin.replace(/\/$/, "")}/v/${token}`;
}

export async function listViewLinks(viewId: string): Promise<ViewLink[]> {
  const { data, error } = await storeDoors(supabase).rpc("view_share_links", { p_view_id: viewId });
  if (error) throw new Error(error.message);
  if (!Array.isArray(data)) return [];
  return (data as Record<string, unknown>[]).map((r) => ({
    id: String(r.id),
    token: String(r.token),
    label: (r.label as string | null) ?? null,
    useCount: Number(r.use_count ?? 0),
    lastUsedAt: (r.last_used_at as string | null) ?? null,
    createdAt: String(r.created_at),
    createdBy: String(r.created_by),
    createdByName: (r.created_by_name as string | null) ?? null,
    madeByMe: r.made_by_me === true,
  }));
}

/** Makes a Viewer link for the view; the answer is the refusal sentence when the store says no. */
export async function makeViewLink(viewId: string, label: string | null): Promise<{ ok: true } | { ok: false; error: string }> {
  const made = await createShareLink({ resourceType: "platform_saved_view", resourceId: viewId, permissionLevel: "viewer", label });
  return made.success ? { ok: true } : { ok: false, error: made.error ?? "The link could not be made." };
}

export async function turnOffViewLink(linkId: string): Promise<{ ok: true } | { ok: false; error: string }> {
  const { data, error } = await storeDoors(supabase).rpc("revoke_view_share_link", { p_link_id: linkId });
  if (error) return { ok: false, error: error.message };
  const answer = data as { success?: boolean; error?: string } | null;
  return answer?.success ? { ok: true } : { ok: false, error: answer?.error ?? "The link could not be turned off." };
}
