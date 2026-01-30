'use client';

import React, { useState } from 'react';
import { Mail, Send, X, RefreshCw, Loader2, Clock, Copy, Link2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  useOrganizationInvitations,
  useInvitationOperations,
  validateEmail,
  type OrgRole,
} from '@/features/organizations';
import { formatDistanceToNow } from 'date-fns';

interface InvitationManagerProps {
  organizationId: string;
  organizationName: string;
  userRole: OrgRole;
}

/**
 * InvitationManager - Component for managing organization invitations
 * 
 * Features:
 * - Send new invitations
 * - List pending invitations
 * - Resend invitations
 * - Cancel invitations
 * - Email validation
 * - Expiry countdown
 */
export function InvitationManager({
  organizationId,
  organizationName,
  userRole,
}: InvitationManagerProps) {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<OrgRole>('member');
  const [invitationToCancel, setInvitationToCancel] = useState<string | null>(null);

  const { invitations, loading, error, refresh } = useOrganizationInvitations(organizationId);
  const { invite, cancel, resend, loading: operationLoading } = useInvitationOperations(organizationId);

  // Email validation
  const emailValidation = email ? validateEmail(email) : { valid: false, error: '' };
  const canSubmit = email && emailValidation.valid && !operationLoading;

  // Handle send invitation
  const handleSendInvitation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!canSubmit) return;

    const result = await invite({ email, role });

    if (result.success) {
      toast.success(`Invitation sent to ${email}`);
      setEmail('');
      setRole('member');
      refresh();
    } else {
      toast.error(result.error || 'Failed to send invitation');
    }
  };

  // Handle cancel invitation
  const handleCancelInvitation = async () => {
    if (!invitationToCancel) return;

    const invitation = invitations.find((inv) => inv.id === invitationToCancel);
    if (!invitation) return;

    const result = await cancel(invitationToCancel);

    if (result.success) {
      toast.success(`Cancelled invitation to ${invitation.email}`);
      setInvitationToCancel(null);
      refresh();
    } else {
      toast.error(result.error || 'Failed to cancel invitation');
    }
  };

  // Handle resend invitation
  const handleResendInvitation = async (invitationId: string, invitationEmail: string) => {
    const result = await resend(invitationId);

    if (result.success) {
      toast.success(`Resent invitation to ${invitationEmail}`);
      refresh();
    } else {
      toast.error(result.error || 'Failed to resend invitation');
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-blue-500 mb-4" />
        <p className="text-muted-foreground">Loading invitations...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
        <p className="text-red-800 dark:text-red-200">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Send Invitation Form */}
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Send className="h-5 w-5" />
            Invite New Member
          </h3>
          <p className="text-sm text-muted-foreground mt-1">
            Send an invitation to join {organizationName}
          </p>
        </div>

        <form onSubmit={handleSendInvitation} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Email Input */}
            <div className="md:col-span-2 space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="colleague@example.com"
                disabled={operationLoading}
                className={email && !emailValidation.valid ? 'border-red-500' : ''}
              />
              {email && !emailValidation.valid && (
                <p className="text-xs text-red-600 dark:text-red-400">
                  {emailValidation.error}
                </p>
              )}
            </div>

            {/* Role Select */}
            <div className="space-y-2">
              <Label htmlFor="role">Role *</Label>
              <Select value={role} onValueChange={(value) => setRole(value as OrgRole)}>
                <SelectTrigger id="role" disabled={operationLoading}>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="member">Member</SelectItem>
                  <SelectItem value="admin">Admin</SelectItem>
                  {userRole === 'owner' && <SelectItem value="owner">Owner</SelectItem>}
                </SelectContent>
              </Select>
            </div>
          </div>

          <Button
            type="submit"
            disabled={!canSubmit}
            className="bg-blue-500 hover:bg-blue-600"
          >
            <Send className="h-4 w-4 mr-2" />
            Send Invitation
          </Button>
        </form>

        {/* Email Notice */}
        <div className="p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
          <div className="flex items-start gap-2">
            <Link2 className="h-4 w-4 mt-0.5 flex-shrink-0 text-amber-700 dark:text-amber-300" />
            <div className="text-sm text-amber-800 dark:text-amber-200">
              <strong>Email not yet available:</strong> After sending an invitation, use the{' '}
              <span className="inline-flex items-center gap-1 font-medium">
                <Copy className="h-3 w-3" /> Copy Link
              </span>{' '}
              button to get the invitation URL, then share it with your invitee directly.
            </div>
          </div>
        </div>
      </div>

      {/* Invitations List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Invitations ({invitations.length})
          </h3>
          {invitations.length > 0 && (
            <Button
              variant="ghost"
              size="sm"
              onClick={refresh}
              disabled={loading}
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          )}
        </div>

        {invitations.length === 0 ? (
          <div className="text-center py-8 border rounded-lg bg-muted/20">
            <Mail className="h-12 w-12 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No invitations</p>
            <p className="text-sm text-muted-foreground mt-1">
              Invite team members using the form above
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {invitations.map((invitation) => {
              const expiresAt = new Date(invitation.expiresAt);
              const isExpired = expiresAt < new Date();
              const timeToExpiry = isExpired
                ? 'Expired'
                : `Expires ${formatDistanceToNow(expiresAt, { addSuffix: true })}`;
              
              const invitationLink = `${typeof window !== 'undefined' ? window.location.origin : 'https://www.aimatrx.com'}/invitations/accept/${invitation.token}`;

              const handleCopyLink = async () => {
                try {
                  await navigator.clipboard.writeText(invitationLink);
                  toast.success('Invitation link copied to clipboard');
                } catch (err) {
                  toast.error('Failed to copy link');
                }
              };

              return (
                <div
                  key={invitation.id}
                  className={`flex items-center justify-between p-4 rounded-lg border bg-card ${
                    isExpired ? 'opacity-60 border-dashed' : ''
                  }`}
                >
                  {/* Invitation Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <p className="font-medium truncate">{invitation.email}</p>
                      <Badge variant="secondary" className="text-xs">
                        {invitation.role}
                      </Badge>
                      {isExpired && (
                        <Badge variant="destructive" className="text-xs">
                          Expired
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeToExpiry}
                      </span>
                      <span>
                        Invited {formatDistanceToNow(new Date(invitation.invitedAt), { addSuffix: true })}
                      </span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1">
                    {!isExpired && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={handleCopyLink}
                        title="Copy invitation link"
                      >
                        <Copy className="h-4 w-4 mr-1" />
                        Copy Link
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => handleResendInvitation(invitation.id, invitation.email)}
                      disabled={operationLoading}
                      title={isExpired ? 'Renew and extend expiry' : 'Resend and extend expiry'}
                    >
                      <RefreshCw className="h-4 w-4 mr-1" />
                      {isExpired ? 'Renew' : 'Resend'}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setInvitationToCancel(invitation.id)}
                      disabled={operationLoading}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Cancel invitation"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Cancel Invitation Confirmation */}
      <AlertDialog open={!!invitationToCancel} onOpenChange={() => setInvitationToCancel(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Cancel Invitation</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to cancel the invitation to{' '}
              <strong>{invitations.find((inv) => inv.id === invitationToCancel)?.email}</strong>?
              They will no longer be able to accept this invitation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>No, Keep It</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCancelInvitation}
              className="bg-red-600 hover:bg-red-700"
            >
              Yes, Cancel Invitation
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

