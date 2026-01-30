/**
 * Permission Service
 * 
 * Core service layer for managing permissions in the RLS-based system.
 * All functions in this file interact with the permissions table to grant,
 * revoke, and query access to resources.
 * 
 * IMPORTANT: These functions only manage the permissions table. Actual access
 * control is enforced by RLS policies at the database level.
 */

import { createClient } from '@/utils/supabase/client';
import {
  Permission,
  PermissionWithDetails,
  ResourceType,
  PermissionLevel,
  ShareWithUserOptions,
  ShareWithOrgOptions,
  MakePublicOptions,
  UpdatePermissionOptions,
  RevokeAccessOptions,
  CheckPermissionOptions,
  PermissionCheckResult,
  ShareActionResult,
  PermissionError,
  PermissionErrorCode,
  validatePermission,
  satisfiesPermissionLevel,
} from './types';

const supabase = createClient();

// ============================================================================
// Share Functions
// ============================================================================

/**
 * Share a resource with a specific user
 * @param options Share options
 * @returns Result with success status and permission data
 */
export async function shareWithUser(
  options: ShareWithUserOptions
): Promise<ShareActionResult> {
  try {
    const { resourceType, resourceId, userId, permissionLevel } = options;

    // Get current user
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      throw new PermissionError(
        'User not authenticated',
        PermissionErrorCode.UNAUTHORIZED
      );
    }

    // Validate permission data
    validatePermission({
      resourceType,
      resourceId,
      grantedToUserId: userId,
      permissionLevel,
    });

    // Insert permission
    const { data, error } = await supabase
      .from('permissions')
      .insert({
        resource_type: resourceType,
        resource_id: resourceId,
        granted_to_user_id: userId,
        permission_level: permissionLevel,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate permission
      if (error.code === '23505') {
        return {
          success: false,
          error: 'This user already has access to this resource',
        };
      }
      throw error;
    }

    // Send email notification (async, non-blocking)
    try {
      // Get sharer's name for email
      const { data: sharerData } = await supabase
        .from('users')
        .select('display_name, email')
        .eq('id', currentUser.id)
        .single();

      if (sharerData) {
        const sharerName = sharerData.display_name || sharerData.email;
        
        // Import email service dynamically
        const { sendSharingNotification } = await import('@/features/sharing/emailService');
        
        // Send notification (don't await - fire and forget)
        sendSharingNotification({
          recipientUserId: userId,
          resourceType,
          resourceId,
          sharerName,
        }).catch((err) => {
          console.error('Failed to send sharing notification email:', err);
        });
      }
    } catch (emailError) {
      // Don't fail the share if email fails
      console.error('Error sending sharing notification:', emailError);
    }

    return {
      success: true,
      message: 'Successfully shared with user',
      permission: transformPermissionFromDb(data),
    };
  } catch (error: any) {
    console.error('Error sharing with user:', error);
    return {
      success: false,
      error: error.message || 'Failed to share with user',
    };
  }
}

/**
 * Share a resource with an organization
 * @param options Share options
 * @returns Result with success status and permission data
 */
export async function shareWithOrg(
  options: ShareWithOrgOptions
): Promise<ShareActionResult> {
  try {
    const { resourceType, resourceId, organizationId, permissionLevel } =
      options;

    // Get current user
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      throw new PermissionError(
        'User not authenticated',
        PermissionErrorCode.UNAUTHORIZED
      );
    }

    // Validate permission data
    validatePermission({
      resourceType,
      resourceId,
      grantedToOrganizationId: organizationId,
      permissionLevel,
    });

    // Insert permission
    const { data, error } = await supabase
      .from('permissions')
      .insert({
        resource_type: resourceType,
        resource_id: resourceId,
        granted_to_organization_id: organizationId,
        permission_level: permissionLevel,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate permission
      if (error.code === '23505') {
        return {
          success: false,
          error: 'This organization already has access to this resource',
        };
      }
      throw error;
    }

    return {
      success: true,
      message: 'Successfully shared with organization',
      permission: transformPermissionFromDb(data),
    };
  } catch (error: any) {
    console.error('Error sharing with organization:', error);
    return {
      success: false,
      error: error.message || 'Failed to share with organization',
    };
  }
}

/**
 * Make a resource public
 * @param options Public sharing options
 * @returns Result with success status and permission data
 */
export async function makePublic(
  options: MakePublicOptions
): Promise<ShareActionResult> {
  try {
    const { resourceType, resourceId, permissionLevel = 'viewer' } = options;

    // Get current user
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      throw new PermissionError(
        'User not authenticated',
        PermissionErrorCode.UNAUTHORIZED
      );
    }

    // Validate permission data
    validatePermission({
      resourceType,
      resourceId,
      isPublic: true,
      permissionLevel,
    });

    // Insert permission
    const { data, error } = await supabase
      .from('permissions')
      .insert({
        resource_type: resourceType,
        resource_id: resourceId,
        is_public: true,
        permission_level: permissionLevel,
        created_by: currentUser.id,
      })
      .select()
      .single();

    if (error) {
      // Handle duplicate permission
      if (error.code === '23505') {
        return {
          success: false,
          error: 'This resource is already public',
        };
      }
      throw error;
    }

    return {
      success: true,
      message: 'Successfully made resource public',
      permission: transformPermissionFromDb(data),
    };
  } catch (error: any) {
    console.error('Error making resource public:', error);
    return {
      success: false,
      error: error.message || 'Failed to make resource public',
    };
  }
}

// ============================================================================
// Revoke Functions
// ============================================================================

/**
 * Revoke user access to a resource
 * @param options Revoke options
 * @returns Result with success status
 */
export async function revokeUserAccess(
  resourceType: ResourceType,
  resourceId: string,
  userId: string
): Promise<ShareActionResult> {
  try {
    const { error } = await supabase
      .from('permissions')
      .delete()
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .eq('granted_to_user_id', userId);

    if (error) throw error;

    return {
      success: true,
      message: 'Successfully revoked user access',
    };
  } catch (error: any) {
    console.error('Error revoking user access:', error);
    return {
      success: false,
      error: error.message || 'Failed to revoke user access',
    };
  }
}

/**
 * Revoke organization access to a resource
 * @param resourceType Resource type
 * @param resourceId Resource ID
 * @param organizationId Organization ID
 * @returns Result with success status
 */
export async function revokeOrgAccess(
  resourceType: ResourceType,
  resourceId: string,
  organizationId: string
): Promise<ShareActionResult> {
  try {
    const { error } = await supabase
      .from('permissions')
      .delete()
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .eq('granted_to_organization_id', organizationId);

    if (error) throw error;

    return {
      success: true,
      message: 'Successfully revoked organization access',
    };
  } catch (error: any) {
    console.error('Error revoking organization access:', error);
    return {
      success: false,
      error: error.message || 'Failed to revoke organization access',
    };
  }
}

/**
 * Revoke public access to a resource
 * @param resourceType Resource type
 * @param resourceId Resource ID
 * @returns Result with success status
 */
export async function revokePublicAccess(
  resourceType: ResourceType,
  resourceId: string
): Promise<ShareActionResult> {
  try {
    const { error } = await supabase
      .from('permissions')
      .delete()
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId)
      .eq('is_public', true);

    if (error) throw error;

    return {
      success: true,
      message: 'Successfully revoked public access',
    };
  } catch (error: any) {
    console.error('Error revoking public access:', error);
    return {
      success: false,
      error: error.message || 'Failed to revoke public access',
    };
  }
}

/**
 * Generic revoke function that handles all types
 * @param options Revoke options
 * @returns Result with success status
 */
export async function revokeAccess(
  options: RevokeAccessOptions
): Promise<ShareActionResult> {
  const { resourceType, resourceId, userId, organizationId, isPublic } =
    options;

  if (userId) {
    return revokeUserAccess(resourceType, resourceId, userId);
  } else if (organizationId) {
    return revokeOrgAccess(resourceType, resourceId, organizationId);
  } else if (isPublic) {
    return revokePublicAccess(resourceType, resourceId);
  }

  return {
    success: false,
    error: 'Must specify userId, organizationId, or isPublic',
  };
}

// ============================================================================
// Update Functions
// ============================================================================

/**
 * Update permission level for an existing permission
 * @param options Update options
 * @returns Result with success status
 */
export async function updatePermissionLevel(
  options: UpdatePermissionOptions
): Promise<ShareActionResult> {
  try {
    const { resourceType, resourceId, userId, organizationId, isPublic, newLevel } = options;

    let query = supabase
      .from('permissions')
      .update({ permission_level: newLevel })
      .eq('resource_type', resourceType)
      .eq('resource_id', resourceId);

    if (userId) {
      query = query.eq('granted_to_user_id', userId);
    } else if (organizationId) {
      query = query.eq('granted_to_organization_id', organizationId);
    } else if (isPublic) {
      query = query.eq('is_public', true);
    } else {
      return {
        success: false,
        error: 'Must specify userId, organizationId, or isPublic',
      };
    }

    const { error } = await query;

    if (error) throw error;

    return {
      success: true,
      message: 'Successfully updated permission level',
    };
  } catch (error: any) {
    console.error('Error updating permission level:', error);
    return {
      success: false,
      error: error.message || 'Failed to update permission level',
    };
  }
}

// ============================================================================
// Query Functions
// ============================================================================

/**
 * List all permissions for a resource
 * @param resourceType Resource type
 * @param resourceId Resource ID
 * @returns Array of permissions
 */
export async function listPermissions(
  resourceType: ResourceType,
  resourceId: string
): Promise<PermissionWithDetails[]> {
  try {
    // Use the SECURITY DEFINER function to avoid RLS recursion issues
    const { data, error } = await supabase.rpc('get_resource_permissions', {
      p_resource_type: resourceType,
      p_resource_id: resourceId,
    });

    if (error) {
      console.error('RPC error details:', {
        message: error.message,
        details: error.details,
        hint: error.hint,
        code: error.code,
      });
      throw error;
    }

    return (data || []).map(transformPermissionFromDb);
  } catch (error: any) {
    console.error('Error listing permissions:', {
      message: error?.message,
      details: error?.details,
      hint: error?.hint,
      code: error?.code,
      error,
    });
    return [];
  }
}

/**
 * Get permissions for a resource with user and organization details
 * @param resourceType Resource type
 * @param resourceId Resource ID
 * @returns Array of permissions with details
 */
export async function getResourcePermissions(
  resourceType: ResourceType,
  resourceId: string
): Promise<PermissionWithDetails[]> {
  try {
    // This would need to join with users and organizations tables
    // For now, return basic permissions - can be enhanced later
    const permissions = await listPermissions(resourceType, resourceId);
    return permissions as PermissionWithDetails[];
  } catch (error) {
    console.error('Error getting resource permissions:', error);
    return [];
  }
}

/**
 * Check if current user has specific permission for a resource
 * @param options Check options
 * @returns Permission check result
 */
export async function checkPermission(
  options: CheckPermissionOptions
): Promise<PermissionCheckResult> {
  try {
    const { resourceType, resourceId, requiredLevel = 'viewer' } = options;

    // Get current user
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      return {
        hasAccess: false,
        isOwner: false,
        reason: 'User not authenticated',
      };
    }

    // Try to fetch the resource - RLS will block if no access
    // This is a simplified check - in production, use the has_permission() function
    const permissions = await listPermissions(resourceType, resourceId);
    
    // Check if user has direct permission
    const userPermission = permissions.find(
      (p) => p.grantedToUserId === currentUser.id
    );

    if (userPermission) {
      const hasAccess = satisfiesPermissionLevel(
        userPermission.permissionLevel,
        requiredLevel
      );
      return {
        hasAccess,
        level: userPermission.permissionLevel,
        isOwner: false,
        reason: hasAccess ? 'Direct user permission' : 'Insufficient permission level',
      };
    }

    // Check public access
    const publicPermission = permissions.find((p) => p.isPublic);
    if (publicPermission) {
      const hasAccess = satisfiesPermissionLevel(
        publicPermission.permissionLevel,
        requiredLevel
      );
      return {
        hasAccess,
        level: publicPermission.permissionLevel,
        isOwner: false,
        reason: hasAccess ? 'Public access' : 'Insufficient public permission level',
      };
    }

    // Check organization permissions would require fetching user's orgs
    // This is a simplified implementation

    return {
      hasAccess: false,
      isOwner: false,
      reason: 'No permission found',
    };
  } catch (error) {
    console.error('Error checking permission:', error);
    return {
      hasAccess: false,
      isOwner: false,
      reason: 'Error checking permission',
    };
  }
}

/**
 * Check if current user is the owner of a resource
 * @param resourceType Resource type
 * @param resourceId Resource ID
 * @returns True if user is owner
 */
export async function isResourceOwner(
  resourceType: ResourceType,
  resourceId: string
): Promise<boolean> {
  try {
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      return false;
    }

    // Get the resource to check owner
    // Table name is plural of resource type
    const tableName = getTableName(resourceType);
    
    const { data, error } = await supabase
      .from(tableName)
      .select('user_id')
      .eq('id', resourceId)
      .single();

    if (error || !data) {
      return false;
    }

    return data.user_id === currentUser.id;
  } catch (error) {
    console.error('Error checking resource owner:', error);
    return false;
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Transform database permission record to application format
 * @param dbRecord Database record
 * @returns Transformed permission
 */
function transformPermissionFromDb(dbRecord: any): PermissionWithDetails {
  return {
    id: dbRecord.id,
    resourceType: dbRecord.resource_type,
    resourceId: dbRecord.resource_id,
    grantedToUserId: dbRecord.granted_to_user_id,
    grantedToOrganizationId: dbRecord.granted_to_organization_id,
    isPublic: dbRecord.is_public,
    permissionLevel: dbRecord.permission_level,
    createdAt: dbRecord.created_at ? new Date(dbRecord.created_at) : undefined,
    createdBy: dbRecord.created_by,
    // Parse JSONB fields from the RPC function
    grantedToUser: dbRecord.granted_to_user ? {
      id: dbRecord.granted_to_user.id,
      email: dbRecord.granted_to_user.email,
      displayName: dbRecord.granted_to_user.displayName,
      avatarUrl: dbRecord.granted_to_user.avatarUrl,
    } : undefined,
    grantedToOrganization: dbRecord.granted_to_organization ? {
      id: dbRecord.granted_to_organization.id,
      name: dbRecord.granted_to_organization.name,
      slug: dbRecord.granted_to_organization.slug,
      logoUrl: dbRecord.granted_to_organization.logoUrl,
    } : undefined,
  };
}

/**
 * Get table name for resource type
 * @param resourceType Resource type
 * @returns Table name
 */
function getTableName(resourceType: ResourceType): string {
  // Most tables are just plural of resource type
  const tableMap: Partial<Record<ResourceType, string>> = {
    prompt: 'prompts',
    workflow: 'workflows',
    note: 'notes',
    recipe: 'recipes',
    document: 'documents',
    conversation: 'conversations',
    applet: 'applets',
    broker_value: 'broker_values',
    message: 'messages',
    organization: 'organizations',
    scrape_domain: 'scrape_domains',
  };

  return tableMap[resourceType] || `${resourceType}s`;
}

/**
 * Batch share with multiple users
 * @param resourceType Resource type
 * @param resourceId Resource ID
 * @param userIds Array of user IDs
 * @param permissionLevel Permission level
 * @returns Results for each share operation
 */
export async function batchShareWithUsers(
  resourceType: ResourceType,
  resourceId: string,
  userIds: string[],
  permissionLevel: PermissionLevel
): Promise<ShareActionResult[]> {
  const results = await Promise.all(
    userIds.map((userId) =>
      shareWithUser({ resourceType, resourceId, userId, permissionLevel })
    )
  );

  return results;
}

/**
 * Get all resources shared with current user
 * @param resourceType Optional filter by resource type
 * @returns Array of permissions
 */
export async function getSharedWithMe(
  resourceType?: ResourceType
): Promise<Permission[]> {
  try {
    const {
      data: { user: currentUser },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !currentUser) {
      return [];
    }

    let query = supabase
      .from('permissions')
      .select('*')
      .eq('granted_to_user_id', currentUser.id);

    if (resourceType) {
      query = query.eq('resource_type', resourceType);
    }

    const { data, error } = await query.order('created_at', { ascending: false });

    if (error) throw error;

    return (data || []).map(transformPermissionFromDb);
  } catch (error) {
    console.error('Error getting shared resources:', error);
    return [];
  }
}

