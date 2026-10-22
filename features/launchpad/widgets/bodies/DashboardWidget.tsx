"use client";

// features/launchpad/widgets/bodies/DashboardWidget.tsx — a records-ui DASHBOARD on a launchpad (lane U: the one
// widget registry folds in records-ui's blocks). The body is the canonical `DashboardCanvas` — the same charts,
// tabs and Arrange the table's own Dashboards screen has — drawn under the table's own organization.
import Link from "next/link";
import { Button } from "@ai-matrx/design-system/controls";
import { DashboardCanvas } from "@/features/data-tables/records-ui-host/recordsUiLazy";
import { useRecordsDataSource } from "@/features/data-tables/records-ui-host/recordsDataSource";
import { useObjectOrganization } from "@/features/unified-data/objectOrganization";
import { MakeMount } from "@/features/make/MakeMount";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { configText, type LaunchpadWidgetBodyProps } from "../types";

export function DashboardWidget({ config }: LaunchpadWidgetBodyProps) {
  const tableId = configText(config, "tableId");
  const dashboardId = configText(config, "dashboardId");
  const dataSource = useRecordsDataSource();
  const where = useObjectOrganization(dataSource, tableId || null);
  if (!tableId) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-2 px-3 text-center">
        <p className="text-xs text-muted-foreground">No table chosen</p>
        <Button variant="outline" asChild>
          <Link href="/data/dashboards">Your dashboards</Link>
        </Button>
      </div>
    );
  }
  if (where.state === "resolving") return <p className="px-2 text-xs text-muted-foreground">Opening the dashboard…</p>;
  if (where.state === "not-given") return <p className="px-2 text-xs text-muted-foreground">This table has not been shared with you.</p>;
  if (where.state === "unavailable")
    return (
      <p className="px-2 text-xs text-destructive">
        {where.why}
        <ErrorAlchemyMenu error={where.why} />
      </p>
    );
  return (
    <div className="h-full overflow-y-auto px-2">
      <MakeMount organizationId={where.organizationId}>
        <DashboardCanvas tableId={tableId} activeDashboardId={dashboardId || null} />
      </MakeMount>
    </div>
  );
}
