import {
  Calendar,
  BarChart3,
  MessageSquare,
  Briefcase,
  Lightbulb,
  Target,
  Users,
  FileText,
  Zap,
} from "lucide-react";
import type React from "react";
import type { ContainerDropItem, ContainerDef } from "../types";

// ---------------------------------------------------------------------------
// Icon registry — component sets can define their own
// ---------------------------------------------------------------------------

export const ICON_MAP: Record<string, React.FC<{ className?: string }>> = {
  Calendar,
  BarChart3,
  MessageSquare,
  Briefcase,
  Lightbulb,
  Target,
  Users,
  FileText,
  Zap,
};

export const ICON_OPTIONS = Object.keys(ICON_MAP);

export function resolveIcon(name: string): React.FC<{ className?: string }> {
  return ICON_MAP[name] ?? Calendar;
}

// ---------------------------------------------------------------------------
// Color system
// ---------------------------------------------------------------------------

export interface ColorTokens {
  bg: string;
  border: string;
  text: string;
  ring: string;
}

export const COLOR_MAP: Record<string, ColorTokens> = {
  blue: {
    bg: "bg-blue-100 dark:bg-blue-900/40",
    border: "border-blue-300 dark:border-blue-700",
    text: "text-blue-700 dark:text-blue-300",
    ring: "ring-blue-400",
  },
  emerald: {
    bg: "bg-emerald-100 dark:bg-emerald-900/40",
    border: "border-emerald-300 dark:border-emerald-700",
    text: "text-emerald-700 dark:text-emerald-300",
    ring: "ring-emerald-400",
  },
  amber: {
    bg: "bg-amber-100 dark:bg-amber-900/40",
    border: "border-amber-300 dark:border-amber-700",
    text: "text-amber-700 dark:text-amber-300",
    ring: "ring-amber-400",
  },
  rose: {
    bg: "bg-rose-100 dark:bg-rose-900/40",
    border: "border-rose-300 dark:border-rose-700",
    text: "text-rose-700 dark:text-rose-300",
    ring: "ring-rose-400",
  },
  violet: {
    bg: "bg-violet-100 dark:bg-violet-900/40",
    border: "border-violet-300 dark:border-violet-700",
    text: "text-violet-700 dark:text-violet-300",
    ring: "ring-violet-400",
  },
  cyan: {
    bg: "bg-cyan-100 dark:bg-cyan-900/40",
    border: "border-cyan-300 dark:border-cyan-700",
    text: "text-cyan-700 dark:text-cyan-300",
    ring: "ring-cyan-400",
  },
  orange: {
    bg: "bg-orange-100 dark:bg-orange-900/40",
    border: "border-orange-300 dark:border-orange-700",
    text: "text-orange-700 dark:text-orange-300",
    ring: "ring-orange-400",
  },
  pink: {
    bg: "bg-pink-100 dark:bg-pink-900/40",
    border: "border-pink-300 dark:border-pink-700",
    text: "text-pink-700 dark:text-pink-300",
    ring: "ring-pink-400",
  },
};

export const COLOR_OPTIONS = Object.keys(COLOR_MAP);

export function resolveColor(name: string): ColorTokens {
  return COLOR_MAP[name] ?? COLOR_MAP.blue;
}

// ---------------------------------------------------------------------------
// Default data — ready-to-use for demos
// ---------------------------------------------------------------------------

export const DEFAULT_ITEMS: ContainerDropItem[] = [
  {
    id: "item-planning",
    label: "Planning",
    iconName: "Calendar",
    color: "blue",
  },
  {
    id: "item-research",
    label: "Research",
    iconName: "BarChart3",
    color: "emerald",
  },
  {
    id: "item-communication",
    label: "Communication",
    iconName: "MessageSquare",
    color: "amber",
  },
  { id: "item-strategy", label: "Strategy", iconName: "Target", color: "rose" },
  {
    id: "item-innovation",
    label: "Innovation",
    iconName: "Lightbulb",
    color: "violet",
  },
];

export const DEFAULT_CONTAINERS: ContainerDef[] = [
  { id: "backlog", label: "Backlog" },
  { id: "in-progress", label: "In Progress" },
  { id: "completed", label: "Completed" },
];
