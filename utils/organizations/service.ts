/**
 * Organization Service
 * 
 * Complete service layer for organization management including:
 * - Organization CRUD operations
 * - Member management
 * - Invitation system
 * - Role management
 * 
 * Based on specifications from docs/pending/org-management.md
 */

import { createClient } from '@/utils/supabase/client';
import {
  Organization,
  OrganizationWithRole,
  OrganizationMember,
  OrganizationMemberWithUser,
  OrganizationInvitation,
  OrganizationInvitationWithOrg,
  OrgRole,
  CreateOrganizationOptions,
  UpdateOrganizationOptions,
  InviteMemberOptions,
  OrganizationResult,
  InvitationResult,
  OperationResult,
  validateOrgName,
  validateOrgSlug,
  validateEmail,
  generateSlug,
} from './types';

const supabase = createClient();

// ============================================================================
// Organization CRUD Operations
// ============================================================================

/**
 * Create a new organization
 * @param options Organization creation options
 * @returns Organization result
 */
export async function createOrganization(
  options: CreateOrganizationOptions
): Promise<OrganizationResult> {
  try {
    const { name, slug, description, logoUrl, website, settings } = options;

    // Validate
    const nameValidation = validateOrgName(name);
    if (!nameValidation.valid) {
      return { success: false, error: nameValidation.error };
    }

    const slugValidation = validateOrgSlug(slug);
    if (!slugValidation.valid) {
      return { success: false, error: slugValidation.error };
    }

    // Check slug availability
    const slugAvailable = await isSlugAvailable(slug);
    if (!slugAvailable) {
      return { success: false, error: 'Slug is already taken' };
    }

    // Get current user
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    // Create organization
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .insert({
        name,
        slug,
        description,
        logo_url: logoUrl,
        website,
        created_by: currentUser.id,
        is_personal: false,
        settings: settings || {},
      })
      .select()
      .single();

    if (orgError) throw orgError;

    // Add creator as owner
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: org.id,
        user_id: currentUser.id,
        role: 'owner',
      });

    if (memberError) throw memberError;

    return {
      success: true,
      message: 'Organization created successfully',
      organization: transformOrganizationFromDb(org),
    };
  } catch (error: any) {
    console.error('Error creating organization:', error);
    return {
      success: false,
      error: error.message || 'Failed to create organization',
    };
  }
}

/**
 * Update an organization
 * @param orgId Organization ID
 * @param updates Update options
 * @returns Organization result
 */
export async function updateOrganization(
  orgId: string,
  updates: UpdateOrganizationOptions
): Promise<OrganizationResult> {
  try {
    const updateData: any = {
      updated_at: new Date().toISOString(),
    };

    if (updates.name) {
      const validation = validateOrgName(updates.name);
      if (!validation.valid) {
        return { success: false, error: validation.error };
      }
      updateData.name = updates.name;
    }

    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.logoUrl !== undefined) updateData.logo_url = updates.logoUrl;
    if (updates.website !== undefined) updateData.website = updates.website;
    if (updates.settings !== undefined) updateData.settings = updates.settings;

    const { data, error } = await supabase
      .from('organizations')
      .update(updateData)
      .eq('id', orgId)
      .select()
      .single();

    if (error) throw error;

    return {
      success: true,
      message: 'Organization updated successfully',
      organization: transformOrganizationFromDb(data),
    };
  } catch (error: any) {
    console.error('Error updating organization:', error);
    return {
      success: false,
      error: error.message || 'Failed to update organization',
    };
  }
}

/**
 * Delete an organization (owner only)
 * @param orgId Organization ID
 * @returns Operation result
 */
export async function deleteOrganization(orgId: string): Promise<OperationResult> {
  try {
    // Check if personal org
    const { data: org } = await supabase
      .from('organizations')
      .select('is_personal')
      .eq('id', orgId)
      .single();

    if (org?.is_personal) {
      return { success: false, error: 'Cannot delete personal organization' };
    }

    const { error } = await supabase
      .from('organizations')
      .delete()
      .eq('id', orgId);

    if (error) throw error;

    return {
      success: true,
      message: 'Organization deleted successfully',
    };
  } catch (error: any) {
    console.error('Error deleting organization:', error);
    return {
      success: false,
      error: error.message || 'Failed to delete organization',
    };
  }
}

/**
 * Get a single organization
 * @param orgId Organization ID
 * @returns Organization or null
 */
export async function getOrganization(orgId: string): Promise<Organization | null> {
  try {
    const { data, error } = await supabase
      .from('organizations')
      .select('*')
      .eq('id', orgId)
      .single();

    if (error) throw error;
    return transformOrganizationFromDb(data);
  } catch (error) {
    console.error('Error fetching organization:', error);
    return null;
  }
}

/**
 * Get all organizations for current user
 * @returns Array of organizations with user's role
 */
export async function getUserOrganizations(): Promise<OrganizationWithRole[]> {
  try {
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      return [];
    }

    const { data, error } = await supabase
      .from('organization_members')
      .select(
        `
        role,
        organizations (
          *
        )
      `
      )
      .eq('user_id', currentUser.id);

    if (error) throw error;

    const orgs: OrganizationWithRole[] = await Promise.all(
      (data || []).map(async (item: any) => {
        const org = transformOrganizationFromDb(item.organizations);
        
        // Get member count
        const { count } = await supabase
          .from('organization_members')
          .select('*', { count: 'exact', head: true })
          .eq('organization_id', org.id);

        return {
          ...org,
          role: item.role as OrgRole,
          memberCount: count || 0,
        };
      })
    );

    // Sort: personal first, then by name
    return orgs.sort((a, b) => {
      if (a.isPersonal && !b.isPersonal) return -1;
      if (!a.isPersonal && b.isPersonal) return 1;
      return a.name.localeCompare(b.name);
    });
  } catch (error: any) {
    // Silently handle if organizations table doesn't exist yet
    if (error?.code === '42P01' || error?.message?.includes('relation') || error?.message?.includes('does not exist')) {
      // Table doesn't exist - that's OK, just return empty array
      return [];
    }
    console.error('Error fetching user organizations:', error);
    return [];
  }
}

/**
 * Check if a slug is available
 * @param slug Slug to check
 * @returns True if available
 */
export async function isSlugAvailable(slug: string): Promise<boolean> {
  try {
    const { data } = await supabase
      .from('organizations')
      .select('id')
      .eq('slug', slug)
      .single();

    return !data;
  } catch (error) {
    return true; // If error (not found), slug is available
  }
}

// ============================================================================
// Member Management
// ============================================================================

/**
 * Get all members of an organization
 * @param orgId Organization ID
 * @returns Array of members with user details
 */
export async function getOrganizationMembers(
  orgId: string
): Promise<OrganizationMemberWithUser[]> {
  try {
    const { data, error } = await supabase
      .from('organization_members')
      .select('*')
      .eq('organization_id', orgId)
      .order('joined_at', { ascending: true });

    if (error) throw error;

    // Transform and return
    // Note: In production, you'd join with auth.users for user details
    return (data || []).map(transformMemberFromDb);
  } catch (error) {
    console.error('Error fetching organization members:', error);
    return [];
  }
}

/**
 * Update a member's role
 * @param orgId Organization ID
 * @param userId User ID
 * @param newRole New role
 * @returns Operation result
 */
export async function updateMemberRole(
  orgId: string,
  userId: string,
  newRole: OrgRole
): Promise<OperationResult> {
  try {
    // Prevent changing the last owner
    if (newRole !== 'owner') {
      const { data: owners } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', orgId)
        .eq('role', 'owner');

      if (owners && owners.length === 1) {
        const { data: member } = await supabase
          .from('organization_members')
          .select('role')
          .eq('organization_id', orgId)
          .eq('user_id', userId)
          .single();

        if (member?.role === 'owner') {
          return {
            success: false,
            error: 'Cannot change role of the last owner',
          };
        }
      }
    }

    const { error } = await supabase
      .from('organization_members')
      .update({ role: newRole })
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    if (error) throw error;

    return {
      success: true,
      message: 'Member role updated successfully',
    };
  } catch (error: any) {
    console.error('Error updating member role:', error);
    return {
      success: false,
      error: error.message || 'Failed to update member role',
    };
  }
}

/**
 * Remove a member from an organization
 * @param orgId Organization ID
 * @param userId User ID
 * @returns Operation result
 */
export async function removeMember(
  orgId: string,
  userId: string
): Promise<OperationResult> {
  try {
    // Prevent removing the last owner
    const { data: member } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', userId)
      .single();

    if (member?.role === 'owner') {
      const { data: owners } = await supabase
        .from('organization_members')
        .select('id')
        .eq('organization_id', orgId)
        .eq('role', 'owner');

      if (owners && owners.length === 1) {
        return {
          success: false,
          error: 'Cannot remove the last owner',
        };
      }
    }

    const { error } = await supabase
      .from('organization_members')
      .delete()
      .eq('organization_id', orgId)
      .eq('user_id', userId);

    if (error) throw error;

    return {
      success: true,
      message: 'Member removed successfully',
    };
  } catch (error: any) {
    console.error('Error removing member:', error);
    return {
      success: false,
      error: error.message || 'Failed to remove member',
    };
  }
}

/**
 * Leave an organization
 * @param orgId Organization ID
 * @returns Operation result
 */
export async function leaveOrganization(orgId: string): Promise<OperationResult> {
  try {
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    return await removeMember(orgId, currentUser.id);
  } catch (error: any) {
    console.error('Error leaving organization:', error);
    return {
      success: false,
      error: error.message || 'Failed to leave organization',
    };
  }
}

/**
 * Get current user's role in an organization
 * @param orgId Organization ID
 * @returns Role or null
 */
export async function getUserRole(orgId: string): Promise<OrgRole | null> {
  try {
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      return null;
    }

    const { data } = await supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', orgId)
      .eq('user_id', currentUser.id)
      .single();

    return (data?.role as OrgRole) || null;
  } catch (error) {
    console.error('Error fetching user role:', error);
    return null;
  }
}

// ============================================================================
// Invitation System
// ============================================================================

/**
 * Invite a user to an organization
 * @param options Invitation options
 * @returns Invitation result
 */
export async function inviteToOrganization(
  options: InviteMemberOptions
): Promise<InvitationResult> {
  try {
    const { organizationId, email, role = 'member' } = options;

    // Validate email
    const emailValidation = validateEmail(email);
    if (!emailValidation.valid) {
      return { success: false, error: emailValidation.error };
    }

    // Get current user
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    // Generate secure token
    const token = crypto.randomUUID();

    // Set expiry (7 days from now)
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data, error } = await supabase
      .from('organization_invitations')
      .insert({
        organization_id: organizationId,
        email: email.toLowerCase().trim(),
        token,
        role,
        invited_by: currentUser.id,
        expires_at: expiresAt.toISOString(),
      })
      .select()
      .single();

    if (error) {
      // Unique constraint violation
      if (error.code === '23505') {
        return {
          success: false,
          error: 'User already invited to this organization',
        };
      }
      throw error;
    }

    // TODO: Send invitation email with token
    // await sendInvitationEmail(email, token, organizationId);

    return {
      success: true,
      message: 'Invitation sent successfully',
      invitation: transformInvitationFromDb(data),
    };
  } catch (error: any) {
    console.error('Error inviting to organization:', error);
    return {
      success: false,
      error: error.message || 'Failed to send invitation',
    };
  }
}

/**
 * Get pending invitations for an organization
 * @param orgId Organization ID
 * @returns Array of invitations
 */
export async function getOrganizationInvitations(
  orgId: string
): Promise<OrganizationInvitation[]> {
  try {
    const { data, error } = await supabase
      .from('organization_invitations')
      .select('*')
      .eq('organization_id', orgId)
      .gt('expires_at', new Date().toISOString())
      .order('invited_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformInvitationFromDb);
  } catch (error) {
    console.error('Error fetching organization invitations:', error);
    return [];
  }
}

/**
 * Cancel an invitation
 * @param invitationId Invitation ID
 * @returns Operation result
 */
export async function cancelInvitation(invitationId: string): Promise<OperationResult> {
  try {
    const { error } = await supabase
      .from('organization_invitations')
      .delete()
      .eq('id', invitationId);

    if (error) throw error;

    return {
      success: true,
      message: 'Invitation cancelled successfully',
    };
  } catch (error: any) {
    console.error('Error cancelling invitation:', error);
    return {
      success: false,
      error: error.message || 'Failed to cancel invitation',
    };
  }
}

/**
 * Resend an invitation (updates expiry)
 * @param invitationId Invitation ID
 * @returns Operation result
 */
export async function resendInvitation(invitationId: string): Promise<OperationResult> {
  try {
    // Update expiry date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    const { data, error } = await supabase
      .from('organization_invitations')
      .update({ expires_at: expiresAt.toISOString() })
      .eq('id', invitationId)
      .select()
      .single();

    if (error) throw error;

    // TODO: Resend email
    // await sendInvitationEmail(data.email, data.token, data.organization_id);

    return {
      success: true,
      message: 'Invitation resent successfully',
    };
  } catch (error: any) {
    console.error('Error resending invitation:', error);
    return {
      success: false,
      error: error.message || 'Failed to resend invitation',
    };
  }
}

/**
 * Accept an invitation
 * @param token Invitation token
 * @returns Organization result
 */
export async function acceptInvitation(token: string): Promise<OrganizationResult> {
  try {
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      return { success: false, error: 'User not authenticated' };
    }

    // Find valid invitation
    const { data: invitation, error: inviteError } = await supabase
      .from('organization_invitations')
      .select('*, organizations(*)')
      .eq('token', token)
      .eq('email', currentUser.email)
      .gt('expires_at', new Date().toISOString())
      .single();

    if (inviteError || !invitation) {
      return { success: false, error: 'Invalid or expired invitation' };
    }

    // Add user as member
    const { error: memberError } = await supabase
      .from('organization_members')
      .insert({
        organization_id: invitation.organization_id,
        user_id: currentUser.id,
        role: invitation.role,
        invited_by: invitation.invited_by,
      });

    if (memberError) {
      if (memberError.code === '23505') {
        return {
          success: false,
          error: 'You are already a member of this organization',
        };
      }
      throw memberError;
    }

    // Delete the invitation
    await supabase
      .from('organization_invitations')
      .delete()
      .eq('id', invitation.id);

    return {
      success: true,
      message: 'Successfully joined organization',
      organization: transformOrganizationFromDb(invitation.organizations),
    };
  } catch (error: any) {
    console.error('Error accepting invitation:', error);
    return {
      success: false,
      error: error.message || 'Failed to accept invitation',
    };
  }
}

/**
 * Get invitations for current user
 * @returns Array of invitations with organization details
 */
export async function getUserInvitations(): Promise<OrganizationInvitationWithOrg[]> {
  try {
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      return [];
    }

    const { data, error } = await supabase
      .from('organization_invitations')
      .select('*, organizations(*)')
      .eq('email', currentUser.email)
      .gt('expires_at', new Date().toISOString())
      .order('invited_at', { ascending: false });

    if (error) throw error;

    return (data || []).map((item: any) => ({
      ...transformInvitationFromDb(item),
      organization: transformOrganizationFromDb(item.organizations),
    }));
  } catch (error) {
    console.error('Error fetching user invitations:', error);
    return [];
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform database organization record to application format
 */
function transformOrganizationFromDb(dbRecord: any): Organization {
  return {
    id: dbRecord.id,
    name: dbRecord.name,
    slug: dbRecord.slug,
    description: dbRecord.description,
    logoUrl: dbRecord.logo_url,
    website: dbRecord.website,
    createdAt: dbRecord.created_at,
    updatedAt: dbRecord.updated_at,
    createdBy: dbRecord.created_by,
    isPersonal: dbRecord.is_personal,
    settings: dbRecord.settings || {},
  };
}

/**
 * Transform database member record to application format
 */
function transformMemberFromDb(dbRecord: any): OrganizationMemberWithUser {
  return {
    id: dbRecord.id,
    organizationId: dbRecord.organization_id,
    userId: dbRecord.user_id,
    role: dbRecord.role,
    joinedAt: dbRecord.joined_at,
    invitedBy: dbRecord.invited_by,
  };
}

/**
 * Transform database invitation record to application format
 */
function transformInvitationFromDb(dbRecord: any): OrganizationInvitation {
  return {
    id: dbRecord.id,
    organizationId: dbRecord.organization_id,
    email: dbRecord.email,
    token: dbRecord.token,
    role: dbRecord.role,
    invitedAt: dbRecord.invited_at,
    invitedBy: dbRecord.invited_by,
    expiresAt: dbRecord.expires_at,
  };
}

/**
 * Generate slug suggestion from name
 * @param name Organization name
 * @returns Suggested slug
 */
export function suggestSlug(name: string): string {
  return generateSlug(name);
}

