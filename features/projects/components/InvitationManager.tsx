'use client';

import React, { useState } from 'react';
import { Mail, Send, X, RefreshCw, Loader2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
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
import { toast } from 'sonner';
import {
  useProjectInvitations,
  useProjectInvitationOperations,
  validateEmail,
  getExpiryDisplay,
  type ProjectRole,
} from '@/features/projects';
import { formatDistanceToNow } from 'date-fns';

interface InvitationManagerProps {
  projectId: string;
  projectName: string;
  userRole: ProjectRole;
}

export function InvitationManager({ projectId, projectName, userRole }: InvitationManagerProps) {
  const [emailInput, setEmailInput] = useState('');
  const [roleInput, setRoleInput] = useState<ProjectRole>('member');
  const [invitationToCancel, setInvitationToCancel] = useState<string | null>(null);
  const [sendingEmail, setSendingEmail] = useState('');

  const { invitations, loading, error, refresh } = useProjectInvitations(projectId);
  const { invite, cancel, resend, loading: operationLoading } = useProjectInvitationOperations(projectId);

  const emailValidation = emailInput ? validateEmail(emailInput) : { valid: true };

  const handleInvite = async () => {
    if (!emailValidation.valid) {
      toast.error(emailValidation.error ?? 'Invalid email');
      return;
    }

    setSendingEmail(emailInput);
    const result = await invite({ email: emailInput, role: roleInput });
    setSendingEmail('');

    if (result.success) {
      toast.success(`Invitation sent to ${emailInput}`);
      setEmailInput('');
    } else {
      toast.error(result.error ?? 'Failed to send invitation');
    }
  };

  const handleCancel = async () => {
    if (!invitationToCancel) return;
    const result = await cancel(invitationToCancel);
    if (result.success) {
      toast.success('Invitation cancelled');
      setInvitationToCancel(null);
    } else {
      toast.error(result.error ?? 'Failed to cancel invitation');
    }
  };

  const handleResend = async (invitationId: string, email: string) => {
    const result = await resend(invitationId);
    if (result.success) {
      toast.success(`Invitation resent to ${email}`);
    } else {
      toast.error(result.error ?? 'Failed to resend invitation');
    }
  };

  const canManage = userRole === 'owner' || userRole === 'admin';

  return (
    <div className="space-y-6 p-4 md:p-6">
      <div>
        <h2 className="text-lg font-semibold">Invitations</h2>
        <p className="text-sm text-muted-foreground">Invite people to join {projectName}</p>
      </div>

      {canManage && (
        <div className="space-y-3 p-4 rounded-lg border border-border bg-muted/30">
          <h3 className="text-sm font-medium">Invite by Email</h3>
          <div className="flex gap-2">
            <Input
              type="email"
              placeholder="colleague@example.com"
              value={emailInput}
              onChange={(e) => setEmailInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleInvite()}
              disabled={operationLoading}
              className={!emailValidation.valid && emailInput ? 'border-red-500' : ''}
            />
            <Select
              value={roleInput}
              onValueChange={(v) => setRoleInput(v as ProjectRole)}
            >
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button
              onClick={handleInvite}
              disabled={!emailInput || !emailValidation.valid || operationLoading}
              className="bg-indigo-600 hover:bg-indigo-700 text-white"
            >
              {sendingEmail === emailInput ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              <span className="hidden sm:inline ml-2">Invite</span>
            </Button>
          </div>
          {!emailValidation.valid && emailInput && (
            <p className="text-xs text-red-600 dark:text-red-400">{emailValidation.error}</p>
          )}
        </div>
      )}

      <div className="space-y-2">
        <h3 className="text-sm font-medium text-muted-foreground">
          Pending Invitations ({invitations.length})
        </h3>

        {loading && (
          <div className="flex items-center gap-2 py-4 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Loading invitations...</span>
          </div>
        )}

        {!loading && invitations.length === 0 && (
          <div className="text-center py-6 text-muted-foreground">
            <Mail className="h-8 w-8 mx-auto mb-2 opacity-40" />
            <p className="text-sm">No pending invitations</p>
          </div>
        )}

        {invitations.map((inv) => {
          const isExpired = new Date(inv.expiresAt) <= new Date();
          return (
            <div
              key={inv.id}
              className="flex items-center justify-between p-3 rounded-lg border border-border"
            >
              <div className="flex items-center gap-3 min-w-0">
                <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm font-medium truncate">{inv.email}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    <Badge variant="outline" className="text-xs py-0 capitalize">
                      {inv.role}
                    </Badge>
                    <span
                      className={`flex items-center gap-1 text-xs ${
                        isExpired ? 'text-red-500' : 'text-muted-foreground'
                      }`}
                    >
                      <Clock className="h-3 w-3" />
                      {isExpired ? 'Expired' : getExpiryDisplay(inv.expiresAt)}
                    </span>
                  </div>
                </div>
              </div>

              {canManage && (
                <div className="flex items-center gap-1 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full"
                    title="Resend invitation"
                    onClick={() => handleResend(inv.id, inv.email)}
                    disabled={operationLoading}
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full text-red-600 dark:text-red-400"
                    title="Cancel invitation"
                    onClick={() => setInvitationToCancel(inv.id)}
                    disabled={operationLoading}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      <AlertDialog open={!!invitationToCancel} onOpenChange={() => setInvitationToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel this invitation? The recipient will no longer be able
              to use it.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Keep</AlertDialogCancel>
            <AlertDialogAction onClick={handleCancel} className="bg-red-600 hover:bg-red-700">
              Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
