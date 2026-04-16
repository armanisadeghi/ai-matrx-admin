// route-menu-registry.ts — Maps pathname patterns to dynamically-imported
// route menu components for Large Routes.
//
// Each entry defines:
//   - pathPattern: regex tested against window.location.pathname
//   - iconName:    Lucide icon name shown on the switch button
//   - label:       accessible label for the switch button
//   - importFn:    dynamic import returning the route menu component
//
// The imported component receives: { expanded: boolean }
// where expanded comes from useSidebarExpanded().

export interface RouteMenuEntry {
  pathPattern: RegExp;
  iconName: string;
  label: string;
  importFn: () => Promise<{
    default: React.ComponentType<{ expanded: boolean }>;
  }>;
}

export const routeMenuRegistry: RouteMenuEntry[] = [
  {
    pathPattern: /^\/agents\/[^/]+\/run/,
    iconName: "Webhook",
    label: "Agent Runs",
    importFn: () =>
      import("@/features/agents/components/shell/AgentRunSidebarMenu"),
  },
];
