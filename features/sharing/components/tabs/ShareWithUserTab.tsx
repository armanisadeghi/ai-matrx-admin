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
import { Loader2, UserPlus, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { PermissionLevel, ResourceType } from '@/utils/permissions';
import { PermissionLevelDescription } from '../PermissionBadge';
import { useToast } from '@/hooks/use-toast';
import { createClient } from '@/utils/supabase/client';

interface ShareWithUserTabProps {
  onShare: (userId: string, level: PermissionLevel) => Promise<any>;
  onSuccess: () => void;
  resourceType: ResourceType;
  resourceId: string;
}

type StatusType = 'idle' | 'loading' | 'success' | 'error';

interface Status {
  type: StatusType;
  message: string;
}

/**
 * ShareWithUserTab - Form to share with a specific user
 */
export function ShareWithUserTab({
  onShare,
  onSuccess,
  resourceType,
  resourceId,
}: ShareWithUserTabProps) {
  const [email, setEmail] = useState('');
  const [permissionLevel, setPermissionLevel] = useState<PermissionLevel>('viewer');
  const [status, setStatus] = useState<Status>({ type: 'idle', message: '' });
  const { toast } = useToast();

  const resetStatus = () => {
    setStatus({ type: 'idle', message: '' });
  };

  const handleShare = async () => {
    // Log to confirm function is called
    console.log('=== handleShare called ===');
    console.log('Email:', email);
    console.log('Permission:', permissionLevel);
    console.log('Resource:', resourceType, resourceId);

    const trimmedEmail = email.trim();
    
    if (!trimmedEmail || !trimmedEmail.includes('@')) {
      setStatus({ type: 'error', message: 'Please enter a valid email address' });
      return;
    }

    // Start loading
    setStatus({ type: 'loading', message: 'Looking up user...' });

    try {
      // Step 1: Look up user
      console.log('Step 1: Looking up user by email...');
      const supabase = createClient();
      
      const { data: lookupData, error: lookupError } = await supabase
        .rpc('lookup_user_by_email', { lookup_email: trimmedEmail });

      console.log('Lookup response:', { data: lookupData, error: lookupError });

      if (lookupError) {
        console.error('Lookup error:', lookupError);
        setStatus({ 
          type: 'error', 
          message: `Lookup failed: ${lookupError.message}` 
        });
        return;
      }

      // Check if user was found
      const userData = Array.isArray(lookupData) ? lookupData[0] : lookupData;
      
      if (!userData || !userData.user_id) {
        console.log('No user found');
        setStatus({ 
          type: 'error', 
          message: `No user found with email "${trimmedEmail}". They may need to create an account first.` 
        });
        return;
      }

      console.log('User found:', userData);
      setStatus({ type: 'loading', message: 'Sharing with user...' });

      // Step 2: Share with user
      console.log('Step 2: Sharing resource...');
      const { data: shareData, error: shareError } = await supabase.rpc('share_resource_with_user', {
        p_resource_type: resourceType,
        p_resource_id: resourceId,
        p_target_user_id: userData.user_id,
        p_permission_level: permissionLevel,
      });

      console.log('Share response:', { data: shareData, error: shareError });

      if (shareError) {
        console.error('Share error:', shareError);
        setStatus({ 
          type: 'error', 
          message: `Share failed: ${shareError.message}` 
        });
        return;
      }

      // Check the result from the function
      if (shareData && shareData.success === true) {
        console.log('Share successful!');
        setStatus({ 
          type: 'success', 
          message: `Successfully shared with ${trimmedEmail}` 
        });
        setEmail('');
        setPermissionLevel('viewer');
        
        // Also show toast for good measure
        toast({
          title: 'Shared Successfully',
          description: `Access granted to ${trimmedEmail}`,
          duration: 5000,
        });
        
        // Trigger refresh after a short delay so user can see success message
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        const errorMsg = shareData?.error || 'Unknown error occurred';
        console.error('Share failed:', errorMsg);
        setStatus({ 
          type: 'error', 
          message: errorMsg 
        });
      }

    } catch (err: any) {
      console.error('Unexpected error:', err);
      setStatus({ 
        type: 'error', 
        message: `Unexpected error: ${err.message || 'Something went wrong'}` 
      });
    }
  };

  const isLoading = status.type === 'loading';

  return (
    <div className="space-y-2.5 p-3 bg-muted/30 rounded-lg border">
      <div>
        <h3 className="text-sm font-medium mb-1">Share with User</h3>
        <p className="text-xs text-muted-foreground">
          Enter the email address of the user you want to share with
        </p>
      </div>

      {/* STATUS MESSAGE - Always visible when there's a status */}
      {status.type !== 'idle' && (
        <div
          className={`p-2 rounded-md flex items-start gap-2 text-xs ${
            status.type === 'loading'
              ? 'bg-blue-500/10 text-blue-700 dark:text-blue-300 border border-blue-500/20'
              : status.type === 'success'
              ? 'bg-green-500/10 text-green-700 dark:text-green-300 border border-green-500/20'
              : 'bg-red-500/10 text-red-700 dark:text-red-300 border border-red-500/20'
          }`}
        >
          {status.type === 'loading' && (
            <Loader2 className="w-3.5 h-3.5 animate-spin flex-shrink-0 mt-0.5" />
          )}
          {status.type === 'success' && (
            <CheckCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          )}
          {status.type === 'error' && (
            <XCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{status.message}</span>
          {status.type === 'error' && (
            <button
              onClick={resetStatus}
              className="text-xs underline hover:no-underline flex-shrink-0"
            >
              Dismiss
            </button>
          )}
        </div>
      )}

      <div className="space-y-2.5">
        <div className="space-y-1.5">
          <Label htmlFor="user-email" className="text-xs">Email Address</Label>
          <Input
            id="user-email"
            type="email"
            placeholder="user@example.com"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              // Clear error when user types
              if (status.type === 'error') {
                resetStatus();
              }
            }}
            disabled={isLoading}
            className="h-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="user-permission" className="text-xs">Permission Level</Label>
          <Select
            value={permissionLevel}
            onValueChange={(value) => setPermissionLevel(value as PermissionLevel)}
            disabled={isLoading}
          >
            <SelectTrigger id="user-permission" className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="viewer">Viewer</SelectItem>
              <SelectItem value="editor">Editor</SelectItem>
              <SelectItem value="admin">Admin</SelectItem>
            </SelectContent>
          </Select>
          <PermissionLevelDescription level={permissionLevel} />
        </div>

        <Button
          onClick={handleShare}
          disabled={isLoading || !email.trim()}
          className="w-full h-9"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              {status.message || 'Processing...'}
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
