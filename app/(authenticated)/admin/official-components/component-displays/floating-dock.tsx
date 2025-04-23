'use client';

import React from 'react';
import { FloatingDock } from '@/components/ui/floating-dock';
import { Home, Users, Settings, Bell, Mail, Calendar, FileText, Search } from 'lucide-react';
import { ComponentEntry } from '../component-list';

interface ComponentDisplayProps {
  component?: ComponentEntry;
}

export default function FloatingDockDisplay({ component }: ComponentDisplayProps) {
  // Sample items for the dock
  const dockItems = [
    { title: 'Home', icon: <Home className="h-5 w-5" />, href: '#' },
    { title: 'Users', icon: <Users className="h-5 w-5" />, href: '#' },
    { title: 'Notifications', icon: <Bell className="h-5 w-5" />, href: '#' },
    { title: 'Messages', icon: <Mail className="h-5 w-5" />, href: '#' },
    { title: 'Calendar', icon: <Calendar className="h-5 w-5" />, href: '#' },
    { title: 'Documents', icon: <FileText className="h-5 w-5" />, href: '#' },
    { title: 'Search', icon: <Search className="h-5 w-5" />, href: '#' },
    { title: 'Settings', icon: <Settings className="h-5 w-5" />, href: '#' },
  ];

  return (
    <div className="space-y-12">
      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Basic Usage</h3>
        <p className="text-gray-700 dark:text-gray-300 mb-8">
          The Floating Dock component provides an interactive navigation dock that adapts to different screen sizes.
          On desktop, it expands icons on hover, and on mobile, it collapses into a dropdown.
        </p>
        
        <div className="relative h-80 border border-zinc-200 dark:border-zinc-800 rounded-lg overflow-hidden bg-gray-50 dark:bg-zinc-900 p-4">
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-full max-w-md">
            <FloatingDock 
              items={dockItems.slice(0, 5)} 
              desktopClassName="shadow-md border border-zinc-200 dark:border-zinc-800"
              mobileClassName="bottom-0 right-4 fixed"
            />
          </div>
          <div className="text-sm text-center text-gray-500 dark:text-gray-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2">
            ↓ Dock positioned at the bottom ↓
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Desktop Features</h3>
        <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
          <li>Interactive scaling effect when hovering over icons</li>
          <li>Tooltip showing the title of each item on hover</li>
          <li>Horizontal layout optimized for desktop navigation</li>
          <li>Smooth animations powered by Framer Motion</li>
        </ul>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Mobile Features</h3>
        <ul className="list-disc pl-5 space-y-2 text-gray-700 dark:text-gray-300">
          <li>Compact collapsed view with expandable menu</li>
          <li>Vertical layout when expanded to show all options</li>
          <li>Animated transitions when opening/closing</li>
          <li>Optimized for touch interactions</li>
        </ul>
      </div>

      <div className="space-y-2 mt-8 pt-4 border-t border-zinc-200 dark:border-zinc-800">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Props Reference</h3>
        <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-md">
          <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
{`
interface FloatingDockProps {
  items: {
    title: string;        // Label text for the item
    icon: React.ReactNode; // Icon component to display
    href: string;         // Link destination
  }[];
  desktopClassName?: string; // Additional CSS classes for desktop view
  mobileClassName?: string;  // Additional CSS classes for mobile view
}
`}
          </pre>
        </div>
      </div>

      <div className="space-y-4">
        <h3 className="text-lg font-medium text-gray-800 dark:text-gray-200">Usage Example</h3>
        <div className="bg-zinc-100 dark:bg-zinc-800 p-4 rounded-md">
          <pre className="text-xs text-gray-800 dark:text-gray-200 overflow-x-auto">
{`
import { FloatingDock } from '@/components/ui/floating-dock';
import { Home, Users, Settings, Bell, Mail } from 'lucide-react';

// In your component:
const dockItems = [
  { title: 'Home', icon: <Home className="h-5 w-5" />, href: '/' },
  { title: 'Users', icon: <Users className="h-5 w-5" />, href: '/users' },
  { title: 'Notifications', icon: <Bell className="h-5 w-5" />, href: '/notifications' },
  { title: 'Messages', icon: <Mail className="h-5 w-5" />, href: '/messages' },
  { title: 'Settings', icon: <Settings className="h-5 w-5" />, href: '/settings' },
];

return (
  <FloatingDock 
    items={dockItems} 
    desktopClassName="fixed bottom-4 left-1/2 -translate-x-1/2"
    mobileClassName="fixed bottom-4 right-4"
  />
);
`}
          </pre>
        </div>
      </div>
    </div>
  );
} 