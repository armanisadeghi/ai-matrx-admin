"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  User,
  Settings as SettingsIcon,
  Building2,
  Chrome,
  Mic,
  FileText,
  MessageSquareMore,
  Plug,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ScrollArea } from "@/components/ui/scroll-area";
import { MobileDock, type DockItem } from "@/components/navigation/MobileDock";

interface SettingsNavItem {
  title: string;
  href: string;
  icon: React.ReactNode;
  IconComp: LucideIcon;
}

const settingsNavItems: SettingsNavItem[] = [
  {
    title: "Profile",
    href: "/settings/profile",
    icon: <User className="h-3.5 w-3.5" />,
    IconComp: User,
  },
  {
    title: "Preferences",
    href: "/settings/preferences",
    icon: <SettingsIcon className="h-3.5 w-3.5" />,
    IconComp: SettingsIcon,
  },
  {
    title: "Templates",
    href: "/settings/content-templates",
    icon: <FileText className="h-3.5 w-3.5" />,
    IconComp: FileText,
  },
  {
    title: "Voice & Mic",
    href: "/settings/voice",
    icon: <Mic className="h-3.5 w-3.5" />,
    IconComp: Mic,
  },
  {
    title: "Integrations",
    href: "/settings/integrations",
    icon: <Plug className="h-3.5 w-3.5" />,
    IconComp: Plug,
  },
  {
    title: "Orgs",
    href: "/settings/organizations",
    icon: <Building2 className="h-3.5 w-3.5" />,
    IconComp: Building2,
  },
  {
    title: "Feedback",
    href: "/settings/feedback",
    icon: <MessageSquareMore className="h-3.5 w-3.5" />,
    IconComp: MessageSquareMore,
  },
  {
    title: "Extension",
    href: "/settings/extension",
    icon: <Chrome className="h-3.5 w-3.5" />,
    IconComp: Chrome,
  },
];

const settingsDockItems: DockItem[] = settingsNavItems.map((item) => ({
  key: item.href,
  label: item.title,
  icon: item.IconComp,
  href: item.href,
}));

function SettingsNavigation() {
  const pathname = usePathname();

  return (
    <nav>
      <div className="py-1">
        {settingsNavItems.map((item) => {
          const isActive =
            pathname === item.href || pathname?.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-2 px-3 py-1.5 transition-colors text-xs",
                "hover:bg-muted/80",
                isActive
                  ? "bg-accent text-accent-foreground font-medium"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              <span
                className={cn(
                  "shrink-0",
                  isActive ? "text-primary" : "text-muted-foreground",
                )}
              >
                {item.icon}
              </span>
              <span className="truncate">{item.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export default function SettingsLayoutClient({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="h-page w-full flex flex-col bg-transparent">
      <div className="flex flex-1 overflow-hidden bg-transparent">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex w-36 shrink-0 border-r border-border/60 bg-muted/30">
          <ScrollArea className="h-full w-full">
            <SettingsNavigation />
          </ScrollArea>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-h-0 overflow-y-auto bg-transparent">
          {children}
        </main>
      </div>

      <MobileDock items={settingsDockItems} />
    </div>
  );
}
