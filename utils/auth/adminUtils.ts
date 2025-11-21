// utils/auth/adminUtils.ts
'use server';

import { createClient } from '@/utils/supabase/server';
import { checkIsUserAdmin } from '@/utils/supabase/userSessionData';

/**
 * Server-side Admin Utilities
 *
 * These functions run on the server and provide secure admin verification.
 * All functions query the database 'admins' table as the single source of truth.
 * Use these for any security-critical operations in API routes and server actions.
 */

/**
 * Get the current user's ID and admin status (server-side)
 * Queries the database admins table to verify admin status.
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

  const isAdmin = await checkIsUserAdmin(supabase, user.id);

  return {
    userId: user.id,
    isAdmin,
  };
}

/**
 * Verify that the current user is an admin (server-side)
 * Throws an error if user is not authenticated or not an admin.
 * Use this at the start of admin-only API routes or server actions.
 * @returns The user ID if user is an authenticated admin
 * @throws Error if user is not authenticated or not an admin
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
 * Queries the database admins table.
 * @param userId - User ID to check
 * @returns true if user is an admin
 */
export async function checkIsAdmin(userId: string): Promise<boolean> {
  const supabase = await createClient();
  return checkIsUserAdmin(supabase, userId);
}

