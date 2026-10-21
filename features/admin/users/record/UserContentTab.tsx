"use client";

// A person's Content tab (/administration/users/<id>/content): everything they own, by registered
// resource type — admin.user_owned_resources_shard over platform.shareable_resource_registry (the
// registry aidream's user_inventory.py counts). Each type shows live count, archived, last update
// and its newest records, each opening its own record (OwnedResourcesTable, shared with the org
// member page). Types they own none of collapse into one "None" line; registry types whose table is gone
// into one "unavailable" line. The census is kept per person (computed_at); Refresh recounts.
// An organization's seat sees only what they own IN that organization
// (public.org_admin_list_member_resources: counts per registered type, counted live).

import { useEffect, useMemo, useState } from "react";
import { ErrorNotice, readOf } from "@ai-matrx/design-system";
import { OwnedResourcesTable } from "@/features/organizations/admin/components/OwnedResourcesTable";
import { useRecordLoad } from "./useRecordLoad";
import { fetchUserOwnedResources, refreshUserOwnedResources, type UserOwnedResources } from "./userOwnedResources";
import { listMemberResources } from "@/features/organizations/admin/service";
import type { ScopedTabBodyProps } from "./UserRecordPage";
import type { UserRecordScope } from "./userSurfaces";

/** The organization's slice, in the platform census's shape (live counts; nothing kept). */
async function organizationOwnedResources(orgId: string, userId: string): Promise<UserOwnedResources> {
  const counted = await listMemberResources(orgId, userId);
  const rows = counted.filter((r) => r.count > 0).sort((a, b) => b.count - a.count || a.displayLabel.localeCompare(b.displayLabel));
  return {
    rows,
    none: counted.filter((r) => r.count === 0).map((r) => r.displayLabel).sort((a, b) => a.localeCompare(b)),
    registered: counted.length,
    unavailable: [],
    computedAt: null,
    elapsedMs: 0,
    shardErrors: [],
  };
}

function contentFetcher(scope: UserRecordScope, recount: boolean): (userId: string) => Promise<UserOwnedResources> {
  if (scope.kind === "organization") return (userId) => organizationOwnedResources(scope.orgId, userId);
  return recount ? refreshUserOwnedResources : fetchUserOwnedResources;
}

export function UserContentTab({ userId, scope, version: pageVersion, shareForAi }: ScopedTabBodyProps) {
  const [load, setLoad] = useState({ version: 0, recount: false });
  const fetcher = useMemo(() => contentFetcher(scope, load.recount), [scope, load.recount]);
  const { data, loading, error } = useRecordLoad(fetcher, userId, pageVersion + load.version);
  const inOrganization = scope.kind === "organization";
  useEffect(() => {
    if (data) shareForAi({ content: data.rows, shardErrors: data.shardErrors });
  }, [data, shareForAi]);
  const reload = () => setLoad((l) => ({ version: l.version + 1, recount: true }));

  return (
    <div data-testid="user-content-tab" className="grid gap-3">
      {data?.shardErrors.length ? (
        <ErrorNotice
          size="inline"
          message="Some resource types could not be read."
          error={data.shardErrors.join("\n")}
          operation="Read owned resources"
          calls={[inOrganization ? "public.org_admin_list_member_resources" : "admin.user_owned_resources_shard"]}
        />
      ) : null}
      <OwnedResourcesTable
        tableId={inOrganization ? "organizations-admin-member-resources" : "admin-user-content"}
        rows={data?.rows ?? []}
        isLoading={loading && !data}
        isFetching={loading && Boolean(data)}
        read={readOf({ loading, error }, { what: "owned resources", onRetry: reload })}
        coverageNoun={inOrganization ? "org-scoped resource type" : "resource type"}
        title={
          inOrganization
            ? `Owned in ${scope.orgName}`
            : data?.computedAt
              ? `Owned resources · counted ${new Date(data.computedAt).toLocaleString()}`
              : "Owned resources"
        }
        emptyTitle={inOrganization ? "Owns nothing in this organization" : "Owns nothing yet"}
        onRefresh={reload}
      />
      {!error && data?.none.length ? (
        <details className="type-secondary text-muted-foreground" data-testid="user-content-none">
          <summary data-clickable="">None in {data.none.length} types</summary>
          <p className="mt-1">{data.none.join(", ")}</p>
        </details>
      ) : null}
      {!error && data?.unavailable.length ? (
        <details className="type-secondary text-muted-foreground" data-testid="user-content-unavailable">
          <summary data-clickable="">{data.unavailable.length} types unavailable</summary>
          <p className="mt-1">{data.unavailable.join(", ")}</p>
        </details>
      ) : null}
    </div>
  );
}
