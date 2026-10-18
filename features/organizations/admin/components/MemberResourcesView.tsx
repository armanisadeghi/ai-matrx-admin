"use client";

/** Read-only org-scoped resource inventory for one member. */
import Link from "next/link";
import { ArrowLeft, Loader2 } from "lucide-react";
import { Card } from "@/components/ui/card";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import {
  ORGANIZATIONS_SURFACE_NAME,
  createOrganizationsScope,
} from "@/features/surfaces/manifests/organizations.manifest";
import type { Organization } from "../../types";
import { OwnedResourcesTable } from "./OwnedResourcesTable";
import { recordUnavailableMessage } from "@/lib/records/recordUnavailable";
import { useOrgMemberDetail } from "../hooks";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { readOf } from "@ai-matrx/design-system";
import { UntrustedCount } from "@ai-matrx/design-system";

interface Props {
  orgId: string;
  organization: Organization;
  userId: string;
}

export function MemberResourcesView({ orgId, organization, userId }: Props) {
  const { member, loading, error, refresh } = useOrgMemberDetail(orgId, userId);
  if (loading && !member)
    return (
      <div className="flex items-center justify-center py-16 text-muted-foreground">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" /> Loading resources…
      </div>
    );
  if (!member)
    return (
      <div className="p-4 md:p-6">
        <Card className="mx-auto max-w-lg border-destructive/30 bg-destructive/5 p-6 text-center text-sm text-destructive-ink">
          {error ?? recordUnavailableMessage("member", "unknown")}
          <ErrorAlchemyMenu error={error} />
        </Card>
      </div>
    );

  // The resource counts are this read's answer; a failed refresh is "—", not a stale 0.
  const membersRead = readOf({ loading, error }, { what: "this member's resources", onRetry: refresh });
  const label = member.displayName || member.email || "this member";
  const total = member.resources.reduce(
    (sum, resource) => sum + resource.count,
    0,
  );
  const getScope = () =>
    createOrganizationsScope({
      current_view: "workspace",
      org_id: organization.id,
      org_slug: organization.slug,
      org_name: organization.name,
      selected_member_id: userId,
      member_resource_total: total,
      member_resources: member.resources.map((resource) => ({
        resource_type: resource.resourceType,
        display_label: resource.displayLabel,
        schema_name: resource.schemaName,
        table_name: resource.tableName,
        count: resource.count,
      })),
    });

  return (
    <SurfaceRuntimeProvider
      surfaceName={ORGANIZATIONS_SURFACE_NAME}
      getScope={getScope}
    >
      <div className="flex h-full min-h-0 w-full flex-col gap-4 p-4 md:p-6">
        <Link
          href={`/organizations/${organization.slug}/admin/users/${userId}`}
          className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {label}
        </Link>
        {/* Org-scoped only: personal-organization resources are never counted here or affected. */}
        <p className="shrink-0 text-sm text-muted-foreground">
          <UntrustedCount read={membersRead} value={total} label="Resources" /> resource
          {total === 1 ? "" : "s"} in {organization.name}
        </p>
        {/* A failed refresh is said once, by the table's stale notice (read=). */}
        <div className="min-h-0 flex-1">
          <OwnedResourcesTable
            tableId="organizations-admin-member-resources"
            rows={member.resources}
            isLoading={loading && !member}
            isFetching={loading && Boolean(member)}
            read={membersRead}
            coverageNoun="org-scoped resource type"
            title="Org-scoped resources"
            emptyTitle="This member owns no org-scoped resources in this organization."
            onRefresh={refresh}
          />
        </div>
      </div>
    </SurfaceRuntimeProvider>
  );
}
