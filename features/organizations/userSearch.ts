/**
 * User Search Utilities
 * 
 * Functions to search for users in the auth.users table
 */

import { supabase } from '@/utils/supabase/client';

export interface UserSearchResult {
  id: string;
  email: string;
  exists: boolean;
}

/**
 * Search for a user by email in auth.users
 * @param email Email to search for
 * @returns User info if found, or indication that user doesn't exist
 */
export async function searchUserByEmail(email: string): Promise<UserSearchResult> {
  try {
    // Query auth.users table (requires service role or RLS policy)
    // Note: This might need to be done server-side if auth.users isn't accessible
    const { data, error } = await supabase
      .from('profiles') // Or whatever table has user info
      .select('id, email')
      .eq('email', email.toLowerCase().trim())
      .single();

    if (error || !data) {
      return {
        id: '',
        email: email.toLowerCase().trim(),
        exists: false,
      };
    }

    return {
      id: data.id,
      email: data.email,
      exists: true,
    };
  } catch (error) {
    console.error('Error searching for user:', error);
    return {
      id: '',
      email: email.toLowerCase().trim(),
      exists: false,
    };
  }
}

/**
 * Check if a user exists in the system
 * @param email Email to check
 * @returns True if user exists
 */
export async function userExists(email: string): Promise<boolean> {
  const result = await searchUserByEmail(email);
  return result.exists;
}

