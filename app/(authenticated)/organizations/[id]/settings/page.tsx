'use client';

import React from 'react';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { useOrganization, useUserRole } from '@/utils/organizations';
import { OrgSettings } from '@/features/organizations/components/OrgSettings';

/**
 * Organization Settings Page
 * 
 * Route: /organizations/[id]/settings
 * 
 * Features:
 * - Load organization details
 * - Check user permissions
 * - Display tabbed settings interface
 * - Handle navigation back to org list
 */
export default function OrganizationSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const organizationId = params.id as string;

  const { organization, loading: orgLoading, error: orgError } = useOrganization(organizationId);
  const { role, loading: roleLoading, isOwner, isAdmin } = useUserRole(organizationId);

  const loading = orgLoading || roleLoading;

  // Loading state
  if (loading) {
    return (
      <div className="h-full w-full bg-textured flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <p className="text-muted-foreground">Loading organization...</p>
        </div>
      </div>
    );
  }

  // Error state
  if (orgError || !organization) {
    return (
      <div className="h-full w-full bg-textured p-8">
        <Card className="max-w-2xl mx-auto p-8 bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-900 dark:text-red-100 mb-2">
              Organization Not Found
            </h2>
            <p className="text-red-700 dark:text-red-300 mb-6">
              {orgError || 'The organization you\'re looking for doesn\'t exist or you don\'t have access to it.'}
            </p>
            <Button onClick={() => router.push('/organizations')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Organizations
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // Not a member
  if (!role) {
    return (
      <div className="h-full w-full bg-textured p-8">
        <Card className="max-w-2xl mx-auto p-8 bg-amber-50 dark:bg-amber-900/20 border-amber-200 dark:border-amber-800">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-amber-900 dark:text-amber-100 mb-2">
              Access Denied
            </h2>
            <p className="text-amber-700 dark:text-amber-300 mb-6">
              You are not a member of this organization.
            </p>
            <Button onClick={() => router.push('/organizations')} variant="outline">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Organizations
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="h-full w-full bg-textured">
      <div className="p-8 md:p-12">
        {/* Header */}
        <div className="mb-8">
          <Button
            variant="ghost"
            onClick={() => router.push('/organizations')}
            className="mb-4 -ml-2"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Organizations
          </Button>

          <div className="flex items-center gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100">
                {organization.name}
              </h1>
              <p className="text-muted-foreground mt-1">
                Organization Settings
              </p>
            </div>
          </div>
        </div>

        {/* Settings Component */}
        <OrgSettings
          organization={organization}
          userRole={role}
          isOwner={isOwner}
          isAdmin={isAdmin}
        />
      </div>
    </div>
  );
}

