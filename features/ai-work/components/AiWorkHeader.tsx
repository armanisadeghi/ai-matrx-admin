"use client";

import {
  BookmarkCheck,
  LayoutDashboard,
  MessagesSquare,
  Plug,
  Radio,
} from "lucide-react";
import RouteHeader from "@/features/shell/components/header/RouteHeader";
import { RouteModeNav } from "@/features/shell/components/header/RouteModeNav";
import { AGENT_ICON } from "@/components/icons/domain-icons";

const AI_WORK_NAV_ITEMS = [
  {
    name: "Overview",
    href: "/work",
    icon: LayoutDashboard,
    exact: true,
  },
  {
    name: "Live",
    href: "/work/live",
    icon: Radio,
  },
  {
    name: "Start work",
    href: "/work/new",
    icon: AGENT_ICON,
  },
  {
    name: "Conversations",
    href: "/work/conversations",
    icon: MessagesSquare,
  },
  {
    name: "Saved requests",
    href: "/work/requests",
    icon: BookmarkCheck,
  },
  {
    name: "Connections",
    href: "/work/connections",
    icon: Plug,
  },
];

/**
 * One responsive shell header shared by every user-facing AI Work route. A
 * page with a selected record puts its title in `left` (beside the shell's own
 * icon) and its actions in `right` — never a second title row in the body.
 */
export function AiWorkHeader({
  left,
  right,
}: {
  left?: React.ReactNode;
  right?: React.ReactNode;
} = {}) {
  return (
    <RouteHeader
      {...(left ? { left } : {})}
      center={<RouteModeNav items={AI_WORK_NAV_ITEMS} />}
      {...(right ? { right } : {})}
    />
  );
}
