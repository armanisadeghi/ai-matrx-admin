'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, UserPlus } from 'lucide-react';
import { PermissionLevel, ResourceType } from '@/utils/permissions';
import { PermissionLevelDescription } from '../PermissionBadge';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/utils/supabase/client';

interface ShareWithUserTabProps {
  onShare: (userId: string, level: PermissionLevel) => Promise<any>;
  onSuccess: () => void;
  resourceType: ResourceType;
}

/**
 * Look up a user by email address
 * @param email The email address to look up
 * @returns The user's UUID if found, null otherwise
 */
async function lookupUserByEmail(email: string): Promise<{ id: string; email: string } | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('users')
    .select('id, email')
    .eq('email', email.toLowerCase().trim())
    .single();

  if (error || !data) {
    return null;
  }

  return data;
}

/**
 * ShareWithUserTab - Form to share with a specific user
 */
export function ShareWithUserTab({
  onShare,
  onSuccess,
  resourceType,
}: ShareWithUserTabProps) {
  const [email, setEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('viewer');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleShare = async () => {
    if (!email || !email.includes('@')) {
      toast({
        title: 'Invalid email',
        description: 'Please enter a valid email address',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Look up the user by email to get their UUID
      const user = await lookupUserByEmail(email);

      if (!user) {
        toast({
          title: 'User not found',
          description: `No user found with email "${email}". They may need to create an account first.`,
          variant: 'destructive',
        });
        return;
      }

      const result = await onShare(user.id, permissionLevel);

      if (result.success) {
        toast({
          title: 'Shared successfully',
          description: `Access granted to ${email}`,
        });
        setEmail('');
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

  return (
    <div className="space-y-4 p-4 bg-muted/30 rounded-lg border">
      <div>
        <h3 className="text-sm font-medium mb-3">Share with User</h3>
        <p className="text-xs text-muted-foreground mb-4">
          Enter the email address of the user you want to share with
        </p>
      </div>

      <div className="space-y-3">
        <div className="space-y-2">
          <Label htmlFor="user-email">Email Address</Label>
          <Input
            id="user-email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="user-permission">Permission Level</Label>
          <Select
            value={permissionLevel}
            onValueChange={(value) => setPermissionLevel(value as PermissionLevel)}
            disabled={loading}
          >
            <SelectTrigger id="user-permission">
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
          disabled={loading || !email}
          className="w-full"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Sharing...
            </>
          ) : (
            <>
              <UserPlus className="w-4 h-4 mr-2" />
              Share with User
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

