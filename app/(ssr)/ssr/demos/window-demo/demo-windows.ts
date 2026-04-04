import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { BarChart3, Code2, FileText, Settings, Terminal } from "lucide-react";
import {
  AnalyticsWindowBody,
  CodeEditorWindowBody,
  LogViewerWindowBody,
  NotesWindowBody,
  SettingsWindowBody,
} from "./window-bodies";

export interface DemoWindowDefinition {
  title: string;
  Icon: LucideIcon;
  /** Toolbar icon color (Tailwind class, e.g. `text-blue-500`) */
  iconColor: string;
  Body: ComponentType;
  initialRect?: { x: number; y: number; width: number; height: number };
}

/**
 * Registry: swap any `Body` import to a real screen for integration testing.
 * IDs are derived at runtime as `window-${index}` to match toolbar order.
 */
export const DEMO_WINDOWS: DemoWindowDefinition[] = [
  {
    title: "Code Editor",
    Icon: Code2,
    iconColor: "text-blue-500",
    Body: CodeEditorWindowBody,
    initialRect: { x: 80, y: 80, width: 520, height: 380 },
  },
  {
    title: "Log Viewer",
    Icon: Terminal,
    iconColor: "text-emerald-500",
    Body: LogViewerWindowBody,
    initialRect: { x: 640, y: 80, width: 480, height: 300 },
  },
  {
    title: "Analytics",
    Icon: BarChart3,
    iconColor: "text-violet-500",
    Body: AnalyticsWindowBody,
    initialRect: { x: 80, y: 500, width: 440, height: 320 },
  },
  {
    title: "Notes",
    Icon: FileText,
    iconColor: "text-amber-500",
    Body: NotesWindowBody,
    initialRect: { x: 560, y: 420, width: 360, height: 280 },
  },
  {
    title: "Settings",
    Icon: Settings,
    iconColor: "text-zinc-400",
    Body: SettingsWindowBody,
    initialRect: { x: 960, y: 200, width: 320, height: 380 },
  },
];
