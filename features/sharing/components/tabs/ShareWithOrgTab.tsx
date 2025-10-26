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
import { Loader2, Building2 } from 'lucide-react';
import { PermissionLevel, ResourceType } from '@/utils/permissions';
import { useUserOrganizations } from '@/utils/organizations';
import { PermissionLevelDescription } from '../PermissionBadge';
import { useToast } from '@/components/ui/use-toast';

interface ShareWithOrgTabProps {
  onShare: (orgId: string, level: PermissionLevel) => Promise<any>;
  onSuccess: () => void;
  resourceType: ResourceType;
}

/**
 * ShareWithOrgTab - Form to share with an organization
 */
export function ShareWithOrgTab({
  onShare,
  onSuccess,
  resourceType,
}: ShareWithOrgTabProps) {
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('viewer');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const { organizations, loading: orgsLoading } = useUserOrganizations();

  // Filter out personal organizations
  const shareableOrgs = organizations.filter((org) => !org.isPersonal);

  const handleShare = async () => {
    if (!selectedOrgId) {
      toast({
        title: 'Select an organization',
        description: 'Please select an organization to share with',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await onShare(selectedOrgId, permissionLevel);

      if (result.success) {
        const org = shareableOrgs.find((o) => o.id === selectedOrgId);
        toast({
          title: 'Shared successfully',
          description: `Shared with ${org?.name || 'organization'}`,
        });
        setSelectedOrgId('');
        setPermissionLevel('viewer');
        onSuccess();
      } else {
        toast({
          title: 'Failed to share',
          description: result.error || 'Please try again',
          variant: 'destructive',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Error',
        description: error.message || 'Failed to share',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  if (orgsLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (shareableOrgs.length === 0) {
    return (
      <div className="p-6 text-center space-y-3 bg-muted/30 rounded-lg border min-h-[300px] flex flex-col items-center justify-center">
        <Building2 className="w-12 h-12 mx-auto text-muted-foreground opacity-20" />
        <div>
          <h4 className="text-sm font-medium mb-1">No Organizations Yet</h4>
          <p className="text-xs text-muted-foreground mb-4">
            You need to be a member of an organization to share with it
          </p>
          <p className="text-xs text-muted-foreground mb-3">
            Organization management UI is coming soon. For now, you can:
          </p>
          <ul className="text-xs text-left text-muted-foreground space-y-1 max-w-xs mx-auto">
            <li>• Share with specific users instead</li>
            <li>• Make resources public</li>
            <li>• Wait for org management feature</li>
          </ul>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <div>
        <h3 className="text-sm font-medium mb-3">Share with Organization</h3>
        <p className="text-xs text-muted-foreground mb-4">
          All members of the organization will have access
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="org-select">Organization</Label>
          <Select
            value={selectedOrgId}
            onValueChange={setSelectedOrgId}
            disabled={loading}
          >
            <SelectTrigger id="org-select">
              <SelectValue placeholder="Select an organization" />
            </SelectTrigger>
            <SelectContent>
              {shareableOrgs.map((org) => (
                <SelectItem key={org.id} value={org.id}>
                  <div className="flex items-center gap-2">
                    <Building2 className="w-3 h-3" />
                    <span>{org.name}</span>
                    {org.memberCount && (
                      <span className="text-xs text-muted-foreground">
                        ({org.memberCount} members)
                      </span>
                    )}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="org-permission">Permission Level</Label>
          <Select
            value={permissionLevel}
            onValueChange={(value) => setPermissionLevel(value as PermissionLevel)}
            disabled={loading}
          >
            <SelectTrigger id="org-permission">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">
                <div className="flex flex-col items-start py-1">
                  <span className="font-medium">Viewer</span>
                  <span className="text-xs text-muted-foreground">Can view only</span>
                </div>
              </SelectItem>
              <SelectItem value="editor">
                <div className="flex flex-col items-start py-1">
                  <span className="font-medium">Editor</span>
                  <span className="text-xs text-muted-foreground">Can view and edit</span>
                </div>
              </SelectItem>
              <SelectItem value="admin">
                <div className="flex flex-col items-start py-1">
                  <span className="font-medium">Admin</span>
                  <span className="text-xs text-muted-foreground">Full access</span>
                </div>
              </SelectItem>
            </SelectContent>
          </Select>
          <PermissionLevelDescription level={permissionLevel} />
        </div>

        <Button
          onClick={handleShare}
          disabled={loading || !selectedOrgId}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sharing...
            </>
          ) : (
            <>
              <Building2 className="w-4 h-4 mr-2" />
              Share with Organization
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

