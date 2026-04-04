import type { ComponentType } from "react";
import type { LucideIcon } from "lucide-react";
import { BarChart3, Code2, Settings, Terminal } from "lucide-react";
import {
  AnalyticsWindowBody,
  CodeEditorWindowBody,
  LogViewerWindowBody,
  SettingsWindowBody,
} from "./window-bodies";

export interface DemoWindowDefinition {
  title: string;
  Icon: LucideIcon;
  iconColor: string;
  Body: ComponentType;
  initialRect?: { x: number; y: number; width: number; height: number };
}

/**
 * Registry of demo-only windows that use fake placeholder bodies.
 * Real windows (Notes) are rendered directly on the page — see page.tsx.
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
    title: "Settings",
    Icon: Settings,
    iconColor: "text-zinc-400",
    Body: SettingsWindowBody,
    initialRect: { x: 960, y: 200, width: 320, height: 380 },
  },
];
