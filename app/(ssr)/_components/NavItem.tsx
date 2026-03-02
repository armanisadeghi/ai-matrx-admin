"use client";

// NavItem.tsx — Client component for sidebar navigation links
// Uses usePathname() so active state stays correct after client-side navigation
// Sidebar.tsx remains a Server Component — only the leaf links are client islands

import Link from "next/link";
import { usePathname } from "next/navigation";
import ShellIcon from "./ShellIcon";
import type { ShellNavItem } from "../nav-data";

interface NavItemProps {
  item: ShellNavItem;
  isActive?: boolean;
}

export default function NavItem({ item }: NavItemProps) {
  const pathname = usePathname();

  const active =
    item.href === "/ssr/dashboard"
      ? pathname === "/ssr/dashboard" || pathname === "/ssr"
      : pathname.startsWith(item.href);

  return (
    <Link
      href={item.href}
      title={item.label}
      className={`shell-nav-item shell-tactile-subtle ${active ? "shell-active-pill" : ""}`}
      style={active ? { viewTransitionName: "shell-active-pill" } : undefined}
    >
      <span className="shell-nav-icon">
        <ShellIcon name={item.iconName} size={18} strokeWidth={1.75} />
      </span>
      <span className="shell-nav-label">{item.label}</span>
    </Link>
  );
}
