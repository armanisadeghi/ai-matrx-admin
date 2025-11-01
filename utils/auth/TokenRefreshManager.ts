// utils/auth/TokenRefreshManager.ts

import { createClient } from '@/utils/supabase/client';
import { getStore } from '@/lib/redux/store';
import { setAccessToken, setTokenExpiry } from '@/lib/redux/slices/userSlice';

/**
 * TokenRefreshManager
 * 
 * Proactively refreshes Supabase authentication tokens before they expire.
 * 
 * Features:
 * - Monitors token expiry time
 * - Refreshes tokens automatically when they're close to expiring (default: 3 days before)
 * - Works silently in the background without disrupting user experience
 * - Updates Redux store with new token
 * - Stores expiry info in localStorage for persistence
 */

const TOKEN_EXPIRY_KEY = 'supabase_token_expiry';
const TOKEN_REFRESH_THRESHOLD_MS = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
const CHECK_INTERVAL_MS = 5 * 60 * 1000; // Check every 5 minutes

interface TokenInfo {
  expiresAt: number; // Unix timestamp (seconds)
  lastChecked: number; // Unix timestamp (milliseconds)
}

export class TokenRefreshManager {
  private static instance: TokenRefreshManager;
  private intervalId: NodeJS.Timeout | null = null;
  private isRefreshing = false;

  private constructor() {
    // Private constructor for singleton pattern
  }

  /**
   * Get the singleton instance
   */
  public static getInstance(): TokenRefreshManager {
    if (!TokenRefreshManager.instance) {
      TokenRefreshManager.instance = new TokenRefreshManager();
    }
    return TokenRefreshManager.instance;
  }

  /**
   * Start the token refresh monitoring
   */
  public start(): void {
    if (typeof window === 'undefined') {
      console.warn('[TokenRefreshManager] Cannot run on server side');
      return;
    }

    // Stop any existing interval
    this.stop();

    console.log('[TokenRefreshManager] Starting token refresh monitoring');

    // Initial check
    this.checkAndRefreshToken();

    // Set up periodic checks
    this.intervalId = setInterval(() => {
      this.checkAndRefreshToken();
    }, CHECK_INTERVAL_MS);
  }

  /**
   * Stop the token refresh monitoring
   */
  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log('[TokenRefreshManager] Stopped token refresh monitoring');
    }
  }

  /**
   * Check if token needs refresh and refresh if necessary
   */
  private async checkAndRefreshToken(): Promise<void> {
    if (this.isRefreshing) {
      console.log('[TokenRefreshManager] Refresh already in progress, skipping');
      return;
    }

    try {
      const supabase = createClient();
      
      // Get current session
      const { data: { session }, error } = await supabase.auth.getSession();

      if (error) {
        console.error('[TokenRefreshManager] Error getting session:', error);
        return;
      }

      if (!session) {
        console.log('[TokenRefreshManager] No active session');
        this.clearStoredExpiry();
        return;
      }

      const expiresAt = session.expires_at; // Unix timestamp in seconds
      
      if (!expiresAt) {
        console.warn('[TokenRefreshManager] Session has no expiry time');
        return;
      }

      // Store the expiry time
      this.storeTokenExpiry(expiresAt);

      // Check if token needs refresh
      const needsRefresh = this.shouldRefreshToken(expiresAt);

      if (needsRefresh) {
        console.log('[TokenRefreshManager] Token expiring soon, refreshing...');
        await this.refreshToken();
      } else {
        const timeUntilExpiry = this.getTimeUntilExpiry(expiresAt);
        console.log(`[TokenRefreshManager] Token is fresh. Expires in ${this.formatDuration(timeUntilExpiry)}`);
      }

    } catch (error) {
      console.error('[TokenRefreshManager] Error in checkAndRefreshToken:', error);
    }
  }

  /**
   * Determine if token should be refreshed based on expiry time
   */
  private shouldRefreshToken(expiresAt: number): boolean {
    const now = Date.now();
    const expiresAtMs = expiresAt * 1000; // Convert to milliseconds
    const timeUntilExpiry = expiresAtMs - now;

    // Refresh if token expires within the threshold (default: 3 days)
    return timeUntilExpiry <= TOKEN_REFRESH_THRESHOLD_MS && timeUntilExpiry > 0;
  }

  /**
   * Refresh the token silently in the background
   */
  private async refreshToken(): Promise<void> {
    if (this.isRefreshing) {
      console.log('[TokenRefreshManager] Refresh already in progress, skipping to avoid race condition');
      return;
    }

    this.isRefreshing = true;

    try {
      const supabase = createClient();
      
      // First, get the current session to check if we even need to refresh
      const { data: currentSession } = await supabase.auth.getSession();
      
      if (!currentSession.session) {
        console.warn('[TokenRefreshManager] No active session to refresh');
        this.isRefreshing = false;
        return;
      }
      
      // Check if the current token is still valid
      const expiresAt = currentSession.session.expires_at;
      if (expiresAt) {
        const timeUntilExpiry = this.getTimeUntilExpiry(expiresAt);
        if (timeUntilExpiry > TOKEN_REFRESH_THRESHOLD_MS) {
          console.log('[TokenRefreshManager] Token was already refreshed recently, skipping');
          this.isRefreshing = false;
          return;
        }
      }
      
      console.log('[TokenRefreshManager] Refreshing session...');
      
      // Use refreshSession to get a new token
      const { data, error } = await supabase.auth.refreshSession();

      if (error) {
        console.error('[TokenRefreshManager] Error refreshing session:', error);
        
        // Handle specific error cases
        if (error.message?.includes('Revoked by Newer Login') || error.message?.includes('Session Expired')) {
          console.warn('[TokenRefreshManager] ⚠️ Token was already refreshed by another process (middleware/tab). Getting latest session...');
          // Try to get the current (already refreshed) session
          const { data: latestSession } = await supabase.auth.getSession();
          if (latestSession.session) {
            console.log('[TokenRefreshManager] ✅ Using already-refreshed session');
            const newAccessToken = latestSession.session.access_token;
            const newExpiresAt = latestSession.session.expires_at;
            
            // Update our state with the already-refreshed token
            const reduxStore = getStore();
            if (reduxStore) {
              reduxStore.dispatch(setAccessToken(newAccessToken));
              if (newExpiresAt) {
                reduxStore.dispatch(setTokenExpiry(newExpiresAt));
                this.storeTokenExpiry(newExpiresAt);
              }
            }
          }
          return;
        }
        
        // If refresh fails for other reasons, user might need to re-authenticate
        if (error.message?.includes('refresh_token') || error.message?.includes('invalid')) {
          console.error('[TokenRefreshManager] Refresh token invalid, user needs to re-authenticate');
          // Clear stored data
          this.clearStoredExpiry();
        }
        return;
      }

      if (data.session) {
        const newAccessToken = data.session.access_token;
        const newExpiresAt = data.session.expires_at;

        console.log('[TokenRefreshManager] ✅ Token refreshed successfully');
        console.log(`[TokenRefreshManager] New expiry: ${new Date(newExpiresAt! * 1000).toLocaleString()}`);

        // Update Redux store with new token and expiry
        const reduxStore = getStore();
        if (reduxStore) {
          reduxStore.dispatch(setAccessToken(newAccessToken));
          if (newExpiresAt) {
            reduxStore.dispatch(setTokenExpiry(newExpiresAt));
          }
        }

        // Store new expiry time in localStorage
        if (newExpiresAt) {
          this.storeTokenExpiry(newExpiresAt);
        }
      } else {
        console.warn('[TokenRefreshManager] No session returned from refresh');
      }

    } catch (error) {
      console.error('[TokenRefreshManager] Unexpected error during token refresh:', error);
    } finally {
      this.isRefreshing = false;
    }
  }

  /**
   * Store token expiry time in localStorage
   */
  private storeTokenExpiry(expiresAt: number): void {
    if (typeof window === 'undefined') return;

    const tokenInfo: TokenInfo = {
      expiresAt,
      lastChecked: Date.now(),
    };

    try {
      localStorage.setItem(TOKEN_EXPIRY_KEY, JSON.stringify(tokenInfo));
    } catch (error) {
      console.error('[TokenRefreshManager] Error storing token expiry:', error);
    }
  }

  /**
   * Get stored token expiry info from localStorage
   */
  public getStoredTokenInfo(): TokenInfo | null {
    if (typeof window === 'undefined') return null;

    try {
      const stored = localStorage.getItem(TOKEN_EXPIRY_KEY);
      if (stored) {
        return JSON.parse(stored) as TokenInfo;
      }
    } catch (error) {
      console.error('[TokenRefreshManager] Error reading token expiry:', error);
    }
    return null;
  }

  /**
   * Clear stored token expiry info
   */
  private clearStoredExpiry(): void {
    if (typeof window === 'undefined') return;

    try {
      localStorage.removeItem(TOKEN_EXPIRY_KEY);
    } catch (error) {
      console.error('[TokenRefreshManager] Error clearing token expiry:', error);
    }
  }

  /**
   * Get time until token expiry in milliseconds
   */
  private getTimeUntilExpiry(expiresAt: number): number {
    const now = Date.now();
    const expiresAtMs = expiresAt * 1000;
    return expiresAtMs - now;
  }

  /**
   * Format duration for logging
   */
  private formatDuration(ms: number): string {
    const seconds = Math.floor(ms / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) {
      return `${days} day${days !== 1 ? 's' : ''} ${hours % 24}h`;
    } else if (hours > 0) {
      return `${hours} hour${hours !== 1 ? 's' : ''} ${minutes % 60}m`;
    } else if (minutes > 0) {
      return `${minutes} minute${minutes !== 1 ? 's' : ''}`;
    } else {
      return `${seconds} second${seconds !== 1 ? 's' : ''}`;
    }
  }

  /**
   * Get token expiry status for debugging
   */
  public async getTokenStatus(): Promise<{
    isActive: boolean;
    expiresAt?: Date;
    expiresIn?: string;
    needsRefresh?: boolean;
  }> {
    try {
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();

      if (!session || !session.expires_at) {
        return { isActive: false };
      }

      const expiresAt = session.expires_at;
      const timeUntilExpiry = this.getTimeUntilExpiry(expiresAt);
      const needsRefresh = this.shouldRefreshToken(expiresAt);

      return {
        isActive: true,
        expiresAt: new Date(expiresAt * 1000),
        expiresIn: this.formatDuration(timeUntilExpiry),
        needsRefresh,
      };
    } catch (error) {
      console.error('[TokenRefreshManager] Error getting token status:', error);
      return { isActive: false };
    }
  }

  /**
   * Manually trigger a token refresh (for testing or force refresh)
   */
  public async forceRefresh(): Promise<boolean> {
    console.log('[TokenRefreshManager] Force refresh requested...');
    
    // Wait a bit if already refreshing to avoid conflicts
    if (this.isRefreshing) {
      console.log('[TokenRefreshManager] Waiting for existing refresh to complete...');
      let attempts = 0;
      while (this.isRefreshing && attempts < 10) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      if (this.isRefreshing) {
        console.warn('[TokenRefreshManager] Force refresh timed out waiting for existing refresh');
        return false;
      }
    }
    
    await this.refreshToken();
    return !this.isRefreshing; // Returns true if refresh completed
  }
}

// Export singleton instance
export const tokenRefreshManager = TokenRefreshManager.getInstance();

