'use client';

import React, { useState } from 'react';
import { Settings, Users, Mail, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';
import type { Organization, OrgRole } from '@/features/organizations';
import { GeneralSettings } from './GeneralSettings';
import { MemberManagement } from './MemberManagement';
import { InvitationManager } from './InvitationManager';
import { DangerZone } from './DangerZone';

interface OrgSettingsProps {
  organization: Organization;
  userRole: OrgRole;
  isOwner: boolean;
  isAdmin: boolean;
}

/**
 * OrgSettings - Main settings component with tabbed interface
 * 
 * Tabs:
 * - General: Edit org details (admin/owner)
 * - Members: Manage team members (admin/owner)
 * - Invitations: Send/manage invites (admin/owner)
 * - Danger Zone: Delete org (owner only)
 * 
 * Features:
 * - Permission-based tab visibility
 * - Tab state management
 * - Responsive design
 */
export function OrgSettings({
  organization,
  userRole,
  isOwner,
  isAdmin,
}: OrgSettingsProps) {
  const [activeTab, setActiveTab] = useState('general');

  // Determine which tabs are available based on permissions
  const canManageSettings = isOwner || isAdmin;
  const canManageMembers = isOwner || isAdmin;
  const canDelete = isOwner && !organization.isPersonal;

  return (
    <Card className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 lg:grid-cols-4 mb-6">
          {/* General Tab - Available to all members */}
          <TabsTrigger value="general" className="gap-2">
            <Settings className="h-4 w-4" />
            <span className="hidden sm:inline">General</span>
          </TabsTrigger>

          {/* Members Tab - Admin/Owner only */}
          {canManageMembers && (
            <TabsTrigger value="members" className="gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Members</span>
            </TabsTrigger>
          )}

          {/* Invitations Tab - Admin/Owner only */}
          {canManageSettings && (
            <TabsTrigger value="invitations" className="gap-2">
              <Mail className="h-4 w-4" />
              <span className="hidden sm:inline">Invitations</span>
            </TabsTrigger>
          )}

          {/* Danger Zone Tab - Owner only, not personal org */}
          {canDelete && (
            <TabsTrigger value="danger" className="gap-2 text-red-600 dark:text-red-400">
              <AlertTriangle className="h-4 w-4" />
              <span className="hidden sm:inline">Danger Zone</span>
            </TabsTrigger>
          )}
        </TabsList>

        {/* General Settings Tab */}
        <TabsContent value="general">
          <GeneralSettings
            organization={organization}
            canEdit={canManageSettings}
            userRole={userRole}
          />
        </TabsContent>

        {/* Members Tab */}
        {canManageMembers && (
          <TabsContent value="members">
            <MemberManagement
              organizationId={organization.id}
              userRole={userRole}
              isOwner={isOwner}
              isPersonal={organization.isPersonal}
            />
          </TabsContent>
        )}

        {/* Invitations Tab */}
        {canManageSettings && (
          <TabsContent value="invitations">
            <InvitationManager
              organizationId={organization.id}
              organizationName={organization.name}
              userRole={userRole}
            />
          </TabsContent>
        )}

        {/* Danger Zone Tab */}
        {canDelete && (
          <TabsContent value="danger">
            <DangerZone
              organization={organization}
            />
          </TabsContent>
        )}
      </Tabs>

      {/* Read-only notice for members */}
      {!canManageSettings && activeTab === 'general' && (
        <div className="mt-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            <strong>Note:</strong> You have view-only access to this organization. Contact an admin or owner to make changes.
          </p>
        </div>
      )}
    </Card>
  );
}

