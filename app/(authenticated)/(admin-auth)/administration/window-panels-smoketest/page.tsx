"use client";

/**
 * Window Panels — Registry Inventory + Smoke Test
 *
 * Single source of truth for "what overlays exist, what shape are they in,
 * are they working?" Combines:
 *
 *   1. INVENTORY — every registered overlay rendered as a row, with every
 *      metadata field as a column. Sort, filter, search, column toggles.
 *      Empty cells visually expose gaps in the metadata schema (the user's
 *      goal: "force us to get organized with things").
 *
 *   2. SMOKE TEST — clicking "Run smoke test" iterates the registry,
 *      probes each entry's lazy import + initial mount with `defaultData`,
 *      and updates the status column in real time. Catches:
 *        - Lazy chunk fails to resolve (path moved, file deleted)
 *        - Component throws on mount (missing prop, broken provider)
 *        - Component renders nothing because `defaultData` keys don't
 *          match the prop names the component reads
 *
 * Dev-only — bails to a non-result message in production. Admin-gated
 * client-side. The registry import is registry-driven (no static window
 * imports); chunks load only when individual overlays are probed.
 */

import {
  Component,
  useCallback,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ALL_WINDOW_REGISTRY_ENTRIES,
  type WindowRegistryEntry,
} from "@/features/window-panels/registry/windowRegistry";
import type { OverlayId } from "@/features/window-panels/registry/overlay-ids";
import { OverlaySurface } from "@/features/window-panels/OverlaySurface";
import { TOOLS_GRID_TILES } from "@/features/window-panels/tools-grid/toolsGridTiles";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  closeAllInstancesOfOverlay,
  openOverlay,
} from "@/lib/redux/slices/overlaySlice";
import { selectIsSuperAdmin } from "@/lib/redux/selectors/userSelectors";
// NOTE: shadcn Table primitive is intentionally NOT used here. Its wrapper
// div has its own `overflow-auto`, which captures scroll context and
// prevents `position: sticky` on thead from pinning to <main>. We render
// plain <table> elements with the same classes the primitive applies.
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  ChevronDown,
  ChevronRight,
  ChevronsUpDown,
  Columns,
  Play,
  RotateCcw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ─── Types & data ────────────────────────────────────────────────────────────

type ProbeStatus = "untested" | "pending" | "ok" | "error";
interface ProbeResult {
  status: ProbeStatus;
  message?: string;
}

const SMOKETEST_INSTANCE_ID = "smoketest";

interface ColumnDef {
  key: string;
  label: string;
  sortable: boolean;
  /** Default visibility on first paint. */
  defaultVisible: boolean;
  /** How wide the column nominally is in the table. */
  widthClass: string;
}

const ALL_COLUMNS: ColumnDef[] = [
  {
    key: "status",
    label: "•",
    sortable: true,
    defaultVisible: true,
    widthClass: "w-8",
  },
  {
    key: "overlayId",
    label: "overlayId",
    sortable: true,
    defaultVisible: true,
    widthClass: "min-w-[210px]",
  },
  {
    key: "kind",
    label: "kind",
    sortable: true,
    defaultVisible: true,
    widthClass: "w-20",
  },
  {
    key: "label",
    label: "label",
    sortable: true,
    defaultVisible: true,
    widthClass: "min-w-[160px]",
  },
  {
    key: "slug",
    label: "slug",
    sortable: true,
    defaultVisible: true,
    widthClass: "min-w-[200px]",
  },
  {
    key: "mobilePresentation",
    label: "mobile",
    sortable: true,
    defaultVisible: true,
    widthClass: "w-24",
  },
  {
    key: "mobileSidebarAs",
    label: "mobile sidebar",
    sortable: true,
    defaultVisible: true,
    widthClass: "w-24",
  },
  {
    key: "instanceMode",
    label: "instance",
    sortable: true,
    defaultVisible: true,
    widthClass: "w-20",
  },
  {
    key: "urlSync",
    label: "?panels=",
    sortable: true,
    defaultVisible: true,
    widthClass: "min-w-[120px]",
  },
  {
    key: "ephemeral",
    label: "ephemeral",
    sortable: true,
    defaultVisible: true,
    widthClass: "w-20",
  },
  {
    key: "tile",
    label: "tile",
    sortable: true,
    defaultVisible: true,
    widthClass: "w-16",
  },
  {
    key: "defaultData",
    label: "defaultData keys",
    sortable: false,
    defaultVisible: true,
    widthClass: "min-w-[200px]",
  },
  {
    key: "componentPath",
    label: "componentImport",
    sortable: false,
    defaultVisible: false,
    widthClass: "min-w-[300px]",
  },
];

type SortKey = string | null;
type SortDir = "asc" | "desc";

// ─── Page ────────────────────────────────────────────────────────────────────

export default function WindowPanelsRegistryPage() {
  const isProd = process.env.NODE_ENV === "production";
  const isAdmin = useAppSelector(selectIsSuperAdmin);
  const dispatch = useAppDispatch();

  const [results, setResults] = useState<Record<string, ProbeResult>>({});
  const [probing, setProbing] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [filterKind, setFilterKind] = useState<string>("all");
  const [filterMobile, setFilterMobile] = useState<string>("all");
  const [filterInstance, setFilterInstance] = useState<string>("all");
  const [filterEphemeral, setFilterEphemeral] = useState<"all" | "yes" | "no">(
    "all",
  );
  const [filterStatus, setFilterStatus] = useState<"all" | ProbeStatus>("all");
  const [visibleCols, setVisibleCols] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(ALL_COLUMNS.map((c) => [c.key, c.defaultVisible])),
  );
  const [sortKey, setSortKey] = useState<SortKey>("overlayId");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  // Lookup: which overlayIds are referenced by a Tools-grid tile.
  const tileOverlayIds = useMemo(() => {
    const set = new Set<string>();
    for (const t of TOOLS_GRID_TILES) {
      if (t.overlayId) set.add(t.overlayId);
    }
    return set;
  }, []);

  // Cleanup on unmount: close every probed instance so the inventory
  // page never leaves overlays open in Redux state for the next page.
  useEffect(() => {
    return () => {
      for (const entry of ALL_WINDOW_REGISTRY_ENTRIES) {
        // entry.overlayId is sourced from the registry; check-registry
        // verifies every value matches an entry in OVERLAY_IDS, so the
        // cast is safe. The metadata field is `string` only to break a
        // circular dependency with overlay-ids.ts.
        dispatch(
          closeAllInstancesOfOverlay({
            overlayId: entry.overlayId as OverlayId,
          }),
        );
      }
    };
  }, [dispatch]);

  const setResult = useCallback((overlayId: string, result: ProbeResult) => {
    setResults((prev) => ({ ...prev, [overlayId]: result }));
  }, []);

  // ── Smoke test ───────────────────────────────────────────────────────────

  const probeAll = useCallback(async () => {
    setResults({});
    for (const entry of ALL_WINDOW_REGISTRY_ENTRIES) {
      setProbing(entry.overlayId);
      setResult(entry.overlayId, { status: "pending" });

      // 1. Lazy-import probe — proves the chunk resolves and exports `default`.
      try {
        const mod = await entry.componentImport();
        if (typeof mod.default !== "function") {
          setResult(entry.overlayId, {
            status: "error",
            message:
              "componentImport() resolved but module has no default export",
          });
          continue;
        }
      } catch (err) {
        setResult(entry.overlayId, {
          status: "error",
          message: `componentImport() threw: ${(err as Error).message ?? err}`,
        });
        continue;
      }

      // 2. Mount probe — open the overlay with its defaultData. The hidden
      // mount target below renders <OverlaySurface> for every entry inside
      // an ErrorBoundary that flips status to "error" on render throw.
      const instanceId =
        entry.instanceMode === "multi"
          ? `${SMOKETEST_INSTANCE_ID}-${Date.now()}`
          : SMOKETEST_INSTANCE_ID;

      dispatch(
        openOverlay({
          overlayId: entry.overlayId as OverlayId,
          instanceId,
          data: { ...(entry.defaultData ?? {}) },
        }),
      );

      await new Promise((r) => setTimeout(r, 250));

      setResults((prev) => {
        if (prev[entry.overlayId]?.status === "error") return prev;
        return {
          ...prev,
          [entry.overlayId]: { status: "ok" },
        };
      });

      dispatch(
        closeAllInstancesOfOverlay({
          overlayId: entry.overlayId as OverlayId,
        }),
      );
    }
    setProbing(null);
  }, [dispatch, setResult]);

  const reset = useCallback(() => {
    setResults({});
    setProbing(null);
  }, []);

  // ── Derived rows ─────────────────────────────────────────────────────────

  const rows = useMemo(() => {
    const lower = search.trim().toLowerCase();
    const filtered = ALL_WINDOW_REGISTRY_ENTRIES.filter((entry) => {
      if (lower) {
        const haystack = (
          entry.overlayId +
          " " +
          entry.slug +
          " " +
          entry.label +
          " " +
          (entry.urlSync?.key ?? "")
        ).toLowerCase();
        if (!haystack.includes(lower)) return false;
      }
      if (filterKind !== "all" && entry.kind !== filterKind) return false;
      if (
        filterMobile !== "all" &&
        (entry.mobilePresentation ?? "—") !== filterMobile
      )
        return false;
      if (
        filterInstance !== "all" &&
        (entry.instanceMode ?? "singleton") !== filterInstance
      )
        return false;
      if (filterEphemeral === "yes" && !entry.ephemeral) return false;
      if (filterEphemeral === "no" && entry.ephemeral) return false;
      if (filterStatus !== "all") {
        const status = results[entry.overlayId]?.status ?? "untested";
        if (status !== filterStatus) return false;
      }
      return true;
    });

    if (sortKey) {
      const dir = sortDir === "asc" ? 1 : -1;
      filtered.sort((a, b) => {
        const va = sortValue(a, sortKey, results, tileOverlayIds);
        const vb = sortValue(b, sortKey, results, tileOverlayIds);
        if (va < vb) return -1 * dir;
        if (va > vb) return 1 * dir;
        return 0;
      });
    }

    return filtered;
  }, [
    search,
    filterKind,
    filterMobile,
    filterInstance,
    filterEphemeral,
    filterStatus,
    sortKey,
    sortDir,
    results,
    tileOverlayIds,
  ]);

  const counts = useMemo(() => {
    let ok = 0;
    let error = 0;
    let pending = 0;
    for (const entry of ALL_WINDOW_REGISTRY_ENTRIES) {
      const status = results[entry.overlayId]?.status;
      if (status === "ok") ok++;
      else if (status === "error") error++;
      else if (status === "pending") pending++;
    }
    return {
      total: ALL_WINDOW_REGISTRY_ENTRIES.length,
      ok,
      error,
      pending,
      untested: ALL_WINDOW_REGISTRY_ENTRIES.length - ok - error - pending,
    };
  }, [results]);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  // ── Gates ────────────────────────────────────────────────────────────────

  if (isProd) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Window Panels Registry inventory is dev-only.
      </div>
    );
  }
  if (!isAdmin) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Admin-gated. You don&rsquo;t have access.
      </div>
    );
  }

  const visibleColumns = ALL_COLUMNS.filter((c) => visibleCols[c.key]);

  return (
    <div className="flex h-[calc(100vh-2.5rem)] flex-col overflow-hidden bg-textured">
      <header className="border-b border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <h1 className="text-base font-semibold">Window Panels Registry</h1>
            <p className="mt-0.5 text-xs text-muted-foreground">
              <span className="font-medium text-foreground">
                {counts.total}
              </span>{" "}
              entries · {rows.length} shown ·{" "}
              <span className="text-green-600 dark:text-green-400">
                {counts.ok} ok
              </span>{" "}
              ·{" "}
              <span className="text-red-600 dark:text-red-400">
                {counts.error} error
              </span>{" "}
              · {counts.pending} pending · {counts.untested} untested
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Button
              size="sm"
              onClick={probeAll}
              disabled={probing !== null}
              className="h-7 gap-1.5 text-xs"
            >
              <Play className="h-3 w-3" />
              {probing === null ? "Run smoke test" : `Probing ${probing}…`}
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={reset}
              disabled={probing !== null || counts.ok + counts.error === 0}
              className="h-7 gap-1.5 text-xs"
            >
              <RotateCcw className="h-3 w-3" />
              Reset
            </Button>
          </div>
        </div>

        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          <Input
            type="search"
            placeholder="Search overlayId, slug, label, urlSync…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-7 w-72 text-xs"
          />
          <FacetSelect
            label="kind"
            value={filterKind}
            onChange={setFilterKind}
            options={["all", "window", "widget", "sheet", "modal"]}
          />
          <FacetSelect
            label="mobile"
            value={filterMobile}
            onChange={setFilterMobile}
            options={["all", "fullscreen", "drawer", "card", "hidden", "—"]}
          />
          <FacetSelect
            label="instance"
            value={filterInstance}
            onChange={setFilterInstance}
            options={["all", "singleton", "multi"]}
          />
          <FacetSelect
            label="ephemeral"
            value={filterEphemeral}
            onChange={(v) => setFilterEphemeral(v as "all" | "yes" | "no")}
            options={["all", "yes", "no"]}
          />
          <FacetSelect
            label="status"
            value={filterStatus}
            onChange={(v) => setFilterStatus(v as "all" | ProbeStatus)}
            options={["all", "ok", "error", "pending", "untested"]}
          />
          <Popover>
            <PopoverTrigger asChild>
              <Button
                size="sm"
                variant="outline"
                className="h-7 gap-1.5 text-xs"
              >
                <Columns className="h-3 w-3" />
                Columns
              </Button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-2">
              <div className="space-y-1">
                {ALL_COLUMNS.map((col) => (
                  <label
                    key={col.key}
                    className="flex items-center gap-2 rounded px-1 py-1 text-xs hover:bg-muted"
                  >
                    <Checkbox
                      checked={!!visibleCols[col.key]}
                      onCheckedChange={(v) =>
                        setVisibleCols((s) => ({
                          ...s,
                          [col.key]: !!v,
                        }))
                      }
                      disabled={col.key === "overlayId" || col.key === "status"}
                    />
                    <span className="font-mono">{col.label}</span>
                  </label>
                ))}
              </div>
            </PopoverContent>
          </Popover>
        </div>
      </header>

      {/*
       * Plain <table> instead of the shadcn Table primitive: that
       * primitive wraps the table in `<div class="overflow-auto">` which
       * captures the scroll context and makes `position: sticky` on the
       * thead pin to that wrapper instead of to <main>. We want the
       * thead to stay visible as the user scrolls the row list, so we
       * inline the elements and let <main> own the single scroll
       * container.
       */}
      <main className="flex-1 overflow-auto">
        <table className="w-full caption-bottom border-collapse text-xs">
          <thead className="sticky top-0 z-20 bg-card shadow-[0_1px_0_0_var(--border)]">
            <tr className="border-b">
              <th className="h-10 w-6 px-1 text-left align-middle text-xs font-medium text-muted-foreground" />
              {visibleColumns.map((col) => (
                <th
                  key={col.key}
                  className={cn(
                    col.widthClass,
                    "h-10 px-2 text-left align-middle text-xs font-medium text-muted-foreground",
                  )}
                >
                  {col.sortable ? (
                    <button
                      type="button"
                      onClick={() => toggleSort(col.key)}
                      className="inline-flex items-center gap-1 hover:text-foreground"
                    >
                      {col.label}
                      <SortIcon active={sortKey === col.key} dir={sortDir} />
                    </button>
                  ) : (
                    col.label
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((entry) => (
              <RegistryRow
                key={entry.overlayId}
                entry={entry}
                result={results[entry.overlayId]}
                hasTile={tileOverlayIds.has(entry.overlayId)}
                visibleColumns={visibleColumns}
                expanded={expandedId === entry.overlayId}
                onToggleExpand={() =>
                  setExpandedId((id) =>
                    id === entry.overlayId ? null : entry.overlayId,
                  )
                }
                onPreview={() => {
                  // Click-to-render: open the overlay so the user can
                  // see / interact with it. The app's
                  // UnifiedOverlayController (mounted in
                  // DeferredSingletons) renders it visibly. Multi-
                  // instance overlays use a stable "preview"
                  // instanceId so re-clicking the same row doesn't
                  // accumulate instances.
                  const instanceId =
                    entry.instanceMode === "multi"
                      ? "preview"
                      : undefined;
                  dispatch(
                    openOverlay({
                      overlayId: entry.overlayId as OverlayId,
                      instanceId,
                      data: { ...(entry.defaultData ?? {}) },
                    }),
                  );
                }}
              />
            ))}
          </tbody>
        </table>
      </main>

      {/*
       * Hidden smoke-test mount target. Only rendered during an active
       * probe run. Outside of probe runs, the app's
       * UnifiedOverlayController (mounted globally in DeferredSingletons)
       * is the only OverlaySurface that mounts overlays, so click-to-
       * render shows the overlay exactly once. During a probe run, this
       * extra mount captures any throw from a component's first mount via
       * the surrounding ErrorBoundary.
       */}
      {probing !== null ? (
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-0">
          {ALL_WINDOW_REGISTRY_ENTRIES.map((entry) => (
            <ErrorBoundary
              key={entry.overlayId}
              onError={(err: Error) =>
                setResult(entry.overlayId, {
                  status: "error",
                  message: `mount threw: ${err.message ?? String(err)}`,
                })
              }
            >
              <OverlaySurface overlayId={entry.overlayId as OverlayId} />
            </ErrorBoundary>
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ─── Row ─────────────────────────────────────────────────────────────────────

function RegistryRow({
  entry,
  result,
  hasTile,
  visibleColumns,
  expanded,
  onToggleExpand,
  onPreview,
}: {
  entry: WindowRegistryEntry;
  result: ProbeResult | undefined;
  hasTile: boolean;
  visibleColumns: ColumnDef[];
  expanded: boolean;
  onToggleExpand: () => void;
  onPreview: () => void;
}) {
  const status = result?.status ?? "untested";
  const defaultDataKeys = Object.keys(entry.defaultData ?? {});
  const componentPath = inferComponentPath(entry);

  return (
    <>
      {/*
       * Row click → opens the overlay (preview). The chevron has its own
       * button that toggles the inline-details row and stops the click
       * from bubbling up to the row's preview handler.
       */}
      <tr
        className={cn(
          "cursor-pointer border-b transition-colors hover:bg-muted/50",
          expanded && "bg-muted/40",
          status === "error" && "bg-red-500/5",
        )}
        onClick={onPreview}
        title="Click to open this overlay"
      >
        <td className="w-6 px-1 align-middle">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleExpand();
            }}
            className="inline-flex h-5 w-5 items-center justify-center rounded hover:bg-muted"
            title={expanded ? "Hide details" : "Show details"}
            aria-label={expanded ? "Hide details" : "Show details"}
          >
            {expanded ? (
              <ChevronDown className="h-3 w-3 text-muted-foreground" />
            ) : (
              <ChevronRight className="h-3 w-3 text-muted-foreground" />
            )}
          </button>
        </td>
        {visibleColumns.map((col) => (
          <td
            key={col.key}
            className={cn(col.widthClass, "px-2 py-1 align-middle")}
          >
            {renderCell(
              col.key,
              entry,
              result,
              hasTile,
              defaultDataKeys,
              componentPath,
            )}
          </td>
        ))}
      </tr>
      {expanded ? (
        <tr>
          <td
            colSpan={visibleColumns.length + 1}
            className="bg-muted/20 p-0 align-top"
          >
            <ExpandedDetails
              entry={entry}
              result={result}
              hasTile={hasTile}
              componentPath={componentPath}
            />
          </td>
        </tr>
      ) : null}
    </>
  );
}

function renderCell(
  key: string,
  entry: WindowRegistryEntry,
  result: ProbeResult | undefined,
  hasTile: boolean,
  defaultDataKeys: string[],
  componentPath: string,
): ReactNode {
  const status = result?.status ?? "untested";
  switch (key) {
    case "status":
      return <StatusDot status={status} title={result?.message} />;
    case "overlayId":
      return <span className="font-mono font-medium">{entry.overlayId}</span>;
    case "kind":
      return <KindBadge kind={entry.kind} />;
    case "label":
      return <span className="truncate">{entry.label}</span>;
    case "slug":
      return (
        <span className="font-mono text-muted-foreground">{entry.slug}</span>
      );
    case "mobilePresentation":
      return entry.mobilePresentation ? (
        <span className="font-mono text-muted-foreground">
          {entry.mobilePresentation}
        </span>
      ) : (
        <Empty />
      );
    case "mobileSidebarAs":
      return entry.mobileSidebarAs ? (
        <span className="font-mono text-muted-foreground">
          {entry.mobileSidebarAs}
        </span>
      ) : (
        <Empty />
      );
    case "instanceMode":
      return (
        <span className="font-mono text-muted-foreground">
          {entry.instanceMode ?? "singleton"}
        </span>
      );
    case "urlSync":
      return entry.urlSync?.key ? (
        <span className="font-mono text-muted-foreground">
          ?{entry.urlSync.key}
        </span>
      ) : (
        <Empty />
      );
    case "ephemeral":
      return entry.ephemeral ? (
        <span className="text-muted-foreground">yes</span>
      ) : (
        <Empty />
      );
    case "tile":
      return hasTile ? (
        <span className="text-green-600 dark:text-green-400">yes</span>
      ) : (
        <Empty />
      );
    case "defaultData":
      return defaultDataKeys.length === 0 ? (
        <Empty />
      ) : (
        <span className="truncate font-mono text-muted-foreground">
          {defaultDataKeys.join(", ")}
        </span>
      );
    case "componentPath":
      return (
        <span className="truncate font-mono text-muted-foreground">
          {componentPath}
        </span>
      );
    default:
      return null;
  }
}

function ExpandedDetails({
  entry,
  result,
  hasTile,
  componentPath,
}: {
  entry: WindowRegistryEntry;
  result: ProbeResult | undefined;
  hasTile: boolean;
  componentPath: string;
}) {
  const tile = useMemo(
    () => TOOLS_GRID_TILES.find((t) => t.overlayId === entry.overlayId),
    [entry.overlayId],
  );
  const fullEntry = {
    slug: entry.slug,
    overlayId: entry.overlayId,
    kind: entry.kind,
    label: entry.label,
    mobilePresentation: entry.mobilePresentation,
    mobileSidebarAs: entry.mobileSidebarAs,
    instanceMode: entry.instanceMode,
    urlSync: entry.urlSync,
    ephemeral: entry.ephemeral,
    defaultData: entry.defaultData,
    componentImport: componentPath,
  };

  return (
    <div className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-2">
      <section>
        <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
          Registry entry
        </h3>
        <pre className="overflow-x-auto rounded-md border border-border bg-card p-2 font-mono text-[11px] leading-relaxed">
          {JSON.stringify(fullEntry, null, 2)}
        </pre>
      </section>
      <section className="space-y-3">
        <div>
          <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Smoke test
          </h3>
          <div className="rounded-md border border-border bg-card p-2 text-xs">
            <div className="flex items-center gap-2">
              <StatusDot status={result?.status ?? "untested"} />
              <span className="font-mono">{result?.status ?? "untested"}</span>
            </div>
            {result?.message ? (
              <p className="mt-1.5 break-words font-mono text-[11px] text-red-600 dark:text-red-400">
                {result.message}
              </p>
            ) : null}
          </div>
        </div>

        <div>
          <h3 className="mb-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Tools-grid tile
          </h3>
          <div className="rounded-md border border-border bg-card p-2 text-xs">
            {hasTile && tile ? (
              <pre className="overflow-x-auto font-mono text-[11px] leading-relaxed">
                {JSON.stringify(
                  {
                    id: tile.id,
                    label: tile.label,
                    category: tile.category,
                    gate: tile.gate ?? null,
                    instanceStrategy: tile.instanceStrategy ?? null,
                    hasSeedData: !!tile.seedData,
                    hasOnActivate: !!tile.onActivate,
                  },
                  null,
                  2,
                )}
              </pre>
            ) : (
              <span className="text-muted-foreground">
                Not in Tools grid (programmatic open only)
              </span>
            )}
          </div>
        </div>

        <div className="text-[10px] text-muted-foreground">
          Centralization gaps for this entry — open these to add them to a
          richer metadata schema:
          <ul className="ml-4 mt-1 list-disc space-y-0.5">
            {!entry.defaultData ||
            Object.keys(entry.defaultData).length === 0 ? (
              <li>
                <code>defaultData</code> is empty — declare prop shape
              </li>
            ) : null}
            {entry.kind === "window" && !entry.mobilePresentation ? (
              <li>
                missing <code>mobilePresentation</code>
              </li>
            ) : null}
            <li className="opacity-60">
              <code>defaultRect</code> (width / height / minWidth / minHeight /
              position) — not in schema
            </li>
            <li className="opacity-60">
              <code>icon</code>, <code>category</code> — duplicated in
              tools-grid tile, not in registry
            </li>
            <li className="opacity-60">
              <code>events</code> declaration (callback contract) — not in
              schema
            </li>
            <li className="opacity-60">
              <code>persistence</code> (snapshot / restore / autosave /
              heavySnapshot) — schema fields exist but not wired
            </li>
          </ul>
        </div>
      </section>
    </div>
  );
}

// ─── Cells / dots / badges ───────────────────────────────────────────────────

function StatusDot({ status, title }: { status: ProbeStatus; title?: string }) {
  const cls =
    status === "ok"
      ? "bg-green-500"
      : status === "error"
        ? "bg-red-500"
        : status === "pending"
          ? "bg-yellow-500 animate-pulse"
          : "bg-muted-foreground/30";
  return (
    <span
      title={title}
      className={`inline-block h-2 w-2 rounded-full ${cls}`}
    />
  );
}

function KindBadge({ kind }: { kind: WindowRegistryEntry["kind"] }) {
  const cls =
    kind === "window"
      ? "bg-blue-500/10 text-blue-700 dark:text-blue-300"
      : kind === "widget"
        ? "bg-purple-500/10 text-purple-700 dark:text-purple-300"
        : kind === "sheet"
          ? "bg-orange-500/10 text-orange-700 dark:text-orange-300"
          : "bg-pink-500/10 text-pink-700 dark:text-pink-300";
  return (
    <Badge variant="secondary" className={cn("font-mono text-[10px]", cls)}>
      {kind}
    </Badge>
  );
}

function Empty() {
  return <span className="text-muted-foreground/40">—</span>;
}

function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) {
    return <ChevronsUpDown className="h-3 w-3 text-muted-foreground/40" />;
  }
  return dir === "asc" ? (
    <ChevronDown className="h-3 w-3 rotate-180" />
  ) : (
    <ChevronDown className="h-3 w-3" />
  );
}

// ─── Facet select ────────────────────────────────────────────────────────────

function FacetSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
}) {
  return (
    <div className="flex items-center gap-1">
      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </span>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-7 w-auto min-w-[80px] gap-1 text-xs">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((o) => (
            <SelectItem key={o} value={o} className="font-mono text-xs">
              {o}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function sortValue(
  entry: WindowRegistryEntry,
  key: string,
  results: Record<string, ProbeResult>,
  tileOverlayIds: Set<string>,
): string {
  switch (key) {
    case "status": {
      const s = results[entry.overlayId]?.status ?? "untested";
      return { error: "0", pending: "1", ok: "2", untested: "3" }[s] ?? "9";
    }
    case "overlayId":
      return entry.overlayId.toLowerCase();
    case "kind":
      return entry.kind;
    case "label":
      return entry.label.toLowerCase();
    case "slug":
      return entry.slug;
    case "mobilePresentation":
      return entry.mobilePresentation ?? "z";
    case "mobileSidebarAs":
      return entry.mobileSidebarAs ?? "z";
    case "instanceMode":
      return entry.instanceMode ?? "singleton";
    case "urlSync":
      return entry.urlSync?.key ?? "z";
    case "ephemeral":
      return entry.ephemeral ? "0" : "1";
    case "tile":
      return tileOverlayIds.has(entry.overlayId) ? "0" : "1";
    default:
      return entry.overlayId;
  }
}

function inferComponentPath(entry: WindowRegistryEntry): string {
  try {
    const src = entry.componentImport.toString();
    const m = /import\(\s*["']([^"']+)["']/.exec(src);
    return m?.[1] ?? "(dynamic)";
  } catch {
    return "(unknown)";
  }
}

// ─── Error boundary ──────────────────────────────────────────────────────────

interface BoundaryProps {
  onError: (err: Error) => void;
  children: ReactNode;
}
class ErrorBoundary extends Component<BoundaryProps, { hadError: boolean }> {
  state = { hadError: false };
  static getDerivedStateFromError() {
    return { hadError: true };
  }
  componentDidCatch(err: Error) {
    this.props.onError(err);
  }
  render() {
    if (this.state.hadError) return null;
    return this.props.children;
  }
}
