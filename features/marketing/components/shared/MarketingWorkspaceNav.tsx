"use client";

import {
  CircleDollarSign,
  ClipboardCheck,
  FileChartColumn,
  Landmark,
  Plug,
  SearchCheck,
  TrendingUp,
} from "lucide-react";
import { RouteModeNav } from "@/features/shell/components/header/RouteModeNav";
import { marketingRoutes } from "@/features/marketing/lib/routes";

export const MARKETING_WORKSPACE_ROUTES = [
  // A website belongs to a brand (Arman's ruling): there is no top-level Sites list — a brand's
  // websites live at /marketing/brands/<brand>/websites. Brands points at the list itself, no hop.
  { name: "Brands", href: marketingRoutes.brandsAll(), icon: Landmark },
  { name: "Search", href: marketingRoutes.searchConsole(), icon: SearchCheck },
  { name: "Ranks", href: marketingRoutes.ranks(), icon: TrendingUp },
  { name: "Approvals", href: marketingRoutes.approvals(), icon: ClipboardCheck },
  { name: "Connections", href: marketingRoutes.connections(), icon: Plug },
  { name: "Cost", href: marketingRoutes.cost(), icon: CircleDollarSign },
  { name: "Reports", href: marketingRoutes.reports(), icon: FileChartColumn },
];

export function MarketingWorkspaceNav() {
  return <RouteModeNav items={MARKETING_WORKSPACE_ROUTES} />;
}
