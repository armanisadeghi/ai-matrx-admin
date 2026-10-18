"use client";

/**
 * Organization System context values — the organization's own value for each curated System item;
 * every run of this organization uses it before the platform value.
 */

import { useParams } from "next/navigation";
import { Skeleton } from "@ai-matrx/design-system";
import { OrgSystemValuesSection } from "@/features/organizations/system-values/OrgSystemValuesSection";
import { OrganizationAccessGate } from "@/features/organizations/components/OrganizationAccessGate";
import { useResolvedOrganization, useUserRole } from "@/features/organizations/hooks";
import { supabase } from "@/utils/supabase/client";

export default function OrgSystemContextPage() {
  const params = useParams();
  const orgSlugOrId = typeof params.orgId === "string" ? params.orgId : undefined;
  const { organizationId, loading, error, refresh } = useResolvedOrganization(orgSlugOrId);
  const { loading: roleLoading, isOwner, isAdmin } = useUserRole(organizationId ?? undefined);

  if (!orgSlugOrId) return null;
  if (loading || roleLoading) {
    return (
      <div className="mx-auto max-w-4xl space-y-4 p-4">
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }
  if (error || !organizationId) {
    return (
      <OrganizationAccessGate
        orgSlugOrId={orgSlugOrId}
        organizationId={organizationId}
        error={error}
        onRetry={refresh}
      />
    );
  }
  return (
    <div className="h-full overflow-y-auto p-4">
      <div className="mx-auto max-w-4xl">
        <OrgSystemValuesSection
          organizationId={organizationId}
          canEdit={isOwner || isAdmin}
          client={supabase}
        />
      </div>
    </div>
  );
}
