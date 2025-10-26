'use client';

import React, { useState, useTransition } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';
import { getRoutesByCategory } from '../file-routes.config';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';

export function FileManagerSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const routes = getRoutesByCategory();
  const [, startTransition] = useTransition();
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);

  const handleNavigate = (href: string) => {
    if (navigatingHref || pathname === href) return; // Prevent duplicate clicks or clicking active route
    setNavigatingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <aside className="w-64 border-r bg-card flex flex-col h-full">
      <div className="p-4 border-b">
        <h2 className="text-lg font-semibold">File Manager</h2>
        <p className="text-xs text-muted-foreground mt-1">
          Manage your files and folders
        </p>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-3 space-y-6">
          {/* Overview */}
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Overview
            </h3>
            {routes.overview.map((route) => {
              const Icon = route.icon;
              const isActive = pathname === route.href;
              const isNavigating = navigatingHref === route.href;
              const isDisabled = navigatingHref !== null;
              
              return (
                <button
                  key={route.href}
                  onClick={() => handleNavigate(route.href)}
                  disabled={isDisabled}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors relative",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-accent text-muted-foreground hover:text-foreground",
                    isDisabled && !isNavigating && "opacity-60 cursor-not-allowed",
                    isDisabled && "hover:bg-transparent hover:text-muted-foreground"
                  )}
                >
                  {isNavigating ? (
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="flex-1 text-left">{route.label}</span>
                </button>
              );
            })}
          </div>

          <Separator />

          {/* File Types */}
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
              File Types
            </h3>
            {routes.fileTypes.map((route) => {
              const Icon = route.icon;
              const isActive = pathname === route.href;
              const isNavigating = navigatingHref === route.href;
              const isDisabled = navigatingHref !== null;
              
              return (
                <button
                  key={route.href}
                  onClick={() => handleNavigate(route.href)}
                  disabled={isDisabled}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors relative",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-accent text-muted-foreground hover:text-foreground",
                    isDisabled && !isNavigating && "opacity-60 cursor-not-allowed",
                    isDisabled && "hover:bg-transparent hover:text-muted-foreground"
                  )}
                >
                  {isNavigating ? (
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="flex-1 text-left">{route.label}</span>
                </button>
              );
            })}
          </div>

          <Separator />

          {/* Buckets */}
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Buckets
            </h3>
            {routes.buckets.map((route) => {
              const Icon = route.icon;
              const isActive = pathname === route.href;
              const isNavigating = navigatingHref === route.href;
              const isDisabled = navigatingHref !== null;
              
              return (
                <button
                  key={route.href}
                  onClick={() => handleNavigate(route.href)}
                  disabled={isDisabled}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors relative",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-accent text-muted-foreground hover:text-foreground",
                    isDisabled && !isNavigating && "opacity-60 cursor-not-allowed",
                    isDisabled && "hover:bg-transparent hover:text-muted-foreground"
                  )}
                >
                  {isNavigating ? (
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="flex-1 text-left">{route.label}</span>
                </button>
              );
            })}
          </div>

          <Separator />

          {/* Special */}
          <div className="space-y-1">
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider px-3 mb-2">
              Special
            </h3>
            {routes.special.map((route) => {
              const Icon = route.icon;
              const isActive = pathname === route.href;
              const isNavigating = navigatingHref === route.href;
              const isDisabled = navigatingHref !== null;
              
              return (
                <button
                  key={route.href}
                  onClick={() => handleNavigate(route.href)}
                  disabled={isDisabled}
                  className={cn(
                    "w-full flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors relative",
                    isActive
                      ? "bg-primary text-primary-foreground font-medium"
                      : "hover:bg-accent text-muted-foreground hover:text-foreground",
                    isDisabled && !isNavigating && "opacity-60 cursor-not-allowed",
                    isDisabled && "hover:bg-transparent hover:text-muted-foreground"
                  )}
                >
                  {isNavigating ? (
                    <Loader2 className="h-4 w-4 flex-shrink-0 animate-spin" />
                  ) : (
                    <Icon className="h-4 w-4 flex-shrink-0" />
                  )}
                  <span className="flex-1 text-left">{route.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      </ScrollArea>
    </aside>
  );
}

