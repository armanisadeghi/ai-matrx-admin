import { readdir } from "fs/promises";
import { join } from "path";
import Link from "next/link";
import { formatTitleCase } from "@/utils/text/text-case-converter";
import { ChevronRight, FolderOpen } from "lucide-react";

async function getDemoRoutes(dir: string, baseRoute: string = ""): Promise<string[]> {
  const routes: string[] = [];

  try {
    const entries = await readdir(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const routePath = baseRoute ? `${baseRoute}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        const subRoutes = await getDemoRoutes(fullPath, routePath);
        routes.push(...subRoutes);
      } else if (entry.name === "page.tsx" && baseRoute) {
        routes.push(baseRoute);
      }
    }
  } catch (error) {
    console.error(`Error reading directory ${dir}:`, error);
  }

  return routes;
}

function groupRoutes(routes: string[]): Record<string, string[]> {
  const groups: Record<string, string[]> = {};

  for (const route of routes) {
    const parts = route.split("/");
    // Top-level routes (no slash) go into their own single-item group
    const groupKey = parts.length > 1 ? parts[0] : "__root__";
    if (!groups[groupKey]) groups[groupKey] = [];
    groups[groupKey].push(route);
  }

  return groups;
}

function formatSegment(segment: string): string {
  return formatTitleCase(segment);
}

function getRouteLabel(route: string, groupKey: string): string {
  if (groupKey === "__root__") return formatSegment(route);
  // Strip the group prefix so we only show the child path
  const parts = route.split("/");
  const childParts = parts.slice(1);
  return childParts.length > 0
    ? childParts.map(formatSegment).join(" / ")
    : formatSegment(parts[0]);
}

export default async function DemosPage() {
  const demosDir = join(process.cwd(), "app", "(public)", "demos");
  const routes = await getDemoRoutes(demosDir);
  routes.sort();

  const groups = groupRoutes(routes);
  const sortedGroupKeys = Object.keys(groups).sort((a, b) => {
    if (a === "__root__") return -1;
    if (b === "__root__") return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="h-[calc(100dvh-var(--header-height))] overflow-y-auto bg-textured">
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">Demos</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {routes.length} demo pages across {sortedGroupKeys.length} groups
          </p>
        </div>

        {routes.length === 0 && (
          <p className="text-muted-foreground text-sm">No demo pages found.</p>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {sortedGroupKeys.map((groupKey) => {
            const groupRoutes = groups[groupKey];
            const isRoot = groupKey === "__root__";
            const groupLabel = isRoot ? "General" : formatSegment(groupKey);

            return (
              <div key={groupKey} className="bg-card border border-border rounded-lg overflow-hidden">
                <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
                  <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    {groupLabel}
                  </span>
                  <span className="ml-auto text-xs text-muted-foreground/60">
                    {groupRoutes.length}
                  </span>
                </div>
                <div className="divide-y divide-border/60">
                  {groupRoutes.map((route) => (
                    <Link key={route} href={`/demos/${route}`}>
                      <div className="flex items-center justify-between px-3 py-2 hover:bg-accent/50 transition-colors group">
                        <span className="text-sm font-medium group-hover:text-primary transition-colors truncate">
                          {getRouteLabel(route, groupKey)}
                        </span>
                        <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 ml-2" />
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

