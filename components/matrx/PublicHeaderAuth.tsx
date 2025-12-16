'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { LayoutDashboard, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';
import { cn } from '@/lib/utils';

export function PublicHeaderAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Check auth status AFTER page load (non-blocking)
    const checkAuth = async () => {
      try {
        const supabase = createClient();
        const { data: { user } } = await supabase.auth.getUser();
        setUser(user);
      } catch (error) {
        console.error('Error checking auth status:', error);
      } finally {
        setLoading(false);
      }
    };

    // Small delay to ensure page renders first
    const timer = setTimeout(checkAuth, 100);
    return () => clearTimeout(timer);
  }, []);

  // Show minimal loading state to avoid layout shift
  if (loading) {
    return (
      <Button
        variant="ghost"
        size="sm"
        className="h-7 gap-1.5 px-2 text-xs opacity-50 cursor-default"
        disabled
      >
        <LogIn className="h-3.5 w-3.5" />
        <span className="hidden sm:inline">Sign In</span>
      </Button>
    );
  }

  // If authenticated, show compact user info + dashboard button
  if (user) {
    const displayName = 
      user.user_metadata?.full_name || 
      user.user_metadata?.name || 
      (user.email ? user.email.split('@')[0] : 'User');
    
    const initials = displayName
      .split(' ')
      .map(n => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);

    return (
      <div className="flex items-center gap-1.5">
        {/* User Avatar - Hidden on mobile */}
        <div className="hidden md:flex items-center gap-1.5 px-2 py-1 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
          <Avatar className="h-5 w-5">
            <AvatarImage src={user.user_metadata?.avatar_url} alt={displayName} />
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

  // If not authenticated, show sign in button
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

