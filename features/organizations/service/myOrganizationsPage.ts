// features/organizations/service/myOrganizationsPage.ts — THE BOUNDED READ OF HER ORGANIZATIONS.
//
// Owner ruling (2026-10-16, bounded organizations): a person may belong to hundreds of
// organizations (an agency with a client organization each; test@test.com has 1,531). Her
// organizations are NEVER read whole in the browser: the boot seed carries the first page, and
// everything after it is ONE fixed-URL RPC per page or search —
//   - `iam.my_organizations_page(p_cursor, p_search, p_limit, p_archive)` — ordered by last use
//     (last active, start-up, recent switches, then name); `total` / `has_more` / `next_cursor`;
//   - `iam.my_organizations_by_ids(p_ids)` — "which of these are mine?", same row shape, ≤500 ids.
// Both are SECURITY INVOKER: her own rights, the same answers the old chunked reads gave.

import { supabase } from "@/utils/supabase/client";
import type { Database } from "@/types/database.types";

export type MyOrganizationRow = Database["iam"]["Tables"]["organizations"]["Row"];

export type OrganizationArchiveSlice = "active" | "archived" | "all";

/** One organization in a page: the row plus her membership facts and its member count. */
export interface MyOrganizationEntry {
  organization: MyOrganizationRow;
  role: string;
  status: string;
  /** When her ACTIVE membership began; null for an inactive one. */
  joinedAt: string | null;
  memberCount: number;
}

export interface MyOrganizationsPage {
  entries: MyOrganizationEntry[];
  /** How many match (search + archive slice), across every page. */
  total: number;
  hasMore: boolean;
  /** Pass back as `cursor` for the next page; null on the last page. */
  nextCursor: string | null;
  pageSize: number;
}

export interface MyOrganizationsPageQuery {
  cursor?: string | null;
  search?: string | null;
  /** Omit for the knob `organizations.switcher_page_size`. */
  limit?: number | null;
  archive?: OrganizationArchiveSlice;
}

export type MyOrganizationsReadError = { message: string; code?: string; details?: string; hint?: string };

interface RawEntry {
  organization: MyOrganizationRow;
  role: string;
  status: string;
  joined_at: string | null;
  member_count: number | string | null;
}

function toEntries(raw: unknown): MyOrganizationEntry[] {
  if (!Array.isArray(raw)) return [];
  return (raw as RawEntry[]).map((r) => ({
    organization: r.organization,
    role: r.role,
    status: r.status,
    joinedAt: r.joined_at ?? null,
    memberCount: Number(r.member_count ?? 0),
  }));
}

/** `iam.my_organizations_page`'s jsonb → the page, or null when it is not the shape (never a guess). */
export function parseMyOrganizationsPage(raw: unknown): MyOrganizationsPage | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;
  if (!Array.isArray(r.organizations) || typeof r.total !== "number") return null;
  return {
    entries: toEntries(r.organizations),
    total: r.total,
    hasMore: r.has_more === true,
    nextCursor: typeof r.next_cursor === "string" ? r.next_cursor : null,
    pageSize: typeof r.page_size === "number" ? r.page_size : r.organizations.length,
  };
}

/** ONE page (or one search) of her organizations. A failed read is an error, never an empty page. */
export async function readMyOrganizationsPage(
  query: MyOrganizationsPageQuery = {},
): Promise<{ ok: true; page: MyOrganizationsPage } | { ok: false; error: MyOrganizationsReadError }> {
  const { data, error } = await supabase.schema("iam").rpc("my_organizations_page", {
    p_cursor: query.cursor ?? undefined,
    p_search: query.search?.trim() ? query.search.trim() : undefined,
    p_limit: query.limit ?? undefined,
    p_archive: query.archive ?? "active",
  });
  if (error) return { ok: false, error };
  const page = parseMyOrganizationsPage(data);
  if (!page) return { ok: false, error: { message: "iam.my_organizations_page answered an unexpected shape" } };
  return { ok: true, page };
}

/** Which of these organization ids are hers — archived included, each caller filters. */
export async function readMyOrganizationsByIds(
  ids: readonly string[],
): Promise<{ ok: true; entries: MyOrganizationEntry[] } | { ok: false; error: MyOrganizationsReadError }> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return { ok: true, entries: [] };
  const { data, error } = await supabase.schema("iam").rpc("my_organizations_by_ids", { p_ids: unique });
  if (error) return { ok: false, error };
  const organizations = (data as { organizations?: unknown } | null)?.organizations;
  if (!Array.isArray(organizations)) {
    return { ok: false, error: { message: "iam.my_organizations_by_ids answered an unexpected shape" } };
  }
  return { ok: true, entries: toEntries(organizations) };
}
