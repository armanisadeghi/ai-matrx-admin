// NavItem.tsx — Server component for sidebar navigation links
// Renders active state with View Transitions API pill

import ShellIcon from "./ShellIcon";
import type { ShellNavItem } from "../nav-data";

interface NavItemProps {
  item: ShellNavItem;
  isActive: boolean;
}

export default function NavItem({ item, isActive }: NavItemProps) {
  return (
    <a
      href={item.href}
      title={item.label}
      className={`shell-nav-item shell-tactile-subtle ${isActive ? "shell-active-pill" : ""}`}
      style={isActive ? { viewTransitionName: "shell-active-pill" } : undefined}
    >
      <span className="shell-nav-icon">
        <ShellIcon name={item.iconName} size={20} strokeWidth={1.75} />
      </span>
      <span className="shell-nav-label">{item.label}</span>
    </a>
  );
}
