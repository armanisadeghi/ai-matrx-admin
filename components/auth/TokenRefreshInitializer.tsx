// components/auth/TokenRefreshInitializer.tsx
'use client';

import { useEffect } from 'react';
import { tokenRefreshManager } from '@/utils/auth/TokenRefreshManager';
import { useUser } from '@/lib/hooks/useUser';

/**
 * TokenRefreshInitializer
 * 
 * Client component that initializes and manages automatic token refresh.
 * Should be mounted once in the app layout to ensure tokens stay fresh.
 * 
 * Features:
 * - Starts token refresh monitoring when user is authenticated
 * - Stops monitoring when user logs out
 * - Runs silently in the background
 */
export default function TokenRefreshInitializer() {
  const { userId } = useUser();

  useEffect(() => {
    // Only start if we have a user (authenticated)
    if (userId) {
      console.log('[TokenRefreshInitializer] User authenticated, starting token refresh monitoring');
      tokenRefreshManager.start();

      // Cleanup on unmount or when user changes
      return () => {
        console.log('[TokenRefreshInitializer] Stopping token refresh monitoring');
        tokenRefreshManager.stop();
      };
    } else {
      console.log('[TokenRefreshInitializer] No user, token refresh not started');
      // Make sure it's stopped if user logs out
      tokenRefreshManager.stop();
    }
  }, [userId]);

  // This component doesn't render anything
  return null;
}

