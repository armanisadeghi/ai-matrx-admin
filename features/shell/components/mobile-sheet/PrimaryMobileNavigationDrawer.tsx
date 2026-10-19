"use client";

// PrimaryMobileNavigationDrawer — the mobile drawer's nav, resolved on the CLIENT from THE LAYOUT.
// The server MobileSideSheet passing the visible item list as a prop serialized the whole nav tree
// into every page's HTML (2026-10-15). The rows come from `useResolvedShellLayout`: the default menu
// (nav-data itself) or the person's / her organization's saved layout, the same rows as the sidebar.

import MobileNavigationDrawer from "./MobileNavigationDrawer";
import { navItemsForViewer, settingsItem } from "../../constants/nav-data";
import { useResolvedShellLayout } from "@/features/shell/shell-layout/useResolvedShellLayout";

export default function PrimaryMobileNavigationDrawer({ isAuthenticated }: { isAuthenticated: boolean }) {
  const layout = useResolvedShellLayout();
  return <MobileNavigationDrawer items={navItemsForViewer(layout.sidebar, isAuthenticated)} settingsItem={settingsItem} />;
}
