// Sidebar.tsx — Server component for desktop sidebar
// Three sections: Brand (top), Nav (middle, scrollable), Footer (bottom)
// Content-push expansion driven by CSS :has(#shell-sidebar-toggle:checked)
//
// Nav section has two containers:
//   shell-sidebar-main-nav  — standard nav items (always SSR, always in DOM)
//   shell-sidebar-route-nav — route-specific menu (client island, Large Routes)
// data-sidebar-view on <nav> controls which is visible (default: "main").

import NavItem from "./NavItem";
import NavItemGroup from "./NavItemGroup";
import RouteMenuSlot from "./RouteMenuSlot";
import ShellIcon from "../ShellIcon";
import DirectContextSelection from "./DirectContextSelection";
import SidebarNotesToggle from "@/features/notes/actions/SidebarNotesToggle";
import SidebarVoicePadToggle from "../controls/SidebarVoicePadToggle";
import SidebarAdminIndicatorToggle from "../controls/SidebarAdminIndicatorToggle";
import SidebarEnvToggle from "../controls/SidebarEnvToggle";
import SidebarWindowToggle from "@/features/window-panels/SidebarWindowToggle";
import {
  primaryNavItems,
  settingsItem,
  type ShellNavItem,
} from "../../constants/nav-data";

interface SidebarProps {
  pathname: string;
}

export default function Sidebar({ pathname }: SidebarProps) {
  return (
    <aside className="shell-sidebar">
      {/* Brand Section — Toggle icon stays in place */}
      <div className="shell-sidebar-brand">
        <label
          htmlFor="shell-sidebar-toggle"
          className="shell-sidebar-brand-toggle shell-tactile"
          aria-label="Toggle sidebar"
        >
          <ShellIcon name="PanelLeft" size={18} strokeWidth={1.75} />
        </label>
      </div>

      {/* Navigation — Self-scrolling container with dual-view support */}
      <nav
        className="shell-sidebar-nav"
        aria-label="Main navigation"
        data-sidebar-view="main"
      >
        {/* Route menu switch + content — client island, renders nothing on Small/Medium routes */}
        <RouteMenuSlot />

        {/* Standard nav — always server-rendered */}
        <div className="shell-sidebar-main-nav">
          <DirectContextSelection />

          {primaryNavItems.map((item) =>
            item.children ? (
              <NavItemGroup key={item.href} item={item} />
            ) : (
              <NavItem key={item.href} item={item} />
            ),
          )}

          {/* Admin nav items injected here by AdminNavInjector (client component) */}
          <div id="admin-nav-slot" />
        </div>

        {/* Route menu — populated by RouteMenuSlot client island */}
        <div className="shell-sidebar-route-nav" />
      </nav>

      {/* Footer — Admin indicator (admins), Voice + Settings */}
      <div className="shell-sidebar-footer">
        <SidebarEnvToggle />
        <SidebarAdminIndicatorToggle />
        <SidebarWindowToggle />
        <SidebarNotesToggle />
        <SidebarVoicePadToggle />
        <NavItem item={settingsItem} />
      </div>
    </aside>
  );
}
