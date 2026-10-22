import "server-only";

import { operationFailed } from "@/utils/errors";
import { createAdminClient } from "@/utils/supabase/adminClient";
import { createClient } from "@/utils/supabase/server";
import type {
  AdminOrganizationDirectory,
  AdminOrganizationKind,
  AdminOrganizationMembershipRow,
  AdminOrganizationRow,
} from "@/features/admin/users/types";
import type { OrgRole } from "@/features/organizations/types";
import { readEffectiveKnobOnServer } from "@/lib/scoped-config/effectiveKnobs.server";
import { readAllRows } from "@ai-matrx/data/db";
// The leaf entry, not the root barrel: the root is a client module, so on the server its
// DEFAULT_ARCHIVE_FILTER is a reference object, never "active" — the list silently returned
// every archived organization (4,062 rows; 382 are open).
import {
  DEFAULT_ARCHIVE_FILTER,
  type ArchiveFilterValue,
} from "@ai-matrx/design-system/archive-filter";

/**
 * Load every organization and active organization membership for super-admin views.
 *
 * THE ARCHIVED-ITEMS LAW: `archiveFilter` defaults to "active", so the
 * directory hides archived organizations, and "archived" / "all" are the
 * reveal. Every row carries `archived_at`, so a surface showing "all" can
 * label which of them are closed instead of mixing them in unlabelled.
 */
export async function loadAdminOrganizationDirectory(
  archiveFilter: ArchiveFilterValue = DEFAULT_ARCHIVE_FILTER,
): Promise<AdminOrganizationDirectory> {
  const admin = createAdminClient();
  // PostgREST caps one response at 1,000 rows. `readAllRows` pages each read to its declared total
  // (and throws rather than return a short list), so the directory is never silently truncated.
  let organizations_: Awaited<ReturnType<typeof readOrganizations>>;
  let memberships_: Awaited<ReturnType<typeof readMemberships>>;
  let kinds_: Awaited<ReturnType<typeof readKinds>>;
  try {
    [organizations_, kinds_] = await Promise.all([
      readOrganizations(admin, archiveFilter),
      readKinds(admin, archiveFilter),
    ]);
    // Only the memberships of the organizations this read lists (never every organization's).
    memberships_ = await readMemberships(
      admin,
      organizations_.map((organization) => organization.id),
    );
  } catch (error) {
    throw new Error(
      `Failed to load organization directory: ${error instanceof Error ? error.message : String(error)}`,
    );
  }
  const organizationsResult = { data: organizations_ };
  const membershipsResult = { data: memberships_ };

  const memberships: AdminOrganizationMembershipRow[] = [];
  const countsByOrganization = new Map<
    string,
    { members: number; owners: number; admins: number }
  >();

  for (const row of membershipsResult.data ?? []) {
    if (
      !row.id ||
      !row.organization_id ||
      !row.user_id ||
      !row.role ||
      !row.joined_at
    ) {
      console.error("Invalid active organization membership row", row);
      continue;
    }

    memberships.push({
      id: row.id,
      organization_id: row.organization_id,
      user_id: row.user_id,
      role: row.role,
      joined_at: row.joined_at,
      invited_by: row.invited_by ?? null,
    });

    const counts = countsByOrganization.get(row.organization_id) ?? {
      members: 0,
      owners: 0,
      admins: 0,
    };
    counts.members += 1;
    if (row.role === "owner") counts.owners += 1;
    if (row.role === "admin") counts.admins += 1;
    countsByOrganization.set(row.organization_id, counts);
  }

  const kindByOrganization = new Map(
    kinds_.map((row) => [row.organization_id, row.kind as AdminOrganizationKind]),
  );
  const organizations: AdminOrganizationRow[] = (
    organizationsResult.data ?? []
  ).map((row) => {
    const counts = countsByOrganization.get(row.id) ?? {
      members: 0,
      owners: 0,
      admins: 0,
    };
    return {
      id: row.id,
      name: row.name,
      abbreviation: row.abbreviation,
      slug: row.slug,
      description: row.description ?? null,
      website: row.website ?? null,
      created_at: row.created_at ?? null,
      created_by: row.created_by ?? null,
      is_system: row.is_system,
      archived_at: row.archived_at ?? null,
      member_count: counts.members,
      owner_count: counts.owners,
      admin_count: counts.admins,
      // A kind row can be missing only when the organization was born between the two reads;
      // it says so ("Unknown") instead of borrowing another kind's label.
      kind: kindByOrganization.get(row.id) ?? "unknown",
    };
  });

  return { organizations, memberships, defaultKind: await readDefaultKind() };
}

/** Mutate one canonical organization membership through the audited DB RPC. */
export async function manageAdminOrganizationMembership(args: {
  action: "add" | "set_role" | "remove";
  organizationId: string;
  userId: string;
  role?: OrgRole;
  /** Recorded on the person's admin audit row (admin._audit_user_action) and on iam.org_admin_audit. */
  reason?: string;
}) {
  const session = await createClient();
  const { data, error } = await session.schema("iam").rpc(
    "admin_manage_organization_membership",
    {
      p_action: args.action,
      p_org_id: args.organizationId,
      p_user_id: args.userId,
      p_role: args.role,
      p_reason: args.reason,
    },
  );

  if (error) throw operationFailed("apply that membership change", error);
  return data;
}

function readOrganizations(
  admin: ReturnType<typeof createAdminClient>,
  archiveFilter: ArchiveFilterValue,
) {
  return readAllRows(
    ({ from, to }) => {
      let query = admin
        .schema("iam")
        .from("organizations")
        .select(
          "id, name, abbreviation, slug, description, website, created_at, created_by, is_system, archived_at",
          { count: "exact" },
        );
      if (archiveFilter === "active") query = query.is("archived_at", null);
      else if (archiveFilter === "archived")
        query = query.not("archived_at", "is", null);
      return query
        .order("name", { ascending: true })
        .order("id", { ascending: true })
        .range(from, to);
    },
    { label: "iam.organizations (admin directory)" },
  );
}

type KindRow = { organization_id: string; kind: string };
type KindQuery = {
  is: (column: string, value: null) => KindQuery;
  not: (column: string, operator: string, value: null) => KindQuery;
  range: (from: number, to: number) => PromiseLike<{
    data: KindRow[] | null;
    count: number | null;
    error: { message: string } | null;
  }>;
};

// iam.organization_kind is newer than types/database.types.ts (run `pnpm db-types` to drop this cast).
function readKinds(
  admin: ReturnType<typeof createAdminClient>,
  archiveFilter: ArchiveFilterValue,
) {
  const iam = admin.schema("iam") as unknown as {
    from: (view: string) => {
      select: (columns: string, options: { count: "exact" }) => {
        order: (column: string, options: { ascending: boolean }) => KindQuery;
      };
    };
  };
  return readAllRows<KindRow>(
    ({ from, to }) => {
      let query = iam
        .from("organization_kind")
        .select("organization_id, kind", { count: "exact" })
        .order("organization_id", { ascending: true });
      if (archiveFilter === "active") query = query.is("archived_at", null);
      else if (archiveFilter === "archived") query = query.not("archived_at", "is", null);
      return query.range(from, to);
    },
    { label: "iam.organization_kind (admin directory)" },
  );
}

/** Knob admin_organizations.default_kind; an unanswered read opens on "real" (the knob's registered default). */
async function readDefaultKind(): Promise<AdminOrganizationDirectory["defaultKind"]> {
  const value = await readEffectiveKnobOnServer({ feature: "admin_organizations", key: "default_kind" });
  return value === "all" || value === "guests" || value === "tests" || value === "empty" || value === "real"
    ? value
    : "real";
}

async function readMemberships(
  admin: ReturnType<typeof createAdminClient>,
  organizationIds: string[],
) {
  // 80 ids per read keeps each request address short; each chunk is paged to its declared total.
  const chunks: string[][] = [];
  for (let i = 0; i < organizationIds.length; i += 80) chunks.push(organizationIds.slice(i, i + 80));
  const rows = await Promise.all(
    chunks.map((ids) =>
      readAllRows(
        ({ from, to }) =>
          admin
            .schema("iam")
            .from("organization_member")
            .select("id, organization_id, user_id, role, joined_at, invited_by", {
              count: "exact",
            })
            .in("organization_id", ids)
            .order("id", { ascending: true })
            .range(from, to),
        { label: "iam.organization_member (admin directory)" },
      ),
    ),
  );
  return rows.flat();
}
