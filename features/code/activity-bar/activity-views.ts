import {
  Files,
  Search,
  GitBranch,
  Play,
  Blocks,
  Server,
  Library,
  type LucideIcon,
} from "lucide-react";
import type { ActivityViewId } from "../types";

export interface ActivityViewDescriptor {
  id: ActivityViewId;
  label: string;
  icon: LucideIcon;
  /** Keyboard shortcut hint shown in the tooltip. */
  shortcut?: string;
}

export const ACTIVITY_VIEWS: ActivityViewDescriptor[] = [
  { id: "explorer", label: "Explorer", icon: Files, shortcut: "\u2318\u21E7E" },
  { id: "search", label: "Search", icon: Search, shortcut: "\u2318\u21E7F" },
  {
    id: "git",
    label: "Source Control",
    icon: GitBranch,
    shortcut: "\u2303\u21E7G",
  },
  { id: "run", label: "Run and Debug", icon: Play, shortcut: "\u2303\u21E7D" },
  {
    id: "extensions",
    label: "Extensions",
    icon: Blocks,
    shortcut: "\u2318\u21E7X",
  },
  { id: "sandboxes", label: "Sandboxes", icon: Server },
  { id: "library", label: "Code Library", icon: Library },
];

export function getActivityView(id: ActivityViewId): ActivityViewDescriptor {
  const view = ACTIVITY_VIEWS.find((v) => v.id === id);
  if (!view) throw new Error(`Unknown activity view: ${id}`);
  return view;
}
