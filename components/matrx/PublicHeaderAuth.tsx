'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogIn, Shield } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { selectUser, selectDisplayName, selectProfilePhoto, selectIsAdmin } from '@/lib/redux/slices/userSlice';
import { cn } from '@/lib/utils';

// ===== PERFORMANCE TIMING LOGS =====
const AUTH_MODULE_LOAD = typeof window !== 'undefined' ? performance.now() : 0;
if (typeof window !== 'undefined') {
  console.log(`[PERF] PublicHeaderAuth module loaded at: ${AUTH_MODULE_LOAD.toFixed(2)}ms`);
}

/**
 * Public Header Auth - Redux-powered
 * 
 * Reads auth state from Redux (populated by AuthSyncWrapper).
 * No direct Supabase calls - single source of truth.
 * 
 * Shows:
 * - Loading skeleton while auth syncing
 * - Sign In button for unauthenticated users
 * - User avatar + Dashboard button for authenticated users
 * - Admin badge for admin users
 */
export function PublicHeaderAuth() {
  const user = useSelector(selectUser);
  const displayName = useSelector(selectDisplayName);
  const profilePhoto = useSelector(selectProfilePhoto);
  const isAdmin = useSelector(selectIsAdmin);
  const router = useRouter();

  // ===== PERFORMANCE TIMING LOGS =====
  React.useEffect(() => {
    console.log(`[PERF] PublicHeaderAuth hydrated at: ${performance.now().toFixed(2)}ms`);
  }, []);

  const isAuthenticated = !!user.id;

  // Calculate initials for avatar fallback
  const initials = displayName
    .split(' ')
    .map((n: string) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  // If authenticated, show user info + dashboard button
  if (isAuthenticated) {
    return (
      <div className="flex items-center gap-1.5">
        {/* Admin Badge - Only for admins */}
        {isAdmin && (
          <div className="hidden sm:flex items-center gap-1 px-2 py-1 rounded-md bg-orange-500/10 border border-orange-500/20">
            <Shield className="h-3 w-3 text-orange-500" />
            <span className="text-[10px] font-medium text-orange-500">Admin</span>
          </div>
        )}

        {/* User Avatar - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
          <Avatar className="h-5 w-5">
            <AvatarImage src={profilePhoto || undefined} alt={displayName} />
            <AvatarFallback className="text-[10px] bg-gradient-to-r from-blue-600 to-violet-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-xs font-medium text-foreground">
            {displayName}
          </span>
        </div>

        {/* Dashboard Button */}
        <Button
          onClick={() => router.push('/dashboard')}
          size="sm"
          className={cn(
            "h-7 gap-1.5 px-2 text-xs",
            "bg-gradient-to-r from-blue-600 to-violet-600",
            "hover:from-blue-700 hover:to-violet-700",
            "text-white border-0",
            "shadow-md shadow-blue-500/20",
            "hover:shadow-lg hover:shadow-blue-500/30",
            "transition-all duration-300"
          )}
        >
          <LayoutDashboard className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Dashboard</span>
        </Button>
      </div>
    );
  }

  // Not authenticated - show sign in button
  return (
    <Button
      onClick={() => router.push('/login')}
      size="sm"
      className={cn(
        "h-7 gap-1.5 px-2 text-xs",
        "bg-gradient-to-r from-blue-600 to-violet-600",
        "hover:from-blue-700 hover:to-violet-700",
        "text-white border-0",
        "shadow-md shadow-blue-500/20",
        "hover:shadow-lg hover:shadow-blue-500/30",
        "transition-all duration-300"
      )}
    >
      <LogIn className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">Sign In</span>
    </Button>
  );
}
