'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Settings as SettingsIcon, Building2, Chrome, ArrowLeft, Menu, Mic, FileText, MessageSquareMore } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';

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
    title: 'Content Templates',
    href: '/settings/content-templates',
    icon: <FileText className="h-4 w-4" />,
    description: 'Manage your message templates',
  },
  {
    title: 'Voice & Microphone',
    href: '/settings/voice',
    icon: <Mic className="h-4 w-4" />,
    description: 'Test and troubleshoot voice input',
  },
  {
    title: 'Organizations',
    href: '/settings/organizations',
    icon: <Building2 className="h-4 w-4" />,
    description: 'Manage your organizations',
  },
  {
    title: 'My Feedback',
    href: '/settings/feedback',
    icon: <MessageSquareMore className="h-4 w-4" />,
    description: 'Track your bug reports and feature requests',
  },
  {
    title: 'Extension',
    href: '/settings/extension',
    icon: <Chrome className="h-4 w-4" />,
    description: 'Chrome extension settings',
  },
];

function SettingsNavigation({ onItemClick }: { onItemClick?: () => void }) {
  const pathname = usePathname();

  return (
    <nav className="space-y-0.5">
      {settingsNavItems.map((item) => {
        const isActive = pathname === item.href || pathname?.startsWith(item.href + '/');
        
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onItemClick}
            className={cn(
              'flex items-center gap-2.5 px-3 py-2 rounded-md transition-colors text-sm',
              'hover:bg-muted',
              isActive
                ? 'bg-primary/10 text-primary font-medium'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <span className={cn(
              'flex-shrink-0',
              isActive ? 'text-primary' : 'text-muted-foreground'
            )}>
              {item.icon}
            </span>
            <span className="truncate">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isMobile = useIsMobile();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Get current page title
  const currentPage = settingsNavItems.find(
    (item) => pathname === item.href || pathname?.startsWith(item.href + '/')
  );

  return (
    <div className="h-page w-full bg-textured overflow-hidden flex flex-col">
      {/* Compact Header */}
      <div className="flex-shrink-0 border-b border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800">
        <div className="h-12 px-3 md:px-4 flex items-center gap-3">
          {/* Back Button */}
          <Link 
            href="/dashboard" 
            className="flex items-center justify-center h-8 w-8 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
          </Link>
          
          {/* Title */}
          <h1 className="text-base font-semibold text-foreground flex-1 truncate">
            {currentPage ? currentPage.title : 'Settings'}
          </h1>
          
          {/* Mobile Menu Button */}
          {isMobile && (
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72">
                <SheetHeader>
                  <SheetTitle>Settings</SheetTitle>
                </SheetHeader>
                <div className="mt-4">
                  <SettingsNavigation onItemClick={() => setMobileMenuOpen(false)} />
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>

      {/* Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Desktop Sidebar Navigation */}
        <aside className="hidden md:flex w-52 flex-shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-3 w-full">
            <SettingsNavigation />
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>
    </div>
  );
}
