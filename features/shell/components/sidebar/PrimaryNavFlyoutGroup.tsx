"use client";

// PrimaryNavFlyoutGroup — the sidebar's primary groups, resolved on the CLIENT.
//
// The server Sidebar passes only the group's label. Passing the item and the full
// candidate list as props serialized the whole nav tree into the page once PER group:
// /chat/new shipped a 329 KB RSC block of nav data in its HTML (2026-10-15). The nav
// data is already in this island's client chunk (NavFlyoutGroup imports it), so
// resolving here costs nothing and the HTML carries a few strings instead.

import NavFlyoutGroup from "./NavFlyoutGroup";
import { navItemsForViewer, primaryNavItems, settingsItem } from "../../constants/nav-data";

export default function PrimaryNavFlyoutGroup({
  label,
  isAuthenticated,
}: {
  label: string;
  isAuthenticated: boolean;
}) {
  const visible = navItemsForViewer(primaryNavItems, isAuthenticated);
  const item = visible.find((i) => i.label === label);
  if (!item) return null;
  return <NavFlyoutGroup item={item} candidates={[...visible, settingsItem]} />;
}
