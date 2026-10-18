// THE ONE client door for platform-admin membership changes (add / change role / remove), shared by
// Users & Access › Organizations and a person's Organizations tab. Server side:
// app/api/admin/users/organizations → iam.admin_manage_organization_membership (writes the audit row; reason required).
//
// One person's memberships are read direct from the database (iam.memberships, platform-admin RLS),
// never through the whole-directory route.

import { readAllRows } from "@ai-matrx/data/db";
import { createClient } from "@/utils/supabase/client";
import type { OrgRole } from "@/features/organizations/types";

export type MembershipMethod = "POST" | "PATCH" | "DELETE";

export interface MembershipChange {
  organizationId: string;
  userId: string;
  role?: OrgRole;
  /** Why — recorded on the person's admin history. */
  reason?: string;
}

/** Apply one membership change; throws with the server's own words on refusal. */
export async function mutateOrgMembership(method: MembershipMethod, body: MembershipChange): Promise<void> {
  const response = await fetch("/api/admin/users/organizations", {
    method,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await response.json().catch(() => ({}))) as { error?: string };
  if (!response.ok) throw new Error(json.error ?? "Membership change failed");
}

export interface PersonMembership {
  id: string;
  organization_id: string;
  organization_name: string;
  organization_slug: string | null;
  is_system: boolean;
  archived_at: string | null;
  role: string;
  status: string;
  joined_at: string;
}

/** Every organization membership this person holds or held (active and departed), newest first. */
export async function listPersonMemberships(userId: string): Promise<PersonMembership[]> {
  // Shown as the complete list, so read through readAllRows (PostgREST caps a bare select at 1000).
  const data = await readAllRows(
    ({ from, to }) =>
      createClient()
        .schema("iam")
        .from("memberships")
        .select("id, organization_id, role, status, created_at, organization:organizations!memberships_organization_id_fkey(name, slug, is_system, archived_at)", { count: "exact" })
        .eq("user_id", userId)
        .eq("container_type", "organization")
        .is("deleted_at", null)
        .order("created_at", { ascending: false })
        .order("id")
        .range(from, to),
    { label: "iam.memberships for one person" },
  );
  return data.map((row) => {
    const org = (Array.isArray(row.organization) ? row.organization[0] : row.organization) as
      | { name: string | null; slug: string | null; is_system: boolean | null; archived_at: string | null }
      | null;
    return {
      id: row.id,
      organization_id: row.organization_id,
      organization_name: org?.name ?? "Unnamed organization",
      organization_slug: org?.slug ?? null,
      is_system: Boolean(org?.is_system),
      archived_at: org?.archived_at ?? null,
      role: String(row.role),
      status: row.status,
      joined_at: row.created_at,
    };
  });
}
