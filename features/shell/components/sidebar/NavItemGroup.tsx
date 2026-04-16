// NavItemGroup — Server Component for nav items with nested children.
//
// Collapsed sidebar: parent icon + separator line + child icons (all centered).
// Expanded sidebar: parent row, then indented children below.
//
// Active state is CSS-driven via data-pathname / data-nav-href (same as NavItem).

import Link from "next/link";
import ShellIcon from "../ShellIcon";
import type { ShellNavItem } from "../../constants/nav-data";

interface NavItemGroupProps {
  item: ShellNavItem;
}

export default function NavItemGroup({ item }: NavItemGroupProps) {
  const children = item.children ?? [];

  return (
    <div className="shell-nav-group" data-nav-group={item.href}>
      {/* Parent item */}
      <Link
        href={item.href}
        title={item.label}
        data-nav-href={item.href}
        className="shell-nav-item shell-tactile-subtle"
      >
        <span className="shell-nav-icon">
          <ShellIcon name={item.iconName} size={18} strokeWidth={1.75} />
        </span>
        <span className="shell-nav-label">{item.label}</span>
      </Link>

      {/* Child items — visible only when this group is active */}
      <div className="shell-nav-children">
        <div className="shell-nav-children-separator" />
        {children.map((child) => (
          <Link
            key={child.href}
            href={child.href}
            title={child.label}
            data-nav-href={child.href}
            data-nav-exact={child.exact ? "true" : undefined}
            className="shell-nav-child shell-tactile-subtle"
          >
            <span className="shell-nav-icon">
              <ShellIcon name={child.iconName} size={14} strokeWidth={1.75} />
            </span>
            <span className="shell-nav-label">{child.label}</span>
          </Link>
        ))}
        <div className="shell-nav-children-separator" />
      </div>
    </div>
  );
}
