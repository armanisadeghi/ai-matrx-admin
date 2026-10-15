// features/spaces/data/view-icons.tsx — a database view's layouts and icon (the view tabs, the layout
// menu and the tiered breadcrumb's third tier all draw the same glyph).

import { Calendar, ClipboardList, GalleryHorizontalEnd, GanttChart, Kanban, LayoutDashboard, List, PieChart, Table2 } from "lucide-react";
import type { ReactNode } from "react";

import { SpaceIcon } from "../page/SpaceIcon";
import type { SpaceDbView, SpaceViewLayout } from "./sources";

export type Layout = SpaceViewLayout | "dashboard" | "form";

export const LAYOUTS: Array<{ id: Layout; label: string; icon: typeof Table2 }> = [
  { id: "grid", label: "Table", icon: Table2 },
  { id: "kanban", label: "Board", icon: Kanban },
  { id: "gallery", label: "Gallery", icon: GalleryHorizontalEnd },
  { id: "list", label: "List", icon: List },
  { id: "calendar", label: "Calendar", icon: Calendar },
  { id: "timeline", label: "Timeline", icon: GanttChart },
  { id: "chart", label: "Chart", icon: PieChart },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "form", label: "Form", icon: ClipboardList },
];

/** A view's icon: any Lucide name it stores ("DollarSign", "UserX") through SpaceIcon (DynamicIcon past the
 *  curated set), else its layout's glyph. */
export function viewIcon(view: Pick<SpaceDbView, "icon" | "layout">, size: number): ReactNode {
  if (view.icon) return <SpaceIcon media={{ icon: view.icon }} size={size} />;
  const layout = view.layout === ("table" as string) ? "grid" : view.layout === ("board" as string) ? "kanban" : view.layout;
  const Icon = LAYOUTS.find((l) => l.id === layout)?.icon ?? Table2;
  return <Icon size={size} strokeWidth={1.8} />;
}
