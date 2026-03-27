import { FolderOpen, LayoutGrid } from "lucide-react";
import {
  scanRoutes,
  scanRoutesShallow,
  groupRoutes,
  sortGroupKeys,
} from "@/utils/route-discovery";
import type { RouteDisplayData, RouteDisplayVariant } from "./route-display/types";
import RouteDisplaySwitcher from "./route-display/RouteDisplaySwitcher";

interface RouteIndexPageProps {
  directory: string;
  basePath: string;
  title?: string;
  description?: string;
  icon?: React.ComponentType<{ className?: string }>;
  shallow?: boolean;
  defaultVariant?: RouteDisplayVariant;
  children?: React.ReactNode;
}

export async function RouteIndexPage({
  directory,
  basePath,
  title,
  description,
  icon: Icon = LayoutGrid,
  shallow = false,
  defaultVariant = "grouped-cards",
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

  const data: RouteDisplayData = {
    routes,
    groups,
    sortedGroupKeys,
    basePath: normalizedBase,
    title,
    description,
    hasGroups,
  };

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

        {routes.length === 0 ? (
          <div className="rounded-lg border border-border bg-muted/30 px-4 py-8 text-center">
            <FolderOpen className="h-8 w-8 text-muted-foreground/40 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">
              No pages found in this directory.
            </p>
          </div>
        ) : (
          <RouteDisplaySwitcher data={data} defaultVariant={defaultVariant} />
        )}
      </div>
    </div>
  );
}
