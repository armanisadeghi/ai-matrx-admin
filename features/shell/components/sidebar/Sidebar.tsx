// Sidebar.tsx — Server component for desktop sidebar
// Three sections: Brand (top), Nav (middle, scrollable), Footer (bottom)
// Content-push expansion driven by CSS :has(#shell-sidebar-toggle:checked)

import NavItem from "./NavItem";
import ShellIcon from "../ShellIcon";
import SidebarContextSelector from "./SidebarContextSelector";
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
  const isActive = (item: ShellNavItem) => {
    if (item.href === "/ssr/dashboard") {
      return pathname === "/ssr/dashboard" || pathname === "/ssr";
    }
    return pathname.startsWith(item.href);
  };

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

      {/* Navigation — Self-scrolling container */}
      <nav className="shell-sidebar-nav" aria-label="Main navigation">
        <SidebarContextSelector />

        {primaryNavItems.map((item) => (
          <NavItem key={item.href} item={item} isActive={isActive(item)} />
        ))}

        {/* Admin nav items injected here by AdminNavInjector (client component) */}
        <div id="admin-nav-slot" />
      </nav>

      {/* Footer — Admin indicator (admins), Voice + Settings */}
      <div className="shell-sidebar-footer">
        <SidebarEnvToggle />
        <SidebarAdminIndicatorToggle />
        <SidebarWindowToggle />
        <SidebarNotesToggle />
        <SidebarVoicePadToggle />
        <NavItem item={settingsItem} isActive={isActive(settingsItem)} />
      </div>
    </aside>
  );
}
