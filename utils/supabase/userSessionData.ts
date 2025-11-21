import { SupabaseClient } from '@supabase/supabase-js';

export interface UserSessionData {
  isAdmin: boolean;
  preferences: any;
  preferencesExist: boolean;
}

interface UserSessionDataResponse {
  is_admin: boolean;
  preferences: any;
  preferences_exists: boolean;
}


/**
 * Checks if a user is an admin by querying the admins table.
 * Use this for simple admin verification in API routes.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to check
 * @returns true if user is an admin, false otherwise
 */
export async function checkIsUserAdmin(
  supabase: SupabaseClient,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('admins')
    .select('user_id')
    .eq('user_id', userId)
    .maybeSingle();

  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }

  return !!data;
}

/**
 * Fetches complete user session data (admin status + preferences) in a single database query.
 * This is much more efficient than making separate queries for admin check and preferences.
 * Use this in layouts where you need both admin status and user preferences.
 *
 * @param supabase - Supabase client instance
 * @param userId - User ID to fetch session data for
 */
export async function getUserSessionData(
  supabase: SupabaseClient,
  userId: string
): Promise<UserSessionData> {
  const { data, error } = await supabase
    .rpc('get_user_session_data', { p_user_id: userId })
    .single() as { data: UserSessionDataResponse | null; error: any };

  if (error) {
    console.error('Error fetching user session data:', error);
    throw new Error(`Failed to fetch user session data: ${error.message}`);
  }

  if (!data) {
    // Fallback if no data is returned
    return {
      isAdmin: false,
      preferences: {},
      preferencesExist: false,
    };
  }

  return {
    isAdmin: data.is_admin,
    preferences: data.preferences,
    preferencesExist: data.preferences_exists,
  };
}
