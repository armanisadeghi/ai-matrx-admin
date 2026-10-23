"use client";

import { Atom, ImageIcon } from "lucide-react";
import { PlusTapButton } from "@ai-matrx/design-system/tap-target/buttons";
import { DerivedBreadcrumb } from "@/features/shell/breadcrumbs/DerivedBreadcrumb";
import {
  RouteModeNav,
  type RouteNavItem,
} from "@/features/shell/components/header/RouteModeNav";
import RouteHeader from "@/features/shell/components/header/RouteHeader";

const IMAGE_MODE_ITEMS: RouteNavItem[] = [
  {
    name: "Manager",
    href: "/images/manager",
    icon: ImageIcon,
    description: "Browse, organize, upload, and manage visual assets.",
  },
  {
    name: "Studio",
    href: "/images/studio",
    icon: Atom,
    description: "Create, edit, annotate, and transform images.",
  },
];

/**
 * The /images header on the shared RouteHeader: the trail ellipsizes, the
 * Manager/Studio switch steps down (full → icons → menu) by the main column's
 * width, and Upload (the one action) stays — so the
 * row fits beside an open canvas instead of scrolling under its clip.
 */
export function ImagesListHeader() {
  return (
    <RouteHeader
      // The derived trail (Images › <tool ▾>): every level a link, the tool crumb opens the other
      // tools (features/shell/FEATURE.md § Every crumb is a door).
      left={<DerivedBreadcrumb className="pl-1" />}
      center={<RouteModeNav items={IMAGE_MODE_ITEMS} />}
      // Studio is a mode in the nav — ONE control per choice (a second
      // "Studio" button here pushed the nav out of a narrow row).
      right={<PlusTapButton href="/images/upload" ariaLabel="Upload image" />}
    />
  );
}
