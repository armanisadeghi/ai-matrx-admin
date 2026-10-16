import { Activity, FlaskConical, Pencil, Play } from "lucide-react";
import type { RouteNavItem } from "@/features/shell/components/header/RouteModeNav";

/**
 * The agent's sibling pages as RecordPageHeader modes — Build · Run · Test ·
 * Runs, the same addresses as `getAgentModeHref` in `@ai-matrx/chat`'s
 * AgentModeController (which lists Test after Run on every other agent page).
 */
export function agentTestModes(
  basePath: string,
  agentId: string,
): RouteNavItem[] {
  const base = `${basePath}/${agentId}`;
  return [
    { name: "Build", href: `${base}/build`, icon: Pencil },
    { name: "Run", href: `${base}/run`, icon: Play, exact: true },
    { name: "Test", href: `${base}/test`, icon: FlaskConical },
    { name: "Runs", href: `${base}/runs`, icon: Activity },
  ];
}
