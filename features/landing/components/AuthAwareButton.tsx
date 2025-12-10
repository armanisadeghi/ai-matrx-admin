'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { User as UserIcon, LogIn, LayoutDashboard } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { createClient } from '@/utils/supabase/client';
import type { User } from '@supabase/supabase-js';

export function AuthAwareButton() {
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

  // Show nothing while loading to avoid layout shift
  if (loading) {
    return (
      <Button
        variant="ghost"
        size="lg"
        className="w-full sm:w-auto text-base border border-zinc-300 dark:border-zinc-700 opacity-50 cursor-default"
        disabled
      >
        <LogIn className="mr-2 h-4 w-4" />
        Sign In
      </Button>
    );
  }

  // If authenticated, show user info + dashboard button
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
      <div className="flex items-center gap-3">
        {/* User Avatar + Name */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-2 rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-200 dark:border-zinc-700">
          <Avatar className="h-6 w-6">
            <AvatarImage src={user.user_metadata?.avatar_url} alt={displayName} />
            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
              {initials}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium text-foreground">
            {displayName}
          </span>
        </div>

        {/* Dashboard Button */}
        <Button
          onClick={() => router.push('/dashboard')}
          size="lg"
          className="w-full sm:w-auto text-base bg-gradient-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700 text-white border-0 shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30 transition-all duration-300"
        >
          <LayoutDashboard className="mr-2 h-4 w-4" />
          Go to Dashboard
        </Button>
      </div>
    );
  }

  // If not authenticated, show sign in button
  return (
    <Link href="/login" className="w-full sm:w-auto">
      <Button
        variant="ghost"
        size="lg"
        className="w-full sm:w-auto text-base border border-zinc-300 dark:border-zinc-700 hover:bg-zinc-100 dark:hover:bg-zinc-800"
      >
        <LogIn className="mr-2 h-4 w-4" />
        Sign In
      </Button>
    </Link>
  );
}

