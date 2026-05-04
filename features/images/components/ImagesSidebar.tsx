'use client';
import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Images, Search, Layers, Crop } from 'lucide-react';
import { cn } from '@/lib/utils';

const NAV_ITEMS = [
  { href: '/images/manager', label: 'Manager', icon: Images },
  { href: '/images/search', label: 'Search', icon: Search },
  { href: '/images/studio', label: 'Studio', icon: Layers },
  { href: '/images/crop', label: 'Crop', icon: Crop },
] as const;

export function ImagesSidebar() {
  const pathname = usePathname();
  return (
    <nav className="w-44 shrink-0 border-r border-border flex flex-col py-3 px-2 gap-0.5">
      <p className="px-2 pb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        Images
      </p>
      {NAV_ITEMS.map(({ href, label, icon: Icon }) => (
        <Link
          key={href}
          href={href}
          className={cn(
            'flex items-center gap-2.5 rounded-md px-2 py-1.5 text-sm transition-colors',
            pathname.startsWith(href)
              ? 'bg-accent text-foreground font-medium'
              : 'text-muted-foreground hover:text-foreground hover:bg-accent/50',
          )}
        >
          <Icon className="w-4 h-4 shrink-0" />
          {label}
        </Link>
      ))}
    </nav>
  );
}
