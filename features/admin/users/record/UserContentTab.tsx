"use client";

// A person's Content tab (/administration/users/<id>/content): everything they own, by registered
// resource type — admin.user_owned_resources_shard over platform.shareable_resource_registry (the
// registry aidream's user_inventory.py counts). Each type shows live count, archived, last update
// and its newest records, each opening its own record (OwnedResourcesTable, shared with the org
// member page). Types they own none of collapse into one "None" line; registry types whose table is gone
// into one "unavailable" line. The census is kept per person (computed_at); Refresh recounts.

import { useEffect, useState } from "react";
import { ErrorNotice, readOf } from "@ai-matrx/design-system";
import { OwnedResourcesTable } from "@/features/organizations/admin/components/OwnedResourcesTable";
import { useRecordLoad } from "./useRecordLoad";
import { fetchUserOwnedResources, refreshUserOwnedResources } from "./userOwnedResources";
import type { UserTabBodyProps } from "./UserRecordPage";

export function UserContentTab({ userId, version: pageVersion, shareForAi }: UserTabBodyProps) {
  const [load, setLoad] = useState({ version: 0, recount: false });
  const { data, loading, error } = useRecordLoad(
    load.recount ? refreshUserOwnedResources : fetchUserOwnedResources,
    userId,
    pageVersion + load.version,
  );
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
          calls={["admin.user_owned_resources_shard"]}
        />
      ) : null}
      <OwnedResourcesTable
        tableId="admin-user-content"
        rows={data?.rows ?? []}
        isLoading={loading && !data}
        isFetching={loading && Boolean(data)}
        read={readOf({ loading, error }, { what: "owned resources", onRetry: reload })}
        coverageNoun="resource type"
        title={data?.computedAt ? `Owned resources · counted ${new Date(data.computedAt).toLocaleString()}` : "Owned resources"}
        emptyTitle="Owns nothing yet"
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
