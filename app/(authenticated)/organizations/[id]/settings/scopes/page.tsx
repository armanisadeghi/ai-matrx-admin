"use client";

import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useOrganization, useUserRole } from "@/features/organizations";
import { ScopeManagerPage } from "@/features/context/components/scope-admin";

export default function OrganizationScopesPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;

  const {
    organization,
    loading: orgLoading,
    error: orgError,
  } = useOrganization(organizationId);
  const {
    role,
    loading: roleLoading,
    isOwner,
    isAdmin,
  } = useUserRole(organizationId);

  const loading = orgLoading || roleLoading;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Loading organization...
          </p>
        </div>
      </div>
    );
  }

  if (orgError || !organization) {
    return (
      <div className="p-4 md:p-6">
        <Card className="max-w-lg mx-auto p-6 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-red-900 dark:text-red-100 mb-2">
              Organization Not Found
            </h2>
            <p className="text-sm text-red-700 dark:text-red-300 mb-4">
              {orgError ||
                "This organization doesn't exist or you don't have access."}
            </p>
            <Button
              onClick={() => router.push("/settings/organizations")}
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Organizations
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  if (!role || (!isAdmin && !isOwner)) {
    return (
      <div className="p-4 md:p-6">
        <Card className="max-w-lg mx-auto p-6 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="text-center">
            <ShieldAlert className="h-8 w-8 text-amber-600 dark:text-amber-400 mx-auto mb-3" />
            <h2 className="text-lg font-semibold text-amber-900 dark:text-amber-100 mb-2">
              Admin Access Required
            </h2>
            <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">
              Only admins and owners can manage organization scopes.
            </p>
            <Button
              onClick={() =>
                router.push(`/organizations/${organizationId}/settings`)
              }
              variant="outline"
              size="sm"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Settings
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <ScopeManagerPage
      organizationId={organizationId}
      organizationName={organization.name}
    />
  );
}
