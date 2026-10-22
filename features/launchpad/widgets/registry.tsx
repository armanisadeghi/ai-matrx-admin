// features/launchpad/widgets/registry.tsx — THE ONE LAUNCHPAD WIDGET REGISTRY: each catalog entry with its body.
// A body reads through its feature's own existing hook or service (no new data paths). The Start page's nine
// widgets were adapted into this registry (their bodies moved here); Applets, launchpad links and any app page
// (the Board's Page item) joined them; lane U folded in records-ui dashboards and EVERY Board item type
// (`board_item`: the type's own Body for a saved record); lane W added any kind (`kind`, the ONE kind pipeline)
// and a Space page (`space_page`, the Spaces editor through its fence door).
import type { ComponentType } from "react";
import { LAUNCHPAD_WIDGET_CATALOG } from "./catalog";
import type { LaunchpadWidgetBodyProps, LaunchpadWidgetType } from "./types";
import { KpisWidget } from "./bodies/KpisWidget";
import { MetricWidget } from "./bodies/MetricWidget";
import { RecentWidget } from "./bodies/RecentWidget";
import { TasksWidget } from "./bodies/TasksWidget";
import { AgendaWidget } from "./bodies/AgendaWidget";
import { FavoritesWidget } from "./bodies/FavoritesWidget";
import { AgentsWidget } from "./bodies/AgentsWidget";
import { PageWidget } from "./bodies/PageWidget";
import { TableWidget } from "./bodies/TableWidget";
import { AppletWidget } from "./bodies/AppletWidget";
import { LaunchpadLinkWidget } from "./bodies/LaunchpadLinkWidget";
import { AppPageWidget } from "./bodies/AppPageWidget";
import { MeetMatrxWidget } from "./bodies/MeetMatrxWidget";
import { DashboardWidget } from "./bodies/DashboardWidget";
import { BoardItemWidget } from "./bodies/BoardItemWidget";
import { KindWidget } from "./bodies/KindWidget";
import { SpacePageWidget } from "./bodies/SpacePageWidget";

const BODIES: Record<string, ComponentType<LaunchpadWidgetBodyProps>> = {
  kpis: KpisWidget,
  metric: MetricWidget,
  recent: RecentWidget,
  tasks: TasksWidget,
  agenda: AgendaWidget,
  favorites: FavoritesWidget,
  agents: AgentsWidget,
  page: PageWidget,
  table: TableWidget,
  applet: AppletWidget,
  launchpad_link: LaunchpadLinkWidget,
  app_page: AppPageWidget,
  meet_matrx: MeetMatrxWidget,
  records_dashboard: DashboardWidget,
  board_item: BoardItemWidget,
  kind: KindWidget,
  space_page: SpacePageWidget,
};

export const LAUNCHPAD_WIDGETS: readonly LaunchpadWidgetType[] = LAUNCHPAD_WIDGET_CATALOG.flatMap((spec) => {
  const Body = BODIES[spec.type];
  return Body ? [{ ...spec, Body }] : [];
});

/** Catalog types with no body (the guard test asserts this is empty). */
export const LAUNCHPAD_WIDGETS_WITHOUT_BODY = LAUNCHPAD_WIDGET_CATALOG.filter((s) => !BODIES[s.type]).map((s) => s.type);

export function getLaunchpadWidgetType(type: string): LaunchpadWidgetType | undefined {
  return LAUNCHPAD_WIDGETS.find((w) => w.type === type);
}
