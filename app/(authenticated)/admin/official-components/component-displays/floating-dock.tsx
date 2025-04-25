'use client';

import React from 'react';
import { ComponentEntry } from '../component-list';
import { ComponentDisplayWrapper } from '../component-usage';
import FloatingDock from '@/components/official/FloatingDock';
import { Home, Settings, Bell, Search, User } from 'lucide-react';

interface ComponentDisplayProps {
  component?: ComponentEntry;
}

export default function FloatingDockDisplay({ component }: ComponentDisplayProps) {
  if (!component) return null;
  
  const dockItems = [
    { label: 'Home', icon: <Home className="text-gray-700 dark:text-gray-300" />, href: '#' },
    { label: 'Search', icon: <Search className="text-gray-700 dark:text-gray-300" />, href: '#' },
    { label: 'Notifications', icon: <Bell className="text-gray-700 dark:text-gray-300" />, href: '#' },
    { label: 'Settings', icon: <Settings className="text-gray-700 dark:text-gray-300" />, href: '#' },
    { label: 'Profile', icon: <User className="text-gray-700 dark:text-gray-300" />, href: '#' },
  ];
  
  // Example code with all available props and their default values
  const code = `import FloatingDock from '@/components/official/FloatingDock';
import { Home, Settings, Bell, Search, User } from 'lucide-react';

const dockItems = [
  { 
    label: 'Home', 
    icon: <Home className="text-gray-700 dark:text-gray-300" />, 
    href: '/home' 
  },
  { 
    label: 'Search', 
    icon: <Search className="text-gray-700 dark:text-gray-300" />, 
    href: '/search' 
  },
  { 
    label: 'Notifications', 
    icon: <Bell className="text-gray-700 dark:text-gray-300" />, 
    href: '/notifications' 
  },
  { 
    label: 'Settings', 
    icon: <Settings className="text-gray-700 dark:text-gray-300" />, 
    href: '/settings' 
  },
  { 
    label: 'Profile', 
    icon: <User className="text-gray-700 dark:text-gray-300" />, 
    href: '/profile' 
  },
];

<FloatingDock
  items={dockItems}
  className=""                   // Additional classes for the dock container
  bgColorClassname="bg-zinc-100 dark:bg-zinc-850"  // Background color for the dock
  iconBgColorClassname="bg-zinc-200 dark:bg-zinc-700"  // Background color for the icons
/>`;

  return (
    <ComponentDisplayWrapper
      component={component}
      code={code}
      description="A responsive floating dock that adapts to desktop and mobile views. On desktop, it shows an interactive dock with animated icons. On mobile, it collapses to a menu button that expands to a full-screen menu."
      className="h-32 flex items-center justify-center"
    >
      <div className="w-full">
        <FloatingDock
          items={dockItems}
          bgColorClassname="bg-zinc-100 dark:bg-zinc-850"
          iconBgColorClassname="bg-zinc-200 dark:bg-zinc-700"
        />
      </div>
    </ComponentDisplayWrapper>
  );
} 