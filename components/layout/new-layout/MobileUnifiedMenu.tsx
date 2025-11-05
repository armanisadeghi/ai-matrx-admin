'use client';

import React from 'react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Menu, Bell, Zap, Sun, Moon, MessageSquare, Crown } from 'lucide-react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ThemeSwitcherIcon } from '@/styles/themes/ThemeSwitcher';
import { NotificationDropdown } from '@/components/ui/notifications';
import { QuickActionsMenu } from '@/features/quick-actions';
import { useAppSelector } from '@/lib/redux/hooks';
import { RootState } from '@/lib/redux/store';
import { brokerSelectors } from '@/lib/redux/brokerSlice';
import { navigationLinks } from '@/constants/navigation-links';

export function MobileUnifiedMenu() {
  const router = useRouter();
  const user = useAppSelector((state: RootState) => state.user);
  const displayName = user.userMetadata.name || user.userMetadata.fullName || user.email?.split('@')[0] || 'User';
  const profilePhoto = user.userMetadata.picture || null;
  
  const userIsCreator = useAppSelector((state) => brokerSelectors.selectValue(state, 'APPLET_USER_IS_ADMIN'));
  const isAdmin = useAppSelector((state) => brokerSelectors.selectValue(state, 'GLOBAL_USER_IS_ADMIN'));
  
  // Filter to profile menu links
  const menuLinks = navigationLinks.filter((link) => link.profileMenu);

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          className="flex items-center rounded-full p-1 hover:bg-gray-100 dark:hover:bg-gray-800 transition focus:outline-none"
          aria-label="Open menu"
        >
          {profilePhoto ? (
            <div className="w-7 h-7 rounded-full overflow-hidden">
              <Image src={profilePhoto} width={28} height={28} alt={displayName} className="w-full h-full object-cover" />
            </div>
          ) : (
            <div className="w-7 h-7 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-medium">{displayName.charAt(0).toUpperCase()}</span>
            </div>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="w-64" align="end">
        {/* User info section */}
        <div className="px-3 py-3 bg-gray-50 dark:bg-gray-800/50 rounded-t-md">
          <div className="flex items-center gap-3">
            {profilePhoto ? (
              <div className="w-10 h-10 rounded-full overflow-hidden flex-shrink-0">
                <Image src={profilePhoto} width={40} height={40} alt={displayName} className="w-full h-full object-cover" />
              </div>
            ) : (
              <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                <span className="text-white text-sm font-medium">{displayName.charAt(0).toUpperCase()}</span>
              </div>
            )}
            <div className="flex flex-col min-w-0 flex-1">
              <span className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">{displayName}</span>
              <span className="text-xs text-gray-600 dark:text-gray-400 truncate">{user.email}</span>
              {userIsCreator && (
                <span className="text-xs font-medium text-amber-500 dark:text-amber-400 flex items-center mt-1">
                  <Crown size={12} className="mr-1" /> Creator
                </span>
              )}
            </div>
          </div>
        </div>
        <DropdownMenuSeparator />
        
        {/* Quick Actions - Mobile specific */}
        <div className="px-2 py-2 bg-gray-50/50 dark:bg-gray-800/30">
          <div className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-2 px-2">Quick Actions</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => router.push('/feedback')}
              className="flex items-center gap-2 px-2 py-2 text-xs rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <MessageSquare className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <span className="text-gray-700 dark:text-gray-300">Feedback</span>
            </button>
            <ThemeSwitcherIcon className="flex items-center gap-2 px-2 py-2 text-xs rounded-md hover:bg-gray-100 dark:hover:bg-gray-800 transition justify-start" />
          </div>
        </div>
        <DropdownMenuSeparator />
        
        {/* Navigation links */}
        {menuLinks.map((link) => (
          <DropdownMenuItem key={link.href} asChild>
            <Link
              href={link.href}
              className="flex items-center gap-3 w-full px-3 py-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              <div className="w-5 h-5 flex items-center justify-center text-gray-600 dark:text-gray-400">{link.icon}</div>
              <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">{link.label}</span>
            </Link>
          </DropdownMenuItem>
        ))}
        
        {/* Sign out section */}
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link
            href="/sign-out"
            className="flex items-center gap-3 w-full px-3 py-2 cursor-pointer hover:bg-red-50 dark:hover:bg-red-900/20 text-red-600 dark:text-red-400"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
              />
            </svg>
            <span className="text-sm font-medium">Sign out</span>
          </Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

