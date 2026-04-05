/**
 * User Search Utilities
 *
 * Resolves users by email via the `lookup_user_by_email` RPC (not `profiles.email`).
 */

import { supabase } from "@/utils/supabase/client";

export interface UserSearchResult {
  id: string;
  email: string;
  exists: boolean;
}

/**
 * Search for a user by email.
 */
export async function searchUserByEmail(
  email: string,
): Promise<UserSearchResult> {
  const normalized = email.toLowerCase().trim();
  try {
    const { data, error } = await supabase.rpc("lookup_user_by_email", {
      lookup_email: normalized,
    });

    if (error || !data?.length) {
      return {
        id: "",
        email: normalized,
        exists: false,
      };
    }

    const row = data[0];
    return {
      id: row.user_id,
      email: row.user_email,
      exists: true,
    };
  } catch (error) {
    console.error("Error searching for user:", error);
    return {
      id: "",
      email: normalized,
      exists: false,
    };
  }
}

/**
 * Check if a user exists in the system
 */
export async function userExists(email: string): Promise<boolean> {
  const result = await searchUserByEmail(email);
  return result.exists;
}
