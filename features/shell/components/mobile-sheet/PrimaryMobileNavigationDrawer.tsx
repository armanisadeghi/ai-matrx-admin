"use client";

// PrimaryMobileNavigationDrawer — the mobile drawer's nav, resolved on the CLIENT.
// The server MobileSideSheet passing the visible item list as a prop serialized the
// whole nav tree into every page's HTML (same defect as PrimaryNavFlyoutGroup,
// 2026-10-15). The drawer already imports the nav data, so this costs no bytes.

import MobileNavigationDrawer from "./MobileNavigationDrawer";
import { navItemsForViewer, primaryNavItems, settingsItem } from "../../constants/nav-data";

export default function PrimaryMobileNavigationDrawer({ isAuthenticated }: { isAuthenticated: boolean }) {
  return <MobileNavigationDrawer items={navItemsForViewer(primaryNavItems, isAuthenticated)} settingsItem={settingsItem} />;
}
