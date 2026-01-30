'use server';

import { createAdminClient } from '@/utils/supabase/adminClient';

export interface UserLookupResult {
  success: boolean;
  user?: {
    id: string;
    email: string;
  };
  error?: string;
}

/**
 * Look up a user by email address using the admin client
 * This bypasses RLS to allow looking up any user's basic info
 * 
 * @param email The email address to look up
 * @returns The user's id and email if found, error message otherwise
 */
export async function lookupUserByEmail(email: string): Promise<UserLookupResult> {
  try {
    if (!email || !email.includes('@')) {
      return { success: false, error: 'Invalid email address' };
    }

    const normalizedEmail = email.toLowerCase().trim();
    const supabase = createAdminClient();

    // Try the users table first
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('id, email')
      .eq('email', normalizedEmail)
      .single();

    if (userData && !userError) {
      return {
        success: true,
        user: {
          id: userData.id,
          email: userData.email,
        },
      };
    }

    // If not found in users, try profiles table as fallback
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id, email')
      .eq('email', normalizedEmail)
      .single();

    if (profileData && !profileError) {
      return {
        success: true,
        user: {
          id: profileData.id,
          email: profileData.email,
        },
      };
    }

    // If still not found, try auth.users via admin API
    const { data: authData, error: authError } = await supabase.auth.admin.listUsers();
    
    if (authData && !authError) {
      const authUser = authData.users.find(
        (u) => u.email?.toLowerCase() === normalizedEmail
      );
      
      if (authUser) {
        return {
          success: true,
          user: {
            id: authUser.id,
            email: authUser.email || normalizedEmail,
          },
        };
      }
    }

    return {
      success: false,
      error: `No user found with email "${normalizedEmail}". They may need to create an account first.`,
    };
  } catch (error: any) {
    console.error('User lookup error:', error);
    return {
      success: false,
      error: error.message || 'Failed to look up user',
    };
  }
}
