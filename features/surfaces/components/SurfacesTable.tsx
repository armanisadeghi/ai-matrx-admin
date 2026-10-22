"use client";

import { SURFACES_DRILL } from "./surfacesDrill";
import { InfoHint } from "@ai-matrx/design-system/controls";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { defineRowVerbs } from "@/lib/entity-list/rowVerbs";
import { useTableBulkSelection } from "@/lib/entity-list/useTableBulkSelection";
import { dismissRecordToasts } from "@/lib/toast";
import {
  deleteSurface,
  updateSurface,
} from "@ai-matrx/chat/surfaces/services/surfaces.service";
import {
  AppWindow,
  Eye,
  Loader2,
  Pencil,
  Power,
  PowerOff,
  Trash2,
  MoreVertical,
} from "lucide-react";
import type { ComponentType } from "react";
import {
  buildDefaultTableRowMenuDescriptor,
  createTableRowMenuDescriptor,
} from "@ai-matrx/context-menu/engine";
import { CONTEXT_MENU_ENTITY_KEY } from "@ai-matrx/context-menu/engine";
import { MatrxDataTable } from "@ai-matrx/design-system/data-table";
import type { MatrxColumnDef } from "@ai-matrx/design-system/data-table/types";
import {
  tierFor,
  type SurfaceWithStats,
} from "@ai-matrx/chat/surfaces/services/surfaces.service";
import Link from "@/components/navigation/AppLink";
import { surfaceAdminHref } from "@ai-matrx/chat/surfaces/utils/surface-hierarchy";
import type { SurfaceFleetMetric } from "@/features/surfaces/services/surface-fleet-metric";
import {
  deriveFleetReadiness,
  FLEET_READINESS_LABEL,
  FLEET_READINESS_RULE,
  FLEET_READINESS_SORT,
  readinessGaps,
} from "@/features/surfaces/utils/fleet-readiness";
import { getManifest } from "@/features/surfaces/manifests/registry";
import { SurfaceReadinessBadge } from "@/features/surfaces/components/SurfaceReadinessBadge";
import { getSurfaceDisplayLabel } from "@ai-matrx/chat/surfaces/utils/surface-display";
import {
  checkAgeLabel,
  checkSortWeight,
  surfaceCheckState,
} from "@ai-matrx/chat/surfaces/utils/surface-check-ledger";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@ai-matrx/kit/media-query";
import { useMediaQuery } from "@ai-matrx/kit/media-query";
import {
  SurfacesFilterBar,
  type SurfacesFilterState,
} from "@/features/surfaces/components/SurfacesFilterBar";
import type { ReadOutcome } from "@ai-matrx/design-system";

export interface RegistryAction {
  key: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge: number;
  disabled?: boolean;
  onClick: () => void;
}

interface Props {
  rows: SurfaceWithStats[];
  isLoading: boolean;
  selectedName: string | null;
  manifestedSurfaceNames: Set<string>;
  onSelect: (row: SurfaceWithStats) => void;
  onEdit: (row: SurfaceWithStats) => void;
  onPeek: (row: SurfaceWithStats) => void;
  onDelete: (row: SurfaceWithStats) => void;
  /** Activate / deactivate one surface (row right-click). */
  onToggleActive: (row: SurfaceWithStats) => void;
  navigatingName: string | null;
  filters: SurfacesFilterState;
  onFilterChange: (patch: Partial<SurfacesFilterState>) => void;
  onClearFilters: () => void;
  clientNames: string[];
  parentNames: string[];
  onRefresh: () => void | Promise<void>;
  onAdd: () => void | Promise<void>;
  /** Peek side panel is open (desktop): keep only the columns that fit whole. */
  peeking?: boolean;
  /** Registry-wide total; the footer keeps it visible when filters narrow rows. */
  totalCount?: number;
  /** Phone: the registry actions, listed in the toolbar's one "…" menu. */
  registryActions?: RegistryAction[];
  /** The surfaces read these rows answer (the container owns it). */
  read?: ReadOutcome | undefined;
  /** Fleet metric per surface name (ui.vw_surface_fleet_metric); absent = not loaded yet. */
  fleet?: ReadonlyMap<string, SurfaceFleetMetric>;
}

function checkedBadge(row: SurfaceWithStats) {
  const state = surfaceCheckState(row);
  const title = row.last_checked_at
    ? `Full UI surface check completed ${new Date(row.last_checked_at).toLocaleString()}${row.last_checked_by ? ` by ${row.last_checked_by}` : ""}`
    : "The full UI surface check has never completed on this surface";
  return (
    <Badge
      variant="outline"
      title={title}
      className={cn(
        "text-xs capitalize",
        state === "never" && "bg-muted text-muted-foreground border-border",
        state === "stale" && "border-warning/40 text-warning",
        state === "fresh" && "border-success/40 text-success",
      )}
    >
      {checkAgeLabel(row)}
    </Badge>
  );
}

/** The ONE empty marker in this table. */
const EMPTY = <span className="text-muted-foreground">—</span>;

/** A surface's human name: its registry label, or the label its key implies. */
export function surfaceRowTitle(row: SurfaceWithStats): string {
  return row.label?.trim() || getSurfaceDisplayLabel(row.name);
}

/**
 * Values declared in code (the manifest, with what it inherits) vs rows the
 * database mirror holds. `null` = no code manifest declares this surface.
 */
function declaredValueCount(name: string): number | null {
  const manifest = getManifest(name);
  return manifest ? manifest.values.length : null;
}

function ValuesCell({ row }: { row: SurfaceWithStats }) {
  const declared = declaredValueCount(row.name);
  if (declared === null) {
    return row.surfaceValueCount > 0 ? (
      <span className="inline-flex items-center gap-1 tabular-nums text-muted-foreground">
        {row.surfaceValueCount} in DB
        <InfoHint
          text="No code manifest declares this surface, but these values are saved in the database."
          label="About values in DB"
        />
      </span>
    ) : (
      EMPTY
    );
  }
  const inSync = declared === row.surfaceValueCount;
  return (
    <span
      className="whitespace-nowrap tabular-nums"
      title={`Declared in code: ${declared} · Saved in the database: ${row.surfaceValueCount}${inSync ? "" : " — Sync manifests brings the database up to date"}`}
    >
      {declared}
      {!inSync && (
        <span className="ml-1 text-xs text-warning">
          · {row.surfaceValueCount} in DB
        </span>
      )}
    </span>
  );
}

function NameCell({
  row,
  navigating,
}: {
  row: SurfaceWithStats;
  navigating: boolean;
}) {
  // Lines are <div>s so the right-click heading reads the title line alone.
  return (
    <div className="flex min-w-0 items-center gap-1.5">
      <div className="min-w-0">
        <Link
          href={surfaceAdminHref(row.name)}
          className="block truncate font-medium text-foreground hover:underline"
          onClick={(e) => e.stopPropagation()}
        >
          {surfaceRowTitle(row)}
        </Link>
        <div
          className="truncate font-mono text-xs text-muted-foreground"
          title={row.name}
        >
          {row.name}
        </div>
      </div>
      {row.overlay_id && (
        <Badge
          variant="outline"
          className="shrink-0 gap-1 text-xs"
          title={`Window or dialog: ${row.overlay_id}`}
        >
          <AppWindow className="h-3 w-3" /> Window
        </Badge>
      )}
      {navigating && (
        <span className="inline-flex shrink-0 items-center gap-1 text-xs text-muted-foreground">
          <Loader2 className="h-3 w-3 animate-spin" /> Opening…
        </span>
      )}
    </div>
  );
}

/** A count that is only known once the fleet metric has loaded. */
function countOrEmpty(n: number | null | undefined) {
  return n === null || n === undefined ? EMPTY : n;
}

function shortDate(iso: string | null | undefined) {
  return iso ? new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" }) : null;
}

function ActiveBadge({ active }: { active: boolean }) {
  // Nearly every surface is active, so "Active" is quiet text; only the
  // exception (Inactive) is marked.
  return active ? (
    <span className="text-muted-foreground">Active</span>
  ) : (
    <Badge variant="outline" className="text-xs text-muted-foreground">
      Inactive
    </Badge>
  );
}

// Columns in triage order: what needs work (readiness, bindings, values,
// check age, active) first; where it lives (client, parent, tier) after.
// Executor is folded into Client (it only differs on a few rows) and starts
// hidden as its own column.
/**
 * While Peek is open the table gets what is left of the width, so it keeps
 * only the triage columns that fit whole beside the pinned Actions column
 * (a column half under Actions read as "4 in DI"). `wide` = the viewport
 * has room for Tools and Values too.
 */
const PEEK_COLUMNS = {
  // Measured live on manage.aimatrx.com (header sort/filter icons make each
  // column wider than its declared width): at 1280 Checked was cut, at 1024
  // Tools was. The Peek's own tabs carry Values/Agents/Tools counts.
  wide: new Set(["name", "readiness", "suppliedShare", "agentCount", "toolCount"]),
  narrow: new Set(["name", "readiness", "suppliedShare"]),
};

function surfaceColumns(
  navigatingName: string | null,
  fleet: ReadonlyMap<string, SurfaceFleetMetric> | undefined,
  peek: "off" | "wide" | "narrow" = "off",
): MatrxColumnDef<SurfaceWithStats>[] {
  const all = allSurfaceColumns(navigatingName, fleet, peek !== "off");
  if (peek === "off") return all;
  const keep = PEEK_COLUMNS[peek];
  return all.filter((c) => keep.has(c.id ?? String(c.accessorKey)));
}

function allSurfaceColumns(
  navigatingName: string | null,
  fleet: ReadonlyMap<string, SurfaceFleetMetric> | undefined,
  peeking: boolean,
): MatrxColumnDef<SurfaceWithStats>[] {
  const m = (row: SurfaceWithStats) => fleet?.get(row.name);
  const readiness = (row: SurfaceWithStats) =>
    fleet ? deriveFleetReadiness(m(row)) : undefined;
  return [
    {
      accessorKey: "name",
      header: "Name",
      width: peeking ? 200 : 260,
      filterValue: (row) => `${surfaceRowTitle(row)} ${row.name}`,
      sortValue: (row) => surfaceRowTitle(row).toLowerCase(),
      cell: (row) => (
        <NameCell row={row} navigating={row.name === navigatingName} />
      ),
    },
    {
      id: "readiness",
      header: "Readiness",
      helpText: FLEET_READINESS_RULE,
      accessorFn: (row) => {
        const r = readiness(row);
        return r ? FLEET_READINESS_LABEL[r] : null;
      },
      sortValue: (row) => {
        const r = readiness(row);
        return r ? FLEET_READINESS_SORT[r] : 9;
      },
      format: { id: "choice" },
      width: 104,
      cell: (row) => {
        const r = readiness(row);
        return r ? <SurfaceReadinessBadge readiness={r} gaps={readinessGaps(m(row))} /> : EMPTY;
      },
    },
    {
      id: "valuesOn",
      header: "On values",
      helpText: "Declared values that are switched on, including those inherited from parent surfaces.",
      accessorFn: (row) => m(row)?.values_declared_on ?? null,
      format: { id: "integer" },
      align: "right",
      width: 92,
      cell: (row) => countOrEmpty(m(row)?.values_declared_on),
    },
    {
      id: "valuesSupplied",
      header: "Supplied",
      helpText: "On values that a run handed to an agent in the last 30 days, or that the last probe saw.",
      accessorFn: (row) => m(row)?.values_supplied ?? null,
      format: { id: "integer" },
      align: "right",
      width: 88,
      cell: (row) => countOrEmpty(m(row)?.values_supplied),
    },
    {
      id: "suppliedShare",
      header: "Supplied %",
      helpText: "Supplied values as a share of on values.",
      accessorFn: (row) => {
        const ratio = m(row)?.supplied_ratio;
        return ratio === null || ratio === undefined ? null : Math.round(ratio * 100);
      },
      format: { id: "percent", options: { precision: 0 } },
      align: "right",
      width: 96,
    },
    {
      id: "writeTargets",
      header: "Write targets",
      helpText: "Places on this page an agent can write to. Not inherited from parents.",
      accessorFn: (row) => m(row)?.write_targets ?? null,
      format: { id: "integer" },
      align: "right",
      width: 104,
      cell: (row) => countOrEmpty(m(row)?.write_targets),
    },
    {
      id: "handledTargets",
      header: "With handler",
      helpText: "Write targets the page registers a handler for, per the code check. Unknown for applet surfaces.",
      accessorFn: (row) => m(row)?.handled_targets ?? null,
      format: { id: "integer" },
      align: "right",
      width: 104,
      cell: (row) => countOrEmpty(m(row)?.handled_targets),
    },
    {
      id: "patchableTargets",
      header: "Patchable",
      helpText: "Write targets that change part of a text instead of replacing all of it.",
      accessorFn: (row) => m(row)?.patchable_targets ?? null,
      format: { id: "integer" },
      align: "right",
      width: 92,
      cell: (row) => countOrEmpty(m(row)?.patchable_targets),
    },
    {
      id: "situation",
      header: "Situation",
      helpText: "Own: set on this page. Inherited: only a parent's. Only Own counts toward readiness.",
      accessorFn: (row) => {
        const metric = m(row);
        if (!metric) return null;
        return metric.situation_source === "own"
          ? "Own"
          : metric.situation_source === "inherited"
            ? "Inherited"
            : "None";
      },
      format: { id: "choice" },
      width: 96,
    },
    {
      id: "lastRun",
      header: "Last run",
      helpText: "The newest agent run started from this surface.",
      accessorFn: (row) => m(row)?.last_run_at ?? null,
      format: { id: "datetime" },
      defaultSortDirection: "desc",
      width: 112,
      cell: (row) => shortDate(m(row)?.last_run_at) ?? EMPTY,
    },
    {
      id: "declaredBy",
      header: "Declared in",
      helpText: "Code surfaces come from a page manifest; database surfaces are applets and other saved surfaces.",
      accessorFn: (row) => {
        const by = m(row)?.declared_by;
        return by === "code" ? "Code" : by === "database" ? "Database" : null;
      },
      format: { id: "choice" },
      width: 100,
      hidden: true,
    },
    {
      id: "agentCount",
      header: "Agents",
      accessorFn: (row) => row.agentCount,
      align: "right",
      width: 72,
      cell: (row) => (row.agentCount > 0 ? row.agentCount : EMPTY),
    },
    {
      id: "toolCount",
      header: "Tools",
      accessorFn: (row) => row.toolCount,
      align: "right",
      width: 68,
      cell: (row) => (row.toolCount > 0 ? row.toolCount : EMPTY),
    },
    {
      id: "surfaceValueCount",
      header: "Values",
      hidden: true,
      accessorFn: (row) => declaredValueCount(row.name) ?? row.surfaceValueCount,
      align: "right",
      width: 120,
      cell: (row) => <ValuesCell row={row} />,
    },
    {
      id: "lastChecked",
      header: "Checked",
      accessorFn: checkAgeLabel,
      sortValue: (row) =>
        `${String(checkSortWeight(row)).padStart(4, "0")}:${row.name}`,
      defaultSortDirection: "desc",
      width: 92,
      cell: checkedBadge,
    },
    {
      accessorKey: "is_active",
      header: "Active",
      filter: "boolean",
      width: 84,
      cell: (row) => <ActiveBadge active={row.is_active !== false} />,
    },
    {
      accessorKey: "client_name",
      header: "Client",
      width: 150,
      cell: (row) => (
        <div className="min-w-0">
          <div className="truncate text-muted-foreground">{row.client_name}</div>
          {row.executor_name && row.executor_name !== row.client_name && (
            <div
              className="truncate text-xs text-muted-foreground"
              title="Executor — the client whose tools run for this surface"
            >
              runs in {row.executor_name}
            </div>
          )}
        </div>
      ),
    },
    {
      accessorKey: "parent_surface_name",
      header: "Parent",
      width: 160,
      // Off by default (column picker): at 1280 the triage columns come first.
      hidden: true,
      filterValue: (row) =>
        row.parent_surface_name
          ? `${getSurfaceDisplayLabel(row.parent_surface_name)} ${row.parent_surface_name}`
          : "",
      cell: (row) =>
        row.parent_surface_name ? (
          <span
            className="block truncate text-muted-foreground"
            title={row.parent_surface_name}
          >
            {getSurfaceDisplayLabel(row.parent_surface_name)}
          </span>
        ) : (
          EMPTY
        ),
    },
    {
      accessorKey: "sort_order",
      header: "Tier",
      width: 120,
      hidden: true,
      filterValue: (row) => tierFor(row.sort_order).label,
      cell: (row) => {
        const tier = tierFor(row.sort_order);
        return (
          <Badge
            variant="outline"
            className="whitespace-nowrap text-xs"
            title={`${tier.description} · position ${row.sort_order}`}
          >
            {tier.label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "executor_name",
      header: "Executor",
      width: 150,
      hidden: true,
      cell: (row) =>
        row.executor_name ? (
          <span className="text-muted-foreground">{row.executor_name}</span>
        ) : (
          EMPTY
        ),
    },
  ];
}

export function SurfacesTable({
  rows,
  isLoading,
  selectedName,
  manifestedSurfaceNames,
  onSelect,
  onEdit,
  onPeek,
  onDelete,
  onToggleActive,
  navigatingName,
  filters,
  onFilterChange,
  onClearFilters,
  clientNames,
  parentNames,
  onRefresh,
  onAdd,
  read,
  peeking = false,
  totalCount,
  registryActions = [],
  fleet,
}: Props) {
  const isMobile = useIsMobile();
  const roomForValues = useMediaQuery("(min-width: 1200px)");
  const surfacesLabel = (n: number) => `${n} surface${n === 1 ? "" : "s"}`;
  const { rowActionDefs, bulkActions } = defineRowVerbs<SurfaceWithStats>(
    [
      { id: "peek", icon: Eye, label: "Peek", onClick: (row) => onPeek(row), bulk: false, noBulk: "view" },
      {
        id: "edit", icon: Pencil, label: "Open editor",
        disabled: (row) => row.name === navigatingName,
        onClick: (row) => onEdit(row),
        bulk: false, noBulk: "edit",
      },
      {
        id: "activate", icon: Power, label: "Activate",
        appliesTo: (row) => row.is_active === false, unavailableTooltip: "Already active",
        onClick: (row) => onToggleActive(row),
        bulk: {
          done: "Activated",
          skipReason: (row) => (row.is_active === false ? null : "Already active"),
          confirm: (t) => ({
            title: `Activate ${surfacesLabel(t.ids.length)}?`,
            description: "They show up in the app again.",
            confirmLabel: "Activate",
          }),
          runOne: async (id) => {
            await updateSurface(id, { is_active: true });
          },
        },
      },
      {
        id: "deactivate", icon: PowerOff, label: "Deactivate",
        appliesTo: (row) => row.is_active !== false, unavailableTooltip: "Already inactive",
        onClick: (row) => onToggleActive(row),
        bulk: {
          done: "Deactivated",
          skipReason: (row) => (row.is_active !== false ? null : "Already inactive"),
          confirm: (t) => ({
            title: `Deactivate ${surfacesLabel(t.ids.length)}?`,
            description: "They stop showing up in the app until you activate them again.",
            confirmLabel: "Deactivate",
            variant: "destructive",
          }),
          runOne: async (id) => {
            await updateSurface(id, { is_active: false });
          },
        },
      },
      {
        id: "delete", icon: Trash2, label: "Delete", tone: "destructive",
        onClick: (row) => onDelete(row),
        bulk: {
          label: "Move to Trash",
          done: "Moved to Trash",
          removesRows: true,
          confirm: (t) => ({
            title: `Move ${surfacesLabel(t.ids.length)} to Trash?`,
            description: "Each surface leaves the registry and anything bound to it stops resolving. They can be restored from Trash.",
            confirmLabel: "Move to Trash",
            variant: "destructive",
          }),
          runOne: async (id) => {
            await deleteSurface(id);
            dismissRecordToasts({ type: "ui_surface", id });
          },
        },
      },
    ],
    { noun: "surface", getRowId: (row) => row.name, getRowName: (row) => row.label ?? row.name },
  );
  const bulk = useTableBulkSelection<SurfaceWithStats>({
    noun: "surface",
    rows,
    getRowId: (row) => row.name,
    getRowName: (row) => row.label ?? row.name,
    actions: bulkActions,
    standardBulkActions: false,
    onRefresh: () => void onRefresh(),
  });
  const hasSpecializedFilters =
    filters.client !== "__all__" ||
    filters.status !== "all" ||
    filters.manifest !== "all" ||
    filters.parent !== "__all__" ||
    filters.readiness !== "all" ||
    filters.checked !== "all";

  return (
    <MatrxDataTable<SurfaceWithStats>
      drill={SURFACES_DRILL}
      data={rows}
      columns={[...(surfaceColumns(
        navigatingName,
        fleet,
        !peeking || isMobile ? "off" : roomForValues ? "wide" : "narrow",
      ))]}
      rowActionDefs={rowActionDefs}
      selection={bulk.selection}
      tableId="administration/ui/surfaces"
      // One view control: the saved-views menu. The working-view tab strip
      // repeated its name ("Default view" twice).
      viewTabs={false}
      getRowId={(row) => row.name}
      getRowHref={(row) => surfaceAdminHref(row.name)}
      searchText={(row) =>
        [
          row.name,
          row.label,
          row.description,
          row.client_name,
          row.executor_name,
          row.parent_surface_name,
        ]
          .filter(Boolean)
          .join(" ")
      }
      isLoading={isLoading}
      read={read}
      defaultSort={{ id: "sort_order", direction: "asc" }}
      paginationLabelFormat={
        totalCount === undefined
          ? undefined
          : (start, end, total) => {
              if (total === 0) {
                return totalCount === 0
                  ? "0 surfaces"
                  : `0 matching · ${totalCount} surfaces`;
              }
              if (total === totalCount) {
                return isMobile
                  ? `${start}-${end} of ${total}`
                  : `Showing ${start} to ${end} of ${total} entries`;
              }
              return `${start}–${end} of ${total} matching · ${totalCount} surfaces`;
            }
      }
      selectedId={selectedName}
      onRowOpen={onSelect}
      detail={{ enabled: false }}
      rowClassName={(row) =>
        cn(
          row.is_active ? undefined : "opacity-60",
          row.name === navigatingName && "opacity-60",
        )
      }
      toolbar={{
        search: true,
        searchPlaceholder: "Search surfaces…",
        facets: [
          {
            type: "custom",
            id: "surface-source-filters",
            filter: {
              active: hasSpecializedFilters,
              onReset: onClearFilters,
            },
            render: () => null,
          },
        ],
        ...(isMobile
          ? {
              // Phone: ONE row — saved view, Filters, one "…" holding the
              // table's tools and registry actions; search below. The footer
              // owns the registry count.
              columns: false,
              overflow: {
                mode: "menu" as const,
                pinned: (
                  <SurfacesFilterBar
                    state={filters}
                    onChange={onFilterChange}
                    clientNames={clientNames}
                    parentNames={parentNames}
                    compact
                    onClear={onClearFilters}
                  />
                ),
                sheetExtras: registryActions.map((a) => (
                  <Button
                    key={a.key}
                    variant="quiet"
                    disabled={a.disabled}
                    onClick={a.onClick}
                    className="w-full justify-start"
                  >
                    <a.icon className="h-4 w-4 shrink-0" />
                    <span className="flex-1 text-left">{a.label}</span>
                    {a.badge > 0 && (
                      <span className="pl-3 tabular-nums text-muted-foreground">
                        {a.badge}
                      </span>
                    )}
                  </Button>
                )),
              },
            }
          : {
              leading: (
                <SurfacesFilterBar
                  state={filters}
                  onChange={onFilterChange}
                  clientNames={clientNames}
                  parentNames={parentNames}
                  onClear={onClearFilters}
                />
              ),
            }),
        refresh: { onRefresh },
        add: { onAdd },
      }}
      // One right-click menu per row: the row's own actions first (primary),
      // then the table's universal rows; the page's provider + menu wrapper
      // around the whole page supply the surface and the Agents entries.
      contextMenu={{
        resolveRowContext: (row, controls) => {
          const descriptor = buildDefaultTableRowMenuDescriptor(
            { id: row.name },
            controls,
          );
          const manifested = manifestedSurfaceNames.has(row.name);
          const active = row.is_active !== false;
          return createTableRowMenuDescriptor({
            ...descriptor,
            extraSections: [
              {
                id: "surface-row",
                // Labeled with the row's name; the shared menu heads a primary
                // section that repeats the header's name "Row" (named once).
                label: surfaceRowTitle(row),
                primary: true,
                anchor: "after-clipboard",
                items: [
                  { kind: "item", id: "open", label: "Open editor", icon: Pencil, onSelect: () => onEdit(row) },
                  { kind: "item", id: "peek", label: "Peek", icon: Eye, onSelect: () => onPeek(row) },
                  manifested
                    ? {
                        kind: "item",
                        id: "toggle-active",
                        label: active ? "Deactivate" : "Activate",
                        icon: active ? PowerOff : Power,
                        disabled: true,
                        description:
                          // Sync manifests would undo a change made here.
                          "Set by its code manifest; change it there",
                        onSelect: () => undefined,
                      }
                    : {
                        kind: "item",
                        id: "toggle-active",
                        label: active ? "Deactivate" : "Activate",
                        icon: active ? PowerOff : Power,
                        onSelect: () => onToggleActive(row),
                      },
                  { kind: "item", id: "delete", label: "Delete", icon: Trash2, destructive: true, onSelect: () => onDelete(row) },
                ],
              },
              ...descriptor.extraSections,
            ],
            context: {
              content: surfaceRowTitle(row),
              context: { name: row.name },
              [CONTEXT_MENU_ENTITY_KEY]: null,
            },
          });
        },
      }}

      mobileCards={(row) => (
        <article
          className={cn(
            "space-y-1 rounded-md border p-2.5",
            row.name === selectedName
              ? "border-primary/40 bg-primary/5"
              : "border-border",
            row.is_active === false && "opacity-70",
          )}
        >
          <div className="flex items-start justify-between gap-2">
            <button
              type="button"
              className="min-w-0 flex-1 text-left"
              onClick={() => onSelect(row)}
            >
              <NameCell row={row} navigating={row.name === navigatingName} />
            </button>
            {fleet && (
              <SurfaceReadinessBadge
                readiness={deriveFleetReadiness(fleet.get(row.name))}
                className="mt-0.5 shrink-0"
              />
            )}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  icon={<MoreVertical />}
                  variant="quiet"
                  className="-mr-1 shrink-0"
                  aria-label={`Actions for ${surfaceRowTitle(row)}`}
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem className="gap-2" onSelect={() => onPeek(row)}>
                  <Eye className="h-4 w-4" /> Peek
                </DropdownMenuItem>
                <DropdownMenuItem className="gap-2" onSelect={() => onEdit(row)}>
                  <Pencil className="h-4 w-4" /> Open editor
                </DropdownMenuItem>
                <DropdownMenuItem
                  className="gap-2 text-destructive"
                  onSelect={() => onDelete(row)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
            <span>{row.client_name}</span>
            <span>{tierFor(row.sort_order).label}</span>
            <span>
              Agents <span className="tabular-nums text-foreground">{row.agentCount}</span>
            </span>
            <span>
              Tools <span className="tabular-nums text-foreground">{row.toolCount}</span>
            </span>
            <span>
              Values <ValuesCell row={row} />
            </span>
            <span>Checked {checkedBadge(row)}</span>
            {row.is_active === false && <ActiveBadge active={false} />}
          </div>
        </article>
      )}
      emptyState={{ title: "No surfaces match these filters" }}
    />
  );
}
