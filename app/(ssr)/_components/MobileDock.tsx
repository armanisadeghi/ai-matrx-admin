// MobileDock.tsx — Server component for iOS-style bottom navigation dock
// Uses next/link for client-side transitions (shell stays mounted)
// Strictly 6 primary route icons, no text

import Link from "next/link";
import ShellIcon from "./ShellIcon";
import { dockItems } from "../nav-data";

interface MobileDockProps {
  pathname: string;
}

export default function MobileDock({ pathname }: MobileDockProps) {
  const isActive = (href: string) => {
    if (href === "/ssr/dashboard") {
      return pathname === "/ssr/dashboard" || pathname === "/ssr";
    }
    return pathname.startsWith(href);
  };

  return (
    <nav className="shell-dock shell-glass-dock" aria-label="Quick navigation">
      {dockItems.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={`shell-dock-item ${active ? "shell-dock-item-active" : ""}`}
            style={active ? { viewTransitionName: "shell-dock-pill" } : undefined}
            aria-label={item.label}
            aria-current={active ? "page" : undefined}
          >
            <ShellIcon name={item.iconName} size={22} strokeWidth={1.75} />
          </Link>
        );
      })}
    </nav>
  );
}
