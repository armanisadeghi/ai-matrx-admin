'use client';

import React, { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Users, Building2, Globe } from 'lucide-react';
import { useSharing, useIsOwner } from '@/utils/permissions';
import type { ResourceType } from '@/utils/permissions';
import { PermissionsList } from './PermissionsList';
import { ShareWithUserTab } from './tabs/ShareWithUserTab';
import { ShareWithOrgTab } from './tabs/ShareWithOrgTab';
import { PublicAccessTab } from './tabs/PublicAccessTab';
import { getResourceTypeLabel } from '@/utils/permissions';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  resourceType: ResourceType;
  resourceId: string;
  resourceName: string;
  isOwner: boolean;
}

/**
 * ShareModal - Main sharing interface
 * 
 * Generic modal that works with ANY resource type.
 * Provides tabs for sharing with users, organizations, or making public.
 * 
 * @example
 * <ShareModal
 *   isOpen={isOpen}
 *   onClose={() => setIsOpen(false)}
 *   resourceType="workflow"
 *   resourceId={workflowId}
 *   resourceName="My Workflow"
 *   isOwner={true}
 * />
 */
export function ShareModal({
  isOpen,
  onClose,
  resourceType,
  resourceId,
  resourceName,
  isOwner,
}: ShareModalProps) {
  const [activeTab, setActiveTab] = useState<'users' | 'organizations' | 'public'>('users');

  const {
    permissions,
    loading,
    error,
    shareWithUser,
    shareWithOrg,
    makePublic,
    revokeAccess,
    updateLevel,
    refresh,
  } = useSharing(resourceType, resourceId);

  // Filter permissions by type for each tab
  const userPermissions = permissions.filter((p) => p.grantedToUserId);
  const orgPermissions = permissions.filter((p) => p.grantedToOrganizationId);
  const publicPermission = permissions.find((p) => p.isPublic);

  const resourceLabel = getResourceTypeLabel(resourceType);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>Share {resourceLabel}</DialogTitle>
          <DialogDescription className="truncate">
            {resourceName}
          </DialogDescription>
        </DialogHeader>

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as typeof activeTab)}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="users" className="gap-2">
              <Users className="w-4 h-4" />
              <span className="hidden sm:inline">Users</span>
              {userPermissions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 rounded-full">
                  {userPermissions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="organizations" className="gap-2">
              <Building2 className="w-4 h-4" />
              <span className="hidden sm:inline">Organizations</span>
              {orgPermissions.length > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-primary/10 rounded-full">
                  {orgPermissions.length}
                </span>
              )}
            </TabsTrigger>
            <TabsTrigger value="public" className="gap-2">
              <Globe className="w-4 h-4" />
              <span className="hidden sm:inline">Public</span>
              {publicPermission && (
                <span className="ml-1 px-1.5 py-0.5 text-xs bg-green-500/10 rounded-full">
                  •
                </span>
              )}
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 mt-4 h-[450px]">
            <TabsContent value="users" className="mt-0 space-y-4 h-full overflow-y-auto">
              {/* Current user permissions */}
              <div>
                <h3 className="text-sm font-medium mb-3">Current Access</h3>
                <PermissionsList
                  permissions={userPermissions}
                  isOwner={isOwner}
                  onUpdateLevel={updateLevel}
                  onRevoke={revokeAccess}
                  loading={loading}
                />
              </div>

              {/* Add user form */}
              {isOwner && (
                <ShareWithUserTab
                  onShare={shareWithUser}
                  onSuccess={refresh}
                  resourceType={resourceType}
                  resourceId={resourceId}
                />
              )}
            </TabsContent>

            <TabsContent value="organizations" className="mt-0 space-y-4 h-full overflow-y-auto">
              {/* Current org permissions */}
              <div>
                <h3 className="text-sm font-medium mb-3">Current Access</h3>
                <PermissionsList
                  permissions={orgPermissions}
                  isOwner={isOwner}
                  onUpdateLevel={updateLevel}
                  onRevoke={revokeAccess}
                  loading={loading}
                />
              </div>

              {/* Add org form */}
              {isOwner && (
                <ShareWithOrgTab
                  onShare={shareWithOrg}
                  onSuccess={refresh}
                  resourceType={resourceType}
                />
              )}
            </TabsContent>

            <TabsContent value="public" className="mt-0 h-full overflow-y-auto">
              <PublicAccessTab
                publicPermission={publicPermission}
                isOwner={isOwner}
                onMakePublic={makePublic}
                onRevokePublic={() =>
                  revokeAccess({ isPublic: true }).then(refresh)
                }
                onUpdateLevel={(newLevel) =>
                  updateLevel({ isPublic: true }, newLevel).then(refresh)
                }
                resourceType={resourceType}
                resourceName={resourceName}
              />
            </TabsContent>
          </div>
        </Tabs>

        {error && (
          <div className="mt-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
            <p className="text-sm text-destructive">{error}</p>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

