// MobileSideSheet.tsx — Server component for off-canvas mobile navigation
// Uses next/link for client-side transitions (shell stays mounted)
// CSS-driven slide from left, triggered by #shell-mobile-menu checkbox

import Link from "next/link";
import ShellIcon from "./ShellIcon";
import { primaryNavItems, adminNavItems, settingsItem, type ShellNavItem } from "../nav-data";

interface MobileSideSheetProps {
  pathname: string;
  isAdmin: boolean;
}

export default function MobileSideSheet({ pathname, isAdmin }: MobileSideSheetProps) {
  const isActive = (item: ShellNavItem) => {
    if (item.href === "/ssr/dashboard") {
      return pathname === "/ssr/dashboard" || pathname === "/ssr";
    }
    return pathname.startsWith(item.href);
  };

  return (
    <div className="shell-mobile-sheet-wrapper">
      {/* Backdrop — clicking closes the sheet */}
      <label
        htmlFor="shell-mobile-menu"
        className="shell-mobile-sheet-backdrop"
        aria-label="Close navigation menu"
      />

      {/* Sheet panel */}
      <div className="shell-mobile-sheet shell-glass-sheet">
        {/* Brand */}
        <div className="shell-mobile-sheet-brand">
          <ShellIcon name="LayoutDashboard" size={22} strokeWidth={1.75} />
          <span className="shell-mobile-sheet-brand-text">AI Matrx</span>
        </div>

        {/* Primary navigation */}
        <nav aria-label="Mobile navigation">
          {primaryNavItems.map((item) => {
            const active = isActive(item);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`shell-mobile-nav-item ${active ? "shell-mobile-nav-item-active" : ""}`}
              >
                <span className="shell-nav-icon">
                  <ShellIcon name={item.iconName} size={20} strokeWidth={1.75} />
                </span>
                <span>{item.label}</span>
              </Link>
            );
          })}

          {/* Settings */}
          <div className="shell-mobile-section-divider" />
          <Link
            href={settingsItem.href}
            className={`shell-mobile-nav-item ${isActive(settingsItem) ? "shell-mobile-nav-item-active" : ""}`}
          >
            <span className="shell-nav-icon">
              <ShellIcon name={settingsItem.iconName} size={20} strokeWidth={1.75} />
            </span>
            <span>{settingsItem.label}</span>
          </Link>

          {/* Admin section */}
          {isAdmin && adminNavItems.length > 0 && (
            <>
              <div className="shell-mobile-section-divider" />
              <div className="shell-mobile-section-label">Admin</div>
              {adminNavItems.map((item) => {
                const active = isActive(item);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`shell-mobile-nav-item ${active ? "shell-mobile-nav-item-active" : ""}`}
                  >
                    <span className="shell-nav-icon">
                      <ShellIcon name={item.iconName} size={20} strokeWidth={1.75} />
                    </span>
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </>
          )}
        </nav>
      </div>
    </div>
  );
}
