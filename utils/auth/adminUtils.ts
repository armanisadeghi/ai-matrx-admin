// utils/auth/adminUtils.ts
'use server';

import { createClient } from '@/utils/supabase/server';
import { ADMIN_USER_IDS, isAdminUser } from '@/config/admin.config';

/**
 * Server-side Admin Utilities
 * 
 * These functions run on the server and provide secure admin verification.
 * Use these for any security-critical operations.
 */

/**
 * Get the current user's ID and admin status (server-side)
 * @returns Object with userId and isAdmin, or null if not authenticated
 */
export async function getCurrentUserAdminStatus(): Promise<{
  userId: string;
  isAdmin: boolean;
} | null> {
  const supabase = await createClient();
  
  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    return null;
  }
  
  return {
    userId: user.id,
    isAdmin: isAdminUser(user.id),
  };
}

/**
 * Verify that the current user is an admin (server-side)
 * Throws an error if user is not authenticated or not an admin
 */
export async function requireAdmin(): Promise<string> {
  const status = await getCurrentUserAdminStatus();
  
  if (!status) {
    throw new Error('Unauthorized: User not authenticated');
  }
  
  if (!status.isAdmin) {
    throw new Error('Forbidden: User is not an admin');
  }
  
  return status.userId;
}

/**
 * Check if a specific user ID is an admin (server-side)
 * @param userId - User ID to check
 * @returns true if user is an admin
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  return isAdminUser(userId);
}

/**
 * Get all admin user IDs (server-side)
 * @returns Array of admin user IDs
 */
export async function getAdminIds(): Promise<readonly string[]> {
  return ADMIN_USER_IDS;
}

