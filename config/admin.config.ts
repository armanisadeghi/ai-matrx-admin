// config/admin.config.ts

/**
 * Admin Configuration
 * 
 * SINGLE SOURCE OF TRUTH for admin user IDs.
 * 
 * Security Note:
 * - These IDs are used for client-side UI features (showing admin panels, etc.)
 * - NEVER rely on client-side admin checks for security-critical operations
 * - Always verify admin status server-side for protected operations
 * - See utils/auth/adminUtils.ts for server-side verification
 */

/**
 * List of admin user IDs
 * 
 * Add new admin users by adding their Supabase user ID to this array
 */
export const ADMIN_USER_IDS: readonly string[] = [
  "4cf62e4e-2679-484f-b652-034e697418df",
  "8f7f17ba-935b-4967-8105-7c6b554f41f1",
  "6555aa73-c647-4ecf-8a96-b60e315b6b18",
] as const;

/**
 * Check if a user ID is an admin
 * @param userId - Supabase user ID to check
 * @returns true if user is an admin
 */
export function isAdminUser(userId: string | null | undefined): boolean {
  if (!userId) return false;
  return ADMIN_USER_IDS.includes(userId);
}

/**
 * Get all admin user IDs
 * @returns Array of admin user IDs
 */
export function getAdminUserIds(): readonly string[] {
  return ADMIN_USER_IDS;
}

