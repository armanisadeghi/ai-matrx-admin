/**
 * features/files/components/surfaces/dropbox/IconRail.tsx
 *
 * Slim left icon rail — the outermost nav column in the Dropbox shell.
 * Four primary anchors: Home (all files), Folders (tree view), Activity
 * (placeholder), and More (placeholder for future items).
 *
 * Rendered outside the resizable group so it keeps a fixed width and never
 * collapses. Active state mirrors the selected section.
 */

"use client";

import Link from "next/link";
import { Activity, FolderTree, Home, MoreHorizontal } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import type { CloudFilesSection } from "./section";

export interface IconRailProps {
  section: CloudFilesSection;
  className?: string;
}

interface RailItem {
  key: CloudFilesSection | "more";
  href?: string;
  label: string;
  icon: LucideIcon;
  disabled?: boolean;
}

const ITEMS: RailItem[] = [
  { key: "all", href: "/cloud-files", label: "Home", icon: Home },
  {
    key: "folders",
    href: "/cloud-files/folders",
    label: "Folders",
    icon: FolderTree,
  },
  {
    key: "activity",
    href: "/cloud-files/activity",
    label: "Activity",
    icon: Activity,
  },
  { key: "more", label: "More", icon: MoreHorizontal, disabled: true },
];

export function IconRail({ section, className }: IconRailProps) {
  return (
    <nav
      aria-label="Cloud files primary"
      className={cn(
        "flex w-[60px] shrink-0 flex-col items-center gap-1 border-r bg-background py-3",
        className,
      )}
    >
      {ITEMS.map((item) => {
        const active =
          item.key === section || (item.key === "all" && section === "folders-root");
        const Icon = item.icon;
        const content = (
          <span
            aria-label={item.label}
            title={item.label}
            className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg text-muted-foreground transition",
              "hover:bg-accent hover:text-foreground",
              active && "bg-accent text-foreground ring-1 ring-border",
              item.disabled && "pointer-events-none opacity-40",
            )}
          >
            <Icon className="h-5 w-5" aria-hidden="true" />
            <span className="sr-only">{item.label}</span>
          </span>
        );
        return item.href && !item.disabled ? (
          <Link key={item.key} href={item.href}>
            {content}
          </Link>
        ) : (
          <div key={item.key}>{content}</div>
        );
      })}
    </nav>
  );
}
