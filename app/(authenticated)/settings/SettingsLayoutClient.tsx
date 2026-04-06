'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { User, Settings as SettingsIcon, Building2, Chrome, Mic, FileText, MessageSquareMore, Plug, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { MobileDock, type DockItem } from '@/components/navigation/MobileDock';

// ─── Settings nav items ───────────────────────────────────────────────────────

interface SettingsNavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  IconComp: LucideIcon;
  description: string;
}

const settingsNavItems: SettingsNavItem[] = [
  {
    title: 'Profile',
    href: '/settings/profile',
    icon: <User className="h-4 w-4" />,
    IconComp: User,
    description: 'Manage your personal information',
  },
  {
    title: 'Preferences',
    href: '/settings/preferences',
    icon: <SettingsIcon className="h-4 w-4" />,
    IconComp: SettingsIcon,
    description: 'Customize your app experience',
  },
  {
    title: 'Templates',
    href: '/settings/content-templates',
    icon: <FileText className="h-4 w-4" />,
    IconComp: FileText,
    description: 'Manage your message templates',
  },
  {
    title: 'Voice & Mic',
    href: '/settings/voice',
    icon: <Mic className="h-4 w-4" />,
    IconComp: Mic,
    description: 'Test and troubleshoot voice input',
  },
  {
    title: 'Integrations',
    href: '/settings/integrations',
    icon: <Plug className="h-4 w-4" />,
    IconComp: Plug,
    description: 'Manage MCP server connections',
  },
  {
    title: 'Orgs',
    href: '/settings/organizations',
    icon: <Building2 className="h-4 w-4" />,
    IconComp: Building2,
    description: 'Manage your organizations',
  },
  {
    title: 'Feedback',
    href: '/settings/feedback',
    icon: <MessageSquareMore className="h-4 w-4" />,
    IconComp: MessageSquareMore,
    description: 'Track your bug reports and feature requests',
  },
  {
    title: 'Extension',
    href: '/settings/extension',
    icon: <Chrome className="h-4 w-4" />,
    IconComp: Chrome,
    description: 'Chrome extension settings',
  },
];

// Map to DockItem format for MobileDock
const settingsDockItems: DockItem[] = settingsNavItems.map(item => ({
  key: item.href,
  label: item.title,
  icon: item.IconComp,
  href: item.href,
}));

// ─── Desktop sidebar navigation ────────────────────────────────────────────────

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
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <span className={cn('flex-shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')}>
              {item.icon}
            </span>
            <span className="truncate">{item.title}</span>
          </Link>
        );
      })}
    </nav>
  );
}

// ─── Layout ───────────────────────────────────────────────────────────────────

export default function SettingsLayoutClient({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-page w-full flex flex-col bg-transparent">
      <div className="flex flex-1 overflow-hidden bg-transparent">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-52 flex-shrink-0 border-r border-border bg-card overflow-y-auto">
          <div className="p-3 w-full">
            <SettingsNavigation />
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-h-0 bg-transparent">
          {children}
        </main>
      </div>

      {/* Mobile bottom dock — 7 items → 4 visible + "…" drawer for the rest */}
      <MobileDock items={settingsDockItems} />
    </div>
  );
}
