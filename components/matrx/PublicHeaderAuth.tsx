'use client';

import React, { Suspense, lazy } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogIn } from 'lucide-react';
import { useSelector } from 'react-redux';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { selectUser, selectDisplayName, selectProfilePhoto, selectIsAdmin } from '@/lib/redux/slices/userSlice';
import { cn } from '@/lib/utils';

// Lazy load AdminMenu - only loads when user is admin
const AdminMenu = lazy(() => import('./AdminMenu'));

/**
 * Public Header Auth - Redux-powered
 * 
 * Reads auth state from Redux (populated by AuthSyncWrapper).
 * No direct Supabase calls - single source of truth.
 * 
 * Shows:
 * - Sign In button for unauthenticated users
 * - User avatar + Dashboard button for authenticated users
 * - AdminMenu dropdown for admin users (lazy loaded)
 */
export function PublicHeaderAuth() {
  const user = useSelector(selectUser);
  const displayName = useSelector(selectDisplayName);
  const profilePhoto = useSelector(selectProfilePhoto);
  const isAdmin = useSelector(selectIsAdmin);
  const router = useRouter();

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
        {/* Admin Menu - Lazy loaded, only for admins */}
        {isAdmin && (
          <Suspense fallback={<div className="w-16 h-7" />}>
            <AdminMenu />
          </Suspense>
        )}

        {/* User Avatar - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-1.5 p-1 rounded-full bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
          <Avatar className="h-5 w-5">
            <AvatarImage src={profilePhoto || undefined} alt={displayName} />
            <AvatarFallback className="text-[10px] bg-gradient-to-r from-blue-600 to-violet-600 text-white">
              {initials}
            </AvatarFallback>
          </Avatar>
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
