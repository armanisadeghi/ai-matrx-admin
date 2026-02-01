'use client';

import React, { useState } from 'react';
import { Settings, Users, Mail, AlertTriangle } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
    <div>
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start gap-1 h-auto p-1 mb-4">
          <TabsTrigger value="general" className="gap-1.5 px-3 py-1.5 text-sm">
            <Settings className="h-3.5 w-3.5" />
            General
          </TabsTrigger>

          {canManageMembers && (
            <TabsTrigger value="members" className="gap-1.5 px-3 py-1.5 text-sm">
              <Users className="h-3.5 w-3.5" />
              Members
            </TabsTrigger>
          )}

          {canManageSettings && (
            <TabsTrigger value="invitations" className="gap-1.5 px-3 py-1.5 text-sm">
              <Mail className="h-3.5 w-3.5" />
              Invites
            </TabsTrigger>
          )}

          {canDelete && (
            <TabsTrigger value="danger" className="gap-1.5 px-3 py-1.5 text-sm text-red-600 dark:text-red-400 data-[state=active]:text-red-600">
              <AlertTriangle className="h-3.5 w-3.5" />
              Danger
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
        <div className="mt-4 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            View-only access. Contact an admin to make changes.
          </p>
        </div>
      )}
    </div>
  );
}

