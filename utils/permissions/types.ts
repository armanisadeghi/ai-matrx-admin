/**
 * Permission System Types
 * 
 * Centralized type definitions for the RLS-based permission system.
 * These types align with the database schema and provide type safety
 * throughout the application.
 */

// ============================================================================
// Core Permission Types
// ============================================================================

/**
 * All shareable resource types in the application.
 * 
 * Convention: new resource types use the exact table name (e.g., 'cx_conversation').
 * Legacy types use singular form (e.g., 'prompt' -> 'prompts' table).
 */
export type ResourceType =
  // Legacy types (singular form, mapped to plural table names)
  | 'prompt'
  | 'workflow'
  | 'note'
  | 'recipe'
  | 'document'
  | 'conversation'
  | 'applet'
  | 'broker_value'
  | 'message'
  | 'organization'
  | 'scrape_domain'
  // New types (exact table names)
  | 'cx_conversation'
  | 'canvas_items'
  | 'user_tables'
  | 'user_lists'
  | 'transcripts'
  | 'quiz_sessions'
  | 'sandbox_instances'
  | 'user_files'
  | 'prompt_actions'
  | 'flashcard_data'
  | 'flashcard_sets';

/**
 * Permission levels in hierarchical order: viewer < editor < admin
 */
export type PermissionLevel = 'viewer' | 'editor' | 'admin';

/**
 * Complete permission record from database
 */
export interface Permission {
  id: string;
  resourceType: ResourceType;
  resourceId: string;
  grantedToUserId?: string | null;
  grantedToOrganizationId?: string | null;
  isPublic?: boolean;
  permissionLevel: PermissionLevel;
  createdAt?: Date;
  createdBy?: string;
}

/**
 * Enriched permission with user/org details for display
 */
export interface PermissionWithDetails extends Permission {
  grantedToUser?: {
    id: string;
    email: string;
    displayName?: string;
    avatarUrl?: string;
  };
  grantedToOrganization?: {
    id: string;
    name: string;
    slug: string;
    logoUrl?: string;
  };
  createdByUser?: {
    id: string;
    email: string;
    displayName?: string;
  };
}

// ============================================================================
// Share Operation Types
// ============================================================================

/**
 * Options for sharing with a specific user
 */
export interface ShareWithUserOptions {
  resourceType: ResourceType;
  resourceId: string;
  userId: string;
  permissionLevel: PermissionLevel;
}

/**
 * Options for sharing with an organization
 */
export interface ShareWithOrgOptions {
  resourceType: ResourceType;
  resourceId: string;
  organizationId: string;
  permissionLevel: PermissionLevel;
}

/**
 * Options for making a resource public
 */
export interface MakePublicOptions {
  resourceType: ResourceType;
  resourceId: string;
  permissionLevel?: PermissionLevel; // Defaults to 'viewer'
}

/**
 * Options for updating permission level
 */
export interface UpdatePermissionOptions {
  resourceType: ResourceType;
  resourceId: string;
  userId?: string;
  organizationId?: string;
  isPublic?: boolean;
  newLevel: PermissionLevel;
}

/**
 * Options for revoking access
 */
export interface RevokeAccessOptions {
  resourceType: ResourceType;
  resourceId: string;
  userId?: string;
  organizationId?: string;
  isPublic?: boolean;
}

// ============================================================================
// Permission Check Types
// ============================================================================

/**
 * Result of a permission check
 */
export interface PermissionCheckResult {
  hasAccess: boolean;
  level?: PermissionLevel;
  isOwner: boolean;
  reason?: string;
}

/**
 * Options for checking permissions
 */
export interface CheckPermissionOptions {
  resourceType: ResourceType;
  resourceId: string;
  requiredLevel?: PermissionLevel;
}

// ============================================================================
// Resource Owner Types
// ============================================================================

/**
 * Generic resource with owner information
 */
export interface OwnedResource {
  id: string;
  user_id: string; // Owner ID
  [key: string]: any;
}

/**
 * Check if user is the owner of a resource
 */
export interface OwnerCheckResult {
  isOwner: boolean;
  ownerId: string;
}

// ============================================================================
// Sharing UI Types
// ============================================================================

/**
 * Share target types
 */
export type ShareTargetType = 'user' | 'organization' | 'public';

/**
 * Sharing modal state
 */
export interface SharingState {
  isOpen: boolean;
  activeTab: ShareTargetType;
  permissions: PermissionWithDetails[];
  loading: boolean;
  error: string | null;
  searchQuery: string;
  selectedPermissionLevel: PermissionLevel;
}

/**
 * Share action result
 */
export interface ShareActionResult {
  success: boolean;
  message?: string;
  error?: string;
  permission?: Permission;
}

// ============================================================================
// Permission Helpers
// ============================================================================

/**
 * Check if a permission level satisfies a required level
 * @param current Current permission level
 * @param required Required permission level
 * @returns True if current >= required
 */
export function satisfiesPermissionLevel(
  current: PermissionLevel,
  required: PermissionLevel
): boolean {
  const levels: Record<PermissionLevel, number> = {
    viewer: 1,
    editor: 2,
    admin: 3,
  };

  return levels[current] >= levels[required];
}

/**
 * Get all permission levels equal to or higher than the given level
 * @param level Minimum permission level
 * @returns Array of permission levels
 */
export function getPermissionLevelsAtOrAbove(
  level: PermissionLevel
): PermissionLevel[] {
  const allLevels: PermissionLevel[] = ['viewer', 'editor', 'admin'];
  const levelIndex = allLevels.indexOf(level);
  return allLevels.slice(levelIndex);
}

/**
 * Get display label for permission level
 * @param level Permission level
 * @returns Human-readable label
 */
export function getPermissionLevelLabel(level: PermissionLevel): string {
  const labels: Record<PermissionLevel, string> = {
    viewer: 'Can view',
    editor: 'Can edit',
    admin: 'Full access',
  };
  return labels[level];
}

/**
 * Get display label for resource type
 * @param type Resource type
 * @returns Human-readable label
 */
export function getResourceTypeLabel(type: ResourceType): string {
  const labels: Record<ResourceType, string> = {
    // Legacy types
    prompt: 'Prompt',
    workflow: 'Workflow',
    note: 'Note',
    recipe: 'Recipe',
    document: 'Document',
    conversation: 'Conversation',
    applet: 'Applet',
    broker_value: 'Broker Value',
    message: 'Message',
    organization: 'Organization',
    scrape_domain: 'Scrape Domain',
    // New types
    cx_conversation: 'Conversation',
    canvas_items: 'Canvas',
    user_tables: 'Table',
    user_lists: 'List',
    transcripts: 'Transcript',
    quiz_sessions: 'Quiz',
    sandbox_instances: 'Sandbox',
    user_files: 'File',
    prompt_actions: 'Action',
    flashcard_data: 'Flashcard',
    flashcard_sets: 'Flashcard Set',
  };
  return labels[type] || type;
}

/**
 * Validate permission data
 * @param permission Permission object
 * @returns True if valid
 * @throws Error if invalid
 */
export function validatePermission(permission: Partial<Permission>): boolean {
  if (!permission.resourceType) {
    throw new Error('Resource type is required');
  }
  
  if (!permission.resourceId) {
    throw new Error('Resource ID is required');
  }
  
  if (!permission.permissionLevel) {
    throw new Error('Permission level is required');
  }
  
  // Exactly one of userId, orgId, or isPublic must be set
  const targetsSet = [
    !!permission.grantedToUserId,
    !!permission.grantedToOrganizationId,
    !!permission.isPublic,
  ].filter(Boolean).length;
  
  if (targetsSet !== 1) {
    throw new Error(
      'Exactly one of grantedToUserId, grantedToOrganizationId, or isPublic must be set'
    );
  }
  
  return true;
}

// ============================================================================
// Error Types
// ============================================================================

/**
 * Custom error for permission-related failures
 */
export class PermissionError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'PermissionError';
  }
}

/**
 * Common permission error codes
 */
export enum PermissionErrorCode {
  NOT_FOUND = 'PERMISSION_NOT_FOUND',
  ALREADY_EXISTS = 'PERMISSION_ALREADY_EXISTS',
  INVALID_LEVEL = 'INVALID_PERMISSION_LEVEL',
  INVALID_TARGET = 'INVALID_SHARE_TARGET',
  UNAUTHORIZED = 'UNAUTHORIZED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  VALIDATION_ERROR = 'VALIDATION_ERROR',
}

