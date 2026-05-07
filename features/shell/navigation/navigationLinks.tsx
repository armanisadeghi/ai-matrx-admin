// UI-facing navigation links with icons — built from
// `features/shell/constants/nav-data.ts` (data-only). Import this when you need
// React nodes for sidebars/menus.

import React from "react";
import type { LucideIcon } from "lucide-react";
import {
  primaryNavItems,
  adminNavItems,
  settingsItem,
  adminItemOnSurface,
  type AdminNavSurface,
  type ShellNavItem,
} from "@/features/shell/constants/nav-data";
import { shellIconComponents } from "@/features/shell/shellIconMap";
import { faviconRouteData } from "@/constants/favicon-route-data";
import type { FaviconConfig } from "@/constants/favicon-route-data";

export type { FaviconConfig, AdminNavSurface };

const iconClassName =
  "text-neutral-700 dark:text-neutral-200 h-5 w-5 flex-shrink-0";

function buildIconNode(iconName: string): React.ReactNode {
  const Icon = shellIconComponents[iconName] as LucideIcon | undefined;
  if (!Icon) return null;
  return <Icon className={iconClassName} />;
}

function faviconForHref(href: string): FaviconConfig | undefined {
  return faviconRouteData.find((e) => e.href === href)?.favicon;
}

function shellItemToNavigationLink(item: ShellNavItem): NavigationLink {
  return {
    label: item.label,
    href: item.href,
    icon: buildIconNode(item.iconName),
    section: item.section,
    category: item.category,
    profileMenu: item.profileMenu,
    dashboard: item.dashboard,
    description: item.description,
    color: item.color,
    favicon: faviconForHref(item.href),
    adminSurfaces: item.adminSurfaces,
  };
}

export interface NavigationLink {
  label: string;
  href: string;
  icon: React.ReactNode;
  section?: "primary" | "admin";
  category?: string;
  profileMenu?: boolean;
  dashboard?: boolean;
  favicon?: FaviconConfig;
  description?: string;
  color?: string;
  /** Echo of nav-data admin routing; primary links leave this unset. */
  adminSurfaces?: AdminNavSurface[];
}

const primarySidebarSource: ShellNavItem[] = [...primaryNavItems, settingsItem];

export const primaryLinks = primarySidebarSource.map(shellItemToNavigationLink);

const adminNavSidebarSource = adminNavItems.filter((item) =>
  adminItemOnSurface(item, "sidebar"),
);
const adminNavHeaderMenuSource = adminNavItems.filter((item) =>
  adminItemOnSurface(item, "headerMenu"),
);

const allAdminNavigationLinks = adminNavItems.map(shellItemToNavigationLink);

export const adminSidebarLinks = adminNavSidebarSource.map(
  shellItemToNavigationLink,
);

export const adminNavigationLinks = adminNavHeaderMenuSource.map(
  shellItemToNavigationLink,
);

export const allNavigationLinks: NavigationLink[] = [
  ...primaryNavItems.map(shellItemToNavigationLink),
  shellItemToNavigationLink(settingsItem),
  ...allAdminNavigationLinks,
];

export const profileMenuLinks = allNavigationLinks.filter(
  (link) => link.profileMenu === true,
);

export const dashboardLinks = allNavigationLinks.filter(
  (link) => link.dashboard === true,
);

export const adminLinksByCategory = adminNavigationLinks.reduce(
  (acc, link) => {
    const category = link.category || "Other";
    if (!acc[category]) {
      acc[category] = [];
    }
    acc[category].push(link);
    return acc;
  },
  {} as Record<string, NavigationLink[]>,
);

export const navigationLinks = profileMenuLinks;
export const appSidebarLinks = primaryLinks;
