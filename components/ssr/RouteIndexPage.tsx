import Link from "next/link";
import { formatTitleCase } from "@/utils/text/text-case-converter";
import { ChevronRight, FolderOpen, LayoutGrid } from "lucide-react";
import {
  scanRoutes,
  scanRoutesShallow,
  groupRoutes,
  getRouteLabel,
  sortGroupKeys,
} from "@/utils/route-discovery";

interface RouteIndexPageProps {
  directory: string;
  basePath: string;
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  shallow?: boolean;
  columns?: 1 | 2 | 3;
  children?: React.ReactNode;
}

export async function RouteIndexPage({
  directory,
  basePath,
  title,
  description,
  icon: Icon = LayoutGrid,
  shallow = false,
  columns = 3,
  children,
}: RouteIndexPageProps) {
  const routes = shallow
    ? await scanRoutesShallow(directory)
    : await scanRoutes(directory);
  routes.sort();

  const groups = groupRoutes(routes);
  const sortedGroupKeys = sortGroupKeys(Object.keys(groups));
  const hasGroups = sortedGroupKeys.length > 1 || !groups["__root__"];

  const normalizedBase = basePath.endsWith("/") ? basePath.slice(0, -1) : basePath;

  const colsClass =
    columns === 1
      ? "grid-cols-1"
      : columns === 2
        ? "grid-cols-1 md:grid-cols-2"
        : "grid-cols-1 md:grid-cols-2 xl:grid-cols-3";

  return (
    <div className="h-[calc(100dvh-var(--header-height))] overflow-y-auto bg-textured">
      <div className="max-w-7xl mx-auto px-4 py-6">
        {(title || description) && (
          <div className="mb-6">
            {title && (
              <div className="flex items-center gap-2 mb-0.5">
                <Icon className="h-5 w-5 text-primary" />
                <h1 className="text-2xl font-bold">{title}</h1>
              </div>
            )}
            <p className="text-sm text-muted-foreground">
              {description ??
                `${routes.length} page${routes.length !== 1 ? "s" : ""} across ${sortedGroupKeys.length} group${sortedGroupKeys.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        )}

        {children}

        {routes.length === 0 && (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-8 text-center">
            <FolderOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No pages found in this directory.
            </p>
          </div>
        )}

        {hasGroups ? (
          <div className={`grid ${colsClass} gap-4`}>
            {sortedGroupKeys.map((groupKey) => {
              const groupItems = groups[groupKey];
              const isRoot = groupKey === "__root__";
              const groupLabel = isRoot ? "General" : formatTitleCase(groupKey);

              return (
                <div
                  key={groupKey}
                  className="bg-card border border-border rounded-lg overflow-hidden"
                >
                  <div className="flex items-center gap-2 px-3 py-2 bg-muted/50 border-b border-border">
                    <FolderOpen className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {groupLabel}
                    </span>
                    <span className="ml-auto text-xs text-muted-foreground/60">
                      {groupItems.length}
                    </span>
                  </div>
                  <div className="divide-y divide-border/60">
                    {groupItems.map((route) => (
                      <Link key={route} href={`${normalizedBase}/${route}`}>
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
        ) : (
          <div className="flex flex-col gap-2">
            {routes.map((route) => (
              <Link key={route} href={`${normalizedBase}/${route}`}>
                <div className="flex items-center justify-between rounded-lg border border-border bg-card px-4 py-3 hover:bg-accent/50 transition-colors group">
                  <div className="flex items-center gap-3">
                    <div className="h-2 w-2 rounded-full bg-primary/40 group-hover:bg-primary transition-colors" />
                    <span className="text-sm font-medium group-hover:text-primary transition-colors">
                      {formatTitleCase(route)}
                    </span>
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground/40 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
