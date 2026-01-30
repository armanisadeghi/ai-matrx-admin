'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, Globe, AlertTriangle, Lock } from 'lucide-react';
import { PermissionLevel, ResourceType, Permission } from '@/utils/permissions';
import { PublicBadge, PermissionLevelDescription } from '../PermissionBadge';
import { useToast } from '@/components/ui/use-toast';

interface PublicAccessTabProps {
  publicPermission?: Permission;
  isOwner: boolean;
  onMakePublic: (level: PermissionLevel) => Promise<any>;
  onRevokePublic: () => Promise<any>;
  onUpdateLevel: (level: PermissionLevel) => Promise<any>;
  resourceType: ResourceType;
  resourceName: string;
}

/**
 * PublicAccessTab - Manage public access to resource
 */
export function PublicAccessTab({
  publicPermission,
  isOwner,
  onMakePublic,
  onRevokePublic,
  onUpdateLevel,
  resourceType,
  resourceName,
}: PublicAccessTabProps) {
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>(
    publicPermission?.permissionLevel || 'viewer'
  );
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isPublic = !!publicPermission;

  const handleToggle = async (checked: boolean) => {
    if (!isOwner) return;

    setLoading(true);
    try {
      if (checked) {
        const result = await onMakePublic(permissionLevel);
        if (result.success) {
          toast({
            title: 'Made public',
            description: 'Anyone with the link can now access this resource',
          });
        } else {
          toast({
            title: 'Failed to make public',
            description: result.error || 'Please try again',
            variant: 'destructive',
          });
        }
      } else {
        const result = await onRevokePublic();
        if (result.success) {
          toast({
            title: 'Made private',
            description: 'Public access has been removed',
          });
        } else {
          toast({
            title: 'Failed to remove public access',
            description: result.error || 'Please try again',
            variant: 'destructive',
          });
        }
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update public access',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateLevel = async (newLevel: PermissionLevel) => {
    if (!isOwner || !isPublic) return;

    setLoading(true);
    try {
      const result = await onUpdateLevel(newLevel);
      if (result.success) {
        setPermissionLevel(newLevel);
        toast({
          title: 'Permission updated',
          description: `Public access level changed to ${newLevel}`,
        });
      } else {
        toast({
          title: 'Failed to update',
          description: result.error || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to update permission',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3">
      {/* Public toggle */}
      <div className="flex items-start justify-between gap-3 p-3 bg-muted/30 rounded-lg border">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            {isPublic ? (
              <>
                <Globe className="w-4 h-4 text-green-600 dark:text-green-400 flex-shrink-0" />
                <h3 className="text-sm font-medium">Public Access Enabled</h3>
                <PublicBadge variant="compact" />
              </>
            ) : (
              <>
                <Lock className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                <h3 className="text-sm font-medium">Private</h3>
              </>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {isPublic
              ? 'Anyone with the link can access this resource'
              : 'Only you and people you share with can access'}
          </p>
        </div>

        {isOwner && (
          <Switch
            checked={isPublic}
            onCheckedChange={handleToggle}
            disabled={loading}
            className="flex-shrink-0"
          />
        )}
      </div>

      {/* Warning when public */}
      {isPublic && (
        <Alert className="border-amber-200 dark:border-amber-900 bg-amber-50 dark:bg-amber-950/20 py-2">
          <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
          <AlertDescription className="text-amber-800 dark:text-amber-200 text-xs">
            <strong>Public Warning:</strong> Anyone with the link can access this {resourceType}. Share links carefully.
          </AlertDescription>
        </Alert>
      )}

      {/* Permission level selector when public */}
      {isPublic && isOwner && (
        <div className="space-y-2.5 p-3 bg-muted/30 rounded-lg border">
          <div>
            <h4 className="text-sm font-medium mb-1">Public Permission Level</h4>
            <p className="text-xs text-muted-foreground">
              Control what public viewers can do
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs">Permission Level</Label>
            <Select
              value={publicPermission?.permissionLevel || permissionLevel}
              onValueChange={(value) => handleUpdateLevel(value as PermissionLevel)}
              disabled={loading}
            >
              <SelectTrigger className="h-9">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="viewer">Viewer</SelectItem>
                <SelectItem value="editor">Editor</SelectItem>
                <SelectItem value="admin">Admin (not recommended)</SelectItem>
              </SelectContent>
            </Select>
            <PermissionLevelDescription
              level={publicPermission?.permissionLevel || permissionLevel}
            />
          </div>
        </div>
      )}

      {/* Info when not public */}
      {!isPublic && (
        <div className="p-4 text-center space-y-2 bg-muted/30 rounded-lg border">
          <Lock className="w-10 h-10 mx-auto text-muted-foreground opacity-20" />
          <div>
            <h4 className="text-sm font-medium mb-0.5">Resource is Private</h4>
            <p className="text-xs text-muted-foreground">
              Enable public access to allow anyone with the link to view this {resourceType}
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

