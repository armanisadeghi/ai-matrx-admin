// Sidebar.tsx — Server component for desktop sidebar
// Three sections: Brand (top), Nav (middle, scrollable), Footer (bottom)
// Content-push expansion driven by CSS :has(#shell-sidebar-toggle:checked)

import NavItem from "./NavItem";
import ShellIcon from "./ShellIcon";
import { primaryNavItems, adminNavItems, settingsItem, type ShellNavItem } from "../nav-data";

interface SidebarProps {
  pathname: string;
  isAdmin: boolean;
}

export default function Sidebar({ pathname, isAdmin }: SidebarProps) {
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
          <ShellIcon name="PanelLeft" size={20} strokeWidth={1.75} />
        </label>
        <span className="shell-sidebar-brand-logo">AI Matrx</span>
      </div>

      {/* Navigation — Self-scrolling container */}
      <nav className="shell-sidebar-nav" aria-label="Main navigation">
        {primaryNavItems.map((item) => (
          <NavItem key={item.href} item={item} isActive={isActive(item)} />
        ))}

        {isAdmin && adminNavItems.length > 0 && (
          <>
            <div
              style={{
                height: 1,
                background: "var(--shell-glass-border)",
                margin: "0.5rem 0.25rem",
              }}
            />
            {adminNavItems.map((item) => (
              <NavItem key={item.href} item={item} isActive={isActive(item)} />
            ))}
          </>
        )}
      </nav>

      {/* Footer — Settings */}
      <div className="shell-sidebar-footer">
        <NavItem item={settingsItem} isActive={isActive(settingsItem)} />
      </div>
    </aside>
  );
}
