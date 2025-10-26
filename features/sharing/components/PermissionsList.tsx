'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { X, Mail, Building2, Globe, Loader2, Lock } from 'lucide-react';
import { PermissionBadge, PublicBadge } from './PermissionBadge';
import type { PermissionWithDetails, PermissionLevel } from '@/utils/permissions';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface PermissionsListProps {
  permissions: PermissionWithDetails[];
  isOwner: boolean;
  onUpdateLevel: (
    options: { userId?: string; organizationId?: string; isPublic?: boolean },
    newLevel: PermissionLevel
  ) => Promise<any>;
  onRevoke: (options: {
    userId?: string;
    organizationId?: string;
    isPublic?: boolean;
  }) => Promise<any>;
  loading?: boolean;
}

/**
 * PermissionsList - Display and manage current permissions
 * 
 * Shows all users, organizations, and public access for a resource.
 * Allows owners to update permission levels or revoke access.
 * 
 * @example
 * <PermissionsList
 *   permissions={permissions}
 *   isOwner={isOwner}
 *   onUpdateLevel={updateLevel}
 *   onRevoke={revokeAccess}
 * />
 */
export function PermissionsList({
  permissions,
  isOwner,
  onUpdateLevel,
  onRevoke,
  loading = false,
}: PermissionsListProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [revokingId, setRevokingId] = useState<string | null>(null);
  const [confirmRevoke, setConfirmRevoke] = useState<{
    open: boolean;
    permission: PermissionWithDetails | null;
  }>({ open: false, permission: null });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (permissions.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <Lock className="w-12 h-12 mx-auto mb-2 opacity-20" />
        <p className="text-sm">Not shared with anyone</p>
        <p className="text-xs mt-1">Only you can access this resource</p>
      </div>
    );
  }

  const handleUpdateLevel = async (
    permission: PermissionWithDetails,
    newLevel: PermissionLevel
  ) => {
    if (newLevel === permission.permissionLevel) return;

    setUpdatingId(permission.id);
    try {
      await onUpdateLevel(
        {
          userId: permission.grantedToUserId || undefined,
          organizationId: permission.grantedToOrganizationId || undefined,
          isPublic: permission.isPublic || undefined,
        },
        newLevel
      );
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRevoke = async (permission: PermissionWithDetails) => {
    setRevokingId(permission.id);
    try {
      await onRevoke({
        userId: permission.grantedToUserId || undefined,
        organizationId: permission.grantedToOrganizationId || undefined,
        isPublic: permission.isPublic || undefined,
      });
    } finally {
      setRevokingId(null);
      setConfirmRevoke({ open: false, permission: null });
    }
  };

  const getPermissionLabel = (permission: PermissionWithDetails) => {
    if (permission.isPublic) return 'Everyone';
    if (permission.grantedToUser) return permission.grantedToUser.email;
    if (permission.grantedToOrganization) return permission.grantedToOrganization.name;
    return 'Unknown';
  };

  const getPermissionIcon = (permission: PermissionWithDetails) => {
    if (permission.isPublic) return Globe;
    if (permission.grantedToOrganization) return Building2;
    return Mail;
  };

  return (
    <div className="space-y-2">
      {permissions.map((permission) => {
        const Icon = getPermissionIcon(permission);
        const isUpdating = updatingId === permission.id;
        const isRevoking = revokingId === permission.id;

        return (
          <Card key={permission.id} className="p-3">
            <div className="flex items-center justify-between gap-3">
              {/* Left: Icon and label */}
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <Icon className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">
                    {getPermissionLabel(permission)}
                  </p>
                  {permission.grantedToUser?.displayName && (
                    <p className="text-xs text-muted-foreground truncate">
                      {permission.grantedToUser.displayName}
                    </p>
                  )}
                </div>
              </div>

              {/* Right: Permission level selector and remove button */}
              <div className="flex items-center gap-2 flex-shrink-0">
                {isOwner ? (
                  <>
                    <Select
                      value={permission.permissionLevel}
                      onValueChange={(value) =>
                        handleUpdateLevel(permission, value as PermissionLevel)
                      }
                      disabled={isUpdating || isRevoking}
                    >
                      <SelectTrigger className="w-[110px] h-8">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="viewer">Viewer</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="admin">Admin</SelectItem>
                      </SelectContent>
                    </Select>

                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() =>
                        setConfirmRevoke({ open: true, permission })
                      }
                      disabled={isUpdating || isRevoking}
                    >
                      {isRevoking ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <X className="w-4 h-4" />
                      )}
                    </Button>
                  </>
                ) : (
                  <>
                    {permission.isPublic ? (
                      <PublicBadge variant="compact" />
                    ) : (
                      <PermissionBadge level={permission.permissionLevel} variant="compact" />
                    )}
                  </>
                )}
              </div>
            </div>
          </Card>
        );
      })}

      {/* Confirmation dialog */}
      <AlertDialog
        open={confirmRevoke.open}
        onOpenChange={(open) =>
          setConfirmRevoke({ open, permission: confirmRevoke.permission })
        }
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Revoke Access?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to revoke access for{' '}
              <strong>{confirmRevoke.permission ? getPermissionLabel(confirmRevoke.permission) : ''}</strong>?
              They will no longer be able to access this resource.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmRevoke.permission) {
                  handleRevoke(confirmRevoke.permission);
                }
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Revoke Access
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

