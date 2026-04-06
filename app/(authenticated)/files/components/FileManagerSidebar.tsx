"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { getRoutesByCategory, type FileRoute } from "../file-routes.config";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Loader2 } from "lucide-react";

const groups: {
  label: string;
  key: keyof ReturnType<typeof getRoutesByCategory>;
}[] = [
  { label: "Overview", key: "overview" },
  { label: "File Types", key: "fileTypes" },
  { label: "Buckets", key: "buckets" },
  { label: "Special", key: "special" },
];

export function FileManagerSidebar() {
  const router = useRouter();
  const pathname = usePathname();
  const routes = getRoutesByCategory();
  const [, startTransition] = useTransition();
  const [navigatingHref, setNavigatingHref] = useState<string | null>(null);

  const handleNavigate = (href: string, e?: React.MouseEvent) => {
    if (e && (e.metaKey || e.ctrlKey)) return;
    e?.preventDefault();
    if (navigatingHref || pathname === href) return;
    setNavigatingHref(href);
    startTransition(() => {
      router.push(href);
    });
  };

  return (
    <aside className="hidden md:flex w-40 shrink-0 border-r border-border/60 bg-muted/30 flex-col h-full">
      <ScrollArea className="h-full w-full">
        <nav>
          {groups.map((group, i) => {
            const items = routes[group.key] as FileRoute[];
            if (!items.length) return null;

            return (
              <div key={group.key}>
                <div
                  className={cn(
                    "px-3 pt-3 pb-1 text-[10px] font-medium uppercase tracking-wider text-muted-foreground/70",
                    i > 0 && "border-t border-border/40",
                  )}
                >
                  {group.label}
                </div>
                {items.map((route) => {
                  const Icon = route.icon;
                  const isActive = pathname === route.href;
                  const isNavigating = navigatingHref === route.href;
                  const isDisabled = navigatingHref !== null;

                  return (
                    <Link
                      key={route.href}
                      href={route.href}
                      onClick={(e) => handleNavigate(route.href, e)}
                      aria-disabled={isDisabled && !isNavigating}
                      className={cn(
                        "flex items-center gap-2 px-3 py-1.5 transition-colors text-xs",
                        "hover:bg-muted/80",
                        isActive
                          ? "bg-accent text-accent-foreground font-medium"
                          : "text-muted-foreground hover:text-foreground",
                        isDisabled &&
                          !isNavigating &&
                          "opacity-60 pointer-events-none",
                      )}
                    >
                      {isNavigating ? (
                        <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin" />
                      ) : (
                        <Icon
                          className={cn(
                            "h-3.5 w-3.5 shrink-0",
                            isActive ? "text-primary" : "text-muted-foreground",
                          )}
                        />
                      )}
                      <span className="truncate">{route.label}</span>
                    </Link>
                  );
                })}
              </div>
            );
          })}
        </nav>
      </ScrollArea>
    </aside>
  );
}
