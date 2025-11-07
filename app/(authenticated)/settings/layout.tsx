'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Settings as SettingsIcon, Building2, Chrome, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

interface SettingsNavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  description: string;
}

const settingsNavItems: SettingsNavItem[] = [
  {
    title: 'Profile',
    href: '/settings/profile',
    icon: <User className="h-4 w-4" />,
    description: 'Manage your personal information',
  },
  {
    title: 'Preferences',
    href: '/settings/preferences',
    icon: <SettingsIcon className="h-4 w-4" />,
    description: 'Customize your app experience',
  },
  {
    title: 'Organizations',
    href: '/settings/organizations',
    icon: <Building2 className="h-4 w-4" />,
    description: 'Manage your organizations',
  },
  {
    title: 'Extension',
    href: '/settings/extension',
    icon: <Chrome className="h-4 w-4" />,
    description: 'Chrome extension settings',
  },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="h-page w-full bg-textured overflow-hidden flex flex-col">
      {/* Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <div className="px-6 py-4">
          <Link 
            href="/dashboard" 
            className="inline-flex items-center text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 mb-3 transition-colors"
          >
            <ArrowLeft size={16} className="mr-2" />
            <span className="text-sm font-medium">Back to Dashboard</span>
          </Link>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Settings</h1>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Manage your account settings and preferences
          </p>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Sidebar Navigation */}
        <aside className="w-64 flex-shrink-0 border-r border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 overflow-y-auto">
          <nav className="p-4 space-y-1">
            {settingsNavItems.map((item) => {
              const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
              
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={cn(
                    'flex items-start gap-3 px-3 py-3 rounded-lg transition-all',
                    'hover:bg-gray-50 dark:hover:bg-zinc-700/50',
                    isActive
                      ? 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                      : 'text-gray-700 dark:text-gray-300'
                  )}
                >
                  <div
                    className={cn(
                      'mt-0.5',
                      isActive
                        ? 'text-indigo-600 dark:text-indigo-400'
                        : 'text-gray-500 dark:text-gray-400'
                    )}
                  >
                    {item.icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-sm">{item.title}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                      {item.description}
                    </div>
                  </div>
                </Link>
              );
            })}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}

