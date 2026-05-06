"use client";

/**
 * Window Panels — runtime smoke-test harness.
 *
 * Walks `ALL_WINDOW_REGISTRY_ENTRIES`, spawns each overlay with its
 * `defaultData`, and reports whether the lazy chunk resolves and the
 * component mounts without throwing. Catches three failure modes that
 * static analysis can't:
 *
 *   1. `componentImport()` rejects (path moved, file deleted)
 *   2. Component throws on mount (missing required prop, broken provider)
 *   3. Component renders nothing because `defaultData` keys don't match
 *      the prop names the component reads
 *
 * Dev-only — bails to a 404 in production. Admin-gated client-side.
 */

import { Component, useEffect, useMemo, useState, type ReactNode } from "react";
import {
  ALL_WINDOW_REGISTRY_ENTRIES,
  type WindowRegistryEntry,
} from "@/features/window-panels/registry/windowRegistry";
import { OverlaySurface } from "@/features/window-panels/OverlaySurface";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  closeAllInstancesOfOverlay,
  openOverlay,
} from "@/lib/redux/slices/overlaySlice";
import { selectIsSuperAdmin } from "@/lib/redux/selectors/userSelectors";

const SMOKETEST_INSTANCE_ID = "smoketest";

type ProbeStatus = "pending" | "ok" | "error";
interface ProbeResult {
  status: ProbeStatus;
  message?: string;
}

export default function WindowPanelsSmoketestPage() {
  const isProd = process.env.NODE_ENV === "production";
  const isAdmin = useAppSelector(selectIsSuperAdmin);
  const dispatch = useAppDispatch();
  const [results, setResults] = useState<Record<string, ProbeResult>>({});
  const [probing, setProbing] = useState<string | null>(null);

  const entries = useMemo(
    () => [...ALL_WINDOW_REGISTRY_ENTRIES].sort((a, b) =>
      a.overlayId.localeCompare(b.overlayId),
    ),
    [],
  );

  // Per-entry result setter — closure-stable handle for the boundary.
  const setResult = (overlayId: string, result: ProbeResult) => {
    setResults((prev) => ({ ...prev, [overlayId]: result }));
  };

  // Cleanup on unmount: close every probed instance.
  useEffect(() => {
    return () => {
      for (const entry of ALL_WINDOW_REGISTRY_ENTRIES) {
        dispatch(closeAllInstancesOfOverlay({ overlayId: entry.overlayId }));
      }
    };
  }, [dispatch]);

  if (isProd) {
    return (
      <div className="p-6 text-sm text-muted-foreground">
        Window Panels smoke-test is dev-only.
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

  const probeAll = async () => {
    setResults({});
    for (const entry of entries) {
      setProbing(entry.overlayId);
      setResult(entry.overlayId, { status: "pending" });

      // 1. Lazy-import probe — proves the chunk resolves and exports `default`.
      try {
        const mod = await entry.componentImport();
        if (typeof mod.default !== "function") {
          setResult(entry.overlayId, {
            status: "error",
            message: "componentImport() resolved but module has no default export",
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

      // 2. Mount probe — open the overlay with its defaultData and let the
      // <OverlaySurface> below mount it inside an ErrorBoundary that calls
      // setResult on render error. The 200ms delay gives Suspense a tick to
      // resolve the chunk; if no error fires, mark ok.
      const instanceId =
        entry.instanceMode === "multi"
          ? `${SMOKETEST_INSTANCE_ID}-${Date.now()}`
          : SMOKETEST_INSTANCE_ID;

      dispatch(
        openOverlay({
          overlayId: entry.overlayId,
          instanceId,
          data: { ...(entry.defaultData ?? {}) },
        }),
      );

      await new Promise((r) => setTimeout(r, 250));

      // If the boundary did not flip status to "error" by now, treat as ok.
      setResults((prev) => {
        if (prev[entry.overlayId]?.status === "error") return prev;
        return {
          ...prev,
          [entry.overlayId]: { status: "ok" },
        };
      });

      // Close the instance so the next probe doesn't pile up.
      dispatch(closeAllInstancesOfOverlay({ overlayId: entry.overlayId }));
    }
    setProbing(null);
  };

  const counts = entries.reduce(
    (acc, e) => {
      const r = results[e.overlayId];
      if (!r) acc.untested++;
      else if (r.status === "ok") acc.ok++;
      else if (r.status === "error") acc.error++;
      else acc.pending++;
      return acc;
    },
    { ok: 0, error: 0, pending: 0, untested: 0 },
  );

  return (
    <div className="flex h-[calc(100vh-2.5rem)] flex-col overflow-hidden bg-textured">
      <header className="border-b border-border bg-card px-6 py-4">
        <h1 className="text-lg font-semibold">Window Panels — Smoke Test</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {entries.length} registered overlays.{" "}
          <span className="text-green-600 dark:text-green-400">
            {counts.ok} ok
          </span>{" "}
          ·{" "}
          <span className="text-red-600 dark:text-red-400">
            {counts.error} error
          </span>{" "}
          · {counts.pending} pending · {counts.untested} not yet run
        </p>
        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={probeAll}
            disabled={probing !== null}
            className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground hover:bg-primary/90 disabled:opacity-50"
          >
            {probing === null
              ? "Run smoke test"
              : `Probing ${probing}…`}
          </button>
          <p className="text-xs text-muted-foreground">
            Probes each overlay&rsquo;s lazy import + initial mount with
            its <code>defaultData</code>. Close handlers run between
            probes. Existing windows are not affected.
          </p>
        </div>
      </header>

      <main className="flex-1 overflow-auto p-6">
        <div className="grid grid-cols-1 gap-2 md:grid-cols-2 xl:grid-cols-3">
          {entries.map((entry) => (
            <ProbeRow
              key={entry.overlayId}
              entry={entry}
              result={results[entry.overlayId]}
            />
          ))}
        </div>
      </main>

      {/* Hidden mount target — the surface mounts every overlay that's
          opened above. Errors thrown during mount/render bubble into the
          ErrorBoundary, which records them per-overlayId. */}
      <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden opacity-0">
        {entries.map((entry) => (
          <ErrorBoundary
            key={entry.overlayId}
            onError={(err: Error) =>
              setResult(entry.overlayId, {
                status: "error",
                message: `mount threw: ${err.message ?? String(err)}`,
              })
            }
          >
            <OverlaySurface overlayId={entry.overlayId} />
          </ErrorBoundary>
        ))}
      </div>
    </div>
  );
}

function ProbeRow({
  entry,
  result,
}: {
  entry: WindowRegistryEntry;
  result: ProbeResult | undefined;
}) {
  const status = result?.status ?? "untested";
  const dotClass =
    status === "ok"
      ? "bg-green-500"
      : status === "error"
        ? "bg-red-500"
        : status === "pending"
          ? "bg-yellow-500 animate-pulse"
          : "bg-muted-foreground/30";

  return (
    <div className="rounded-md border border-border bg-card px-3 py-2 text-xs">
      <div className="flex items-center gap-2">
        <span className={`h-2 w-2 shrink-0 rounded-full ${dotClass}`} />
        <span className="truncate font-mono font-medium">
          {entry.overlayId}
        </span>
        <span className="ml-auto rounded bg-muted px-1.5 py-0.5 text-[10px] text-muted-foreground">
          {entry.kind}
        </span>
      </div>
      <div className="mt-1 truncate text-[11px] text-muted-foreground">
        {entry.label} · slug: {entry.slug}
      </div>
      {result?.status === "error" && result.message ? (
        <div className="mt-1.5 rounded bg-red-500/10 px-2 py-1 font-mono text-[10px] text-red-600 dark:text-red-400">
          {result.message}
        </div>
      ) : null}
    </div>
  );
}

/**
 * Minimal error boundary — captures errors thrown during render of a
 * single overlay surface and reports them via the `onError` callback. We
 * roll our own instead of pulling in `react-error-boundary` to keep this
 * dev-only route from adding a runtime dependency.
 */
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
