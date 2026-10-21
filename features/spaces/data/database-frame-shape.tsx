"use client";

// features/spaces/data/database-frame-shape.tsx — ONE shape for a database block's frame, loading or live.
//
// Lane DB-BLOCK-CHROME (2026-10-19). A database block's loading boxes (the server's Suspense fallback, the
// editor's late-seed fallback, the block's own code still loading, its table's organization still resolving)
// were a bare box sized by a pixel formula: 26 px of frame padding and a 32 px view bar. Under 440 px the
// frame's padding shrinks and its bar wraps onto two lines (spaces.css), so the formula was short there, and
// the frame's own toolbar, view tabs and grid header appeared only when the live block mounted — on slow 4G
// the blocks under a database block jumped ~250 px at 375 px wide (SPACES-SHIFT-3 re-measure).
// Now the loading block IS the frame: the same elements, the same classes, the same controls in the same
// order (`frameControls`, the one decision DatabaseFrame also draws from), the real view names from the
// stored block, and records-ui's own embedded skeleton as the body. CSS sizes both the same way at every
// width, so the live mount changes nothing geometric.

import { Button } from "@ai-matrx/design-system/controls";
import { ExpectedRows, RecordsSkeleton, skeletonLayoutFor } from "@ai-matrx/records-ui/skeleton";
import { ArrowDownUp, ArrowUpRight, ChevronDown, ListFilter, Maximize2, Plus, Search, SlidersHorizontal, Zap } from "lucide-react";
import type { ReactNode } from "react";

import type { SpaceDbView } from "./sources";
import { gridBodyReservePx, reserveStyle } from "./database-body-reserve";
import { viewIcon } from "./view-icons";

/** What the person may do with the block's structure, decided before the first paint. */
export interface FrameRole {
  /** Full access / Can edit on an editable page: views, properties, automations, the title typed in place. */
  shape: boolean;
  /** A page published to the web: its rows are a read-only copy (no automations, no New). */
  published: boolean;
}

export type TabControl = "settings" | "chartTools" | "addView";
export type ToolControl = "filter" | "sort" | "automations" | "search" | "maximize" | "settings" | "new";

/**
 * THE CONTROLS A DATABASE FRAME DRAWS, IN ORDER — the one decision the live frame (DatabaseBlock
 * DatabaseFrame) and its loading shape both draw from, so a control never appears later in a slot the
 * first paint did not hold. `tools` is null for a chart (its filter and sort sit beside its title).
 */
export function frameControls(isChart: boolean, role: FrameRole): { tabs: TabControl[]; tools: ToolControl[] | null } {
  const tabs: TabControl[] = [];
  if (isChart && role.shape) tabs.push("settings");
  if (isChart) tabs.push("chartTools");
  if (role.shape && !isChart) tabs.push("addView");
  if (isChart) return { tabs, tools: null };
  const tools: ToolControl[] = ["filter", "sort"];
  if (!role.published && role.shape) tools.push("automations");
  tools.push("search", "maximize");
  if (role.shape) tools.push("settings");
  if (!role.published) tools.push("new");
  return { tabs, tools };
}

/** The block's stored views, as DatabaseFrame reads them (no views = the one "All" grid). */
export function frameViews(p: Record<string, unknown>): { views: SpaceDbView[]; active: SpaceDbView } {
  const stored = Array.isArray(p["views"]) ? (p["views"] as SpaceDbView[]).filter((v) => v && typeof v.id === "string") : [];
  const views: SpaceDbView[] = stored.length ? stored : [{ id: "view-all", name: "All", layout: "grid" }];
  const active = views.find((v) => v.id === p["activeViewId"]) ?? views[0];
  return { views, active };
}

const quiet = (icon: ReactNode, label: string) => <Button key={label} variant="quiet" icon={icon} aria-label={label} title={label} tabIndex={-1} />;
const settingsIcon = (compact: boolean) => (
  <button key="settings" type="button" className={compact ? "spaces-db-icon spaces-db-icon-sm" : "spaces-db-icon"} aria-label="View settings" tabIndex={-1}>
    <SlidersHorizontal size={compact ? 13 : 15} strokeWidth={1.8} />
  </button>
);

function Tool({ id }: { id: ToolControl }) {
  switch (id) {
    case "filter":
      return quiet(<ListFilter size={15} strokeWidth={1.8} />, "Filter");
    case "sort":
      return quiet(<ArrowDownUp size={15} strokeWidth={1.8} />, "Sort");
    case "automations":
      return quiet(<Zap size={15} strokeWidth={1.8} />, "Automations");
    case "search":
      return quiet(<Search size={15} strokeWidth={1.8} />, "Search");
    case "maximize":
      return quiet(<Maximize2 size={15} strokeWidth={1.8} />, "Open as full page");
    case "settings":
      return settingsIcon(false);
    case "new":
      // menu-parts NewButton's own markup: "New" and its templates chevron.
      return (
        <div className="spaces-db-new">
          <Button variant="quiet" tabIndex={-1}>
            New
          </Button>
          <Button variant="quiet" icon={<ChevronDown size={14} />} aria-label="Templates" tabIndex={-1} />
        </div>
      );
  }
}

/**
 * A table database block's frame while its rows load: DatabaseFrame's own chrome (title row, view tabs with
 * the stored view names, toolbar) and records-ui's embedded skeleton for the open view, painting the rows the
 * server said the person sees. Inert: nothing in it can be pressed until the live frame takes its place.
 */
export function DatabaseFrameShape({
  p,
  role,
  rows,
  groups,
  minHeight,
}: {
  p: Record<string, unknown>;
  role: FrameRole;
  /** Rows the person sees (`rows_visible`), null = not known. */
  rows: number | null;
  /** Cards per board column, when known. */
  groups?: readonly number[] | null;
  /** The size the block was last painted at (its stored paintedSize), held while nothing better is known. */
  minHeight?: number | null;
}) {
  const { views, active } = frameViews(p);
  const isChart = active.layout === "chart";
  const controls = frameControls(isChart, role);
  const reserve = reserveStyle(active.layout === "grid" ? gridBodyReservePx(rows) : null);
  const title = typeof p["title"] === "string" && p["title"] ? (p["title"] as string) : "Untitled";
  return (
    <div
      className="spaces-db-frame"
      data-layout={active.layout}
      data-frame-shape=""
      aria-busy="true"
      inert
      style={minHeight ? { minHeight } : undefined}
    >
      {p["showTitle"] !== false && !isChart ? (
        <div className="spaces-db-title">
          {p["linked"] ? <ArrowUpRight size={14} strokeWidth={2} className="spaces-db-linked" /> : null}
          <span>{title}</span>
        </div>
      ) : null}
      <div className="spaces-db-bar">
        <div className="spaces-db-tabs" role="tablist">
          {views.map((view) =>
            isChart || view.id === active.id ? (
              <button key={view.id} type="button" className={isChart ? "spaces-chart-title" : "spaces-chart-title spaces-view-pill"} role="tab" aria-selected={view.id === active.id} title={view.name} tabIndex={-1}>
                {viewIcon(view, isChart ? 16 : 14)}
                <span>{view.name}</span>
              </button>
            ) : (
              <Button key={view.id} variant="quiet" role="tab" aria-selected={false} tabIndex={-1}>
                {viewIcon(view, 14)}
                <span>{view.name}</span>
              </Button>
            ),
          )}
          {controls.tabs.map((c) =>
            c === "settings" ? (
              settingsIcon(true)
            ) : c === "chartTools" ? (
              <span key="chartTools" className="spaces-db-chart-tools">
                {quiet(<ListFilter size={15} strokeWidth={1.8} />, "Filter")}
                {quiet(<ArrowDownUp size={14} strokeWidth={1.8} />, "Sort")}
              </span>
            ) : (
              quiet(<Plus size={14} />, "Add view")
            ),
          )}
        </div>
        {controls.tools ? (
          <div className="spaces-db-tools">
            {controls.tools.map((id) => (
              <Tool key={id} id={id} />
            ))}
          </div>
        ) : null}
      </div>
      {isChart ? null : (
        <div className="spaces-db-body" {...reserve.attrs} style={reserve.style}>
          <ExpectedRows rows={rows} groups={groups ?? null}>
            <RecordsSkeleton layout={skeletonLayoutFor(active.layout)} embedded {...(rows && rows > 0 ? { rows } : {})} />
          </ExpectedRows>
        </div>
      )}
    </div>
  );
}
