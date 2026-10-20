// MobileDockItem — one dock link (no hooks). The shell Dock's rows are `ShellDockItems` (THE LAYOUT);
// custom route docks reuse this same link shape.
//
// Renders dock links with data-nav-href on each one.
// CSS in shell.css reads .shell-root[data-pathname] to determine which
// data-nav-href matches — zero client JS, zero prop drilling.

import NavLink from "@/components/navigation/NavLink";
import ShellIcon from "../ShellIcon";
import type { ShellNavItem } from "../../constants/nav-data";
import { OutboundLink } from "@ai-matrx/kit/outbound-react";
import { shellLookRowProps, type ShellLookId } from "@/features/shell/shell-layout/looks";

/**
 * Single dock link — reusable by custom route docks. Under a Look (`look` set) the button itself is the
 * tile; without one its HTML is unchanged.
 */
export function MobileDockItem({ item, look = null }: { item: ShellNavItem; look?: ShellLookId | null }) {
  const lookProps = shellLookRowProps(look, item);
  if (item.external) {
    return (
      <OutboundLink
        href={item.href}
        className="shell-dock-item"
        aria-label={item.label}
        {...lookProps.row}
        {...lookProps.tile}
      >
        <ShellIcon name={item.iconName} size={22} strokeWidth={1.75} />
      </OutboundLink>
    );
  }

  return (
    <NavLink
      href={item.href}
      data-nav-href={item.href}
      className="shell-dock-item"
      aria-label={item.label}
      {...lookProps.row}
      {...lookProps.tile}
    >
      <ShellIcon name={item.iconName} size={22} strokeWidth={1.75} />
    </NavLink>
  );
}
