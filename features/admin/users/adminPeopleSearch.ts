"use client";

// Jump to a person from ⌘K (users one-roof lane C, 2026-10-17; lane Q S10, 2026-10-18). The global
// command bar asks this, for platform admins only, once she has typed two characters. The DATABASE
// answers (admin.search_people: every typed word in the email, name, display name or id; starts-with
// ranks first) — no roster is loaded, so it costs one small read at any number of people. Picking a hit
// opens the person's page (`userRecordHref`).

import { createClient } from "@/utils/supabase/client";
import { usableLabel } from "./useAdminUserLabel";

export interface AdminPersonHit {
  id: string;
  label: string;
  email: string | null;
}

/** Up to `limit` people matching every typed word (email, name or id), best first. */
export async function searchAdminPeople(query: string, limit = 6): Promise<AdminPersonHit[]> {
  if (!query.trim()) return [];
  const { data, error } = await createClient()
    .schema("admin")
    .rpc("search_people", { p_query: query, p_limit: limit });
  if (error) throw new Error(`People search failed: ${error.message}`);
  return (data ?? []).map((p) => ({
    id: p.id,
    email: p.email,
    label: usableLabel(p.display_name ?? p.name, p.email) ?? p.email ?? p.id,
  }));
}
