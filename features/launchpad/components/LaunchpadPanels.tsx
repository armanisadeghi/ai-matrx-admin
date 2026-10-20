"use client";

// features/launchpad/components/LaunchpadPanels.tsx — the launchpad's side panel (floats over the right edge; it
// never pushes the grid): Add (the catalog grouped by Board section), Set up (one widget's size and fields),
// and History (every saved version; click = preview in place, Set active = restore as a new version).
// Adapted from the Start page's panel.
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { Button, Field, Select, Switch } from "@ai-matrx/design-system/controls";
import { cn } from "@ai-matrx/design-system";
import { formatRelativeTime } from "@ai-matrx/kit/format";
import type { RecordHistoryEntry } from "@ai-matrx/records/react";
import type { LaunchpadWidget } from "@/features/shell/shell-layout/contract";
import { BOARD_SECTIONS } from "@/features/board/items/types";
import { METRIC_CARDS } from "@/features/dashboard/constants/metricCards";
import { appPagePath } from "@/features/board/items/page-items";
import { listPlaceableApplets, type AppletCardInfo } from "@/features/applets/embed/appletsPort";
import { ErrorAlchemyMenu } from "@/components/errors/ErrorAlchemyMenu";
import { LAUNCHPAD_WIDGET_CATALOG } from "../widgets/catalog";
import { DataPagePicker, DataTablePicker } from "../widgets/DataPagePicker";
import { configText, type LaunchpadWidgetSpec } from "../widgets/types";

function PanelShell({ title, onClose, children }: { title: string; onClose: () => void; children: React.ReactNode }) {
  return (
    <aside
      aria-label={title}
      data-matrx-floating-bottom
      className="fixed bottom-3 right-3 top-[calc(var(--shell-header-h)+0.75rem)] z-30 flex w-80 max-w-[calc(100vw-1.5rem)] flex-col overflow-hidden rounded-lg border border-border bg-card shadow-lg"
    >
      <header className="flex h-10 shrink-0 items-center gap-2 border-b border-border px-3">
        <h2 className="text-sm font-medium">{title}</h2>
        <Button variant="quiet" className="ml-auto" icon={<X />} aria-label="Close" onClick={onClose} />
      </header>
      <div className="min-h-0 flex-1 overflow-y-auto p-2">{children}</div>
    </aside>
  );
}

export function AddWidgetPanel({ onAdd, onClose }: { onAdd: (spec: LaunchpadWidgetSpec) => void; onClose: () => void }) {
  return (
    <PanelShell title="Add a widget" onClose={onClose}>
      {BOARD_SECTIONS.map((section) => {
        const specs = LAUNCHPAD_WIDGET_CATALOG.filter((s) => s.section === section.key);
        if (specs.length === 0) return null;
        return (
          <div key={section.key} className="mb-3">
            <h3 className="px-2 pb-1 text-xs font-medium text-muted-foreground">{section.label}</h3>
            <ul>
              {specs.map((spec) => {
                const Icon = spec.icon;
                return (
                  <li key={spec.type}>
                    <button
                      type="button"
                      data-clickable
                      onClick={() => onAdd(spec)}
                      className="flex h-8 w-full items-center gap-2 rounded px-2 text-left text-sm hover:bg-muted"
                    >
                      <Icon className="h-4 w-4 shrink-0 text-muted-foreground" aria-hidden />
                      <span className="truncate">{spec.label}</span>
                      <span className="ml-auto truncate text-xs text-muted-foreground">{spec.describe(spec.defaultConfig)}</span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </PanelShell>
  );
}

/** The launchpads a link widget can point at (the person's own and their organization's). */
export interface LaunchpadChoice {
  key: string;
  title: string;
}

/** One input of the widget being set up and what on the page can feed it (`compatibleSources`). */
export interface WidgetConnectionChoice {
  key: string;
  label: string;
  /** `busAddress(widgetId, key)` of the connected source, or "" for none. */
  value: string;
  options: readonly { value: string; label: string }[];
}

const NOT_CONNECTED = "none";

export function ConfigureWidgetPanel({
  widget,
  spec,
  launchpads,
  connections,
  onResize,
  onConfigure,
  onConnect,
  onClose,
}: {
  widget: LaunchpadWidget;
  spec: LaunchpadWidgetSpec | undefined;
  launchpads: readonly LaunchpadChoice[];
  connections: readonly WidgetConnectionChoice[];
  onResize: (size: { w?: number; h?: number }) => void;
  onConfigure: (patch: Record<string, string>) => void;
  /** Connect input `key` to the source at `address` (null = disconnect). */
  onConnect: (key: string, address: string | null) => void;
  onClose: () => void;
}) {
  const lg = widget.layout.lg;
  const widths = spec ? range(spec.sizes.minW, spec.sizes.maxW ?? 12) : range(1, 12);
  const heights = spec ? range(spec.sizes.minH, Math.min(spec.sizes.maxH ?? 40, 40)) : range(2, 40);
  return (
    <PanelShell title={spec ? spec.describe(widget.config) : "Unavailable widget"} onClose={onClose}>
      <div className="flex flex-col gap-3 p-1">
        <div className="grid grid-cols-2 gap-2">
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Width
            <Select
              aria-label="Width"
              value={String(lg.w)}
              options={widths.map((n) => ({ value: String(n), label: `${n} of 12` }))}
              onValueChange={(v) => onResize({ w: Number(v) })}
            />
          </label>
          <label className="flex flex-col gap-1 text-xs text-muted-foreground">
            Height
            <Select
              aria-label="Height"
              value={String(lg.h)}
              options={heights.map((n) => ({ value: String(n), label: `${n} rows` }))}
              onValueChange={(v) => onResize({ h: Number(v) })}
            />
          </label>
        </div>
        {spec?.fields.map((field) => {
          const value = configText(widget.config, field.key);
          const set = (v: string) => onConfigure({ [field.key]: v });
          return (
            <label key={field.key} className="flex flex-col gap-1 text-xs text-muted-foreground">
              {field.label}
              {field.picker === "metricKeys" ? (
                <MetricKeysPicker value={value} onChange={set} />
              ) : field.picker === "dataTable" ? (
                <DataTablePicker value={value} onChange={set} />
              ) : field.picker === "dataPage" ? (
                <DataPagePicker value={value} onChange={set} />
              ) : field.picker === "launchpad" ? (
                <Select
                  aria-label={field.label}
                  value={value}
                  options={launchpads.map((l) => ({ value: l.key, label: l.title }))}
                  onValueChange={(key) => onConfigure({ key, title: launchpads.find((l) => l.key === key)?.title ?? key })}
                />
              ) : field.picker === "applet" ? (
                <AppletPicker value={value} onChange={(appId, name) => onConfigure({ appId, name })} />
              ) : field.picker === "appPage" ? (
                <AppPagePicker value={value} onChange={set} />
              ) : field.options ? (
                <Select aria-label={field.label} value={value} options={field.options} onValueChange={set} />
              ) : (
                // ui-exception: a raw id value, not prose a person writes
                <Field aria-label={field.label} defaultValue={value} onBlur={(e) => set(e.currentTarget.value.trim())} />
              )}
            </label>
          );
        })}
        {connections.length ? (
          <div className="flex flex-col gap-2 border-t border-border pt-3" data-launchpad-connections>
            {connections.map((c) => (
              <label key={c.key} className="flex flex-col gap-1 text-xs text-muted-foreground">
                {`${c.label} from`}
                <Select
                  aria-label={`${c.label} from`}
                  value={c.value || NOT_CONNECTED}
                  disabled={c.options.length === 0}
                  options={[
                    { value: NOT_CONNECTED, label: c.options.length ? "Not connected" : "Nothing on this page offers it" },
                    ...c.options,
                  ]}
                  onValueChange={(v) => onConnect(c.key, v === NOT_CONNECTED ? null : v)}
                />
              </label>
            ))}
          </div>
        ) : null}
      </div>
    </PanelShell>
  );
}

function range(from: number, to: number): number[] {
  return Array.from({ length: Math.max(0, to - from + 1) }, (_, i) => from + i);
}

/** Any Applet this person may place (the Applets home's own read). */
function AppletPicker({ value, onChange }: { value: string; onChange: (appId: string, name: string) => void }) {
  const [state, setState] = useState<{ apps: AppletCardInfo[] | null; error: string | null }>({ apps: null, error: null });
  useEffect(() => {
    let live = true;
    listPlaceableApplets().then(
      (apps) => live && setState({ apps, error: null }),
      (e: unknown) => live && setState({ apps: [], error: e instanceof Error ? e.message : String(e) }),
    );
    return () => {
      live = false;
    };
  }, []);
  if (state.error) return <p className="text-xs text-destructive">{state.error}<ErrorAlchemyMenu error={state.error} /></p>;
  const apps = state.apps ?? [];
  if (state.apps && apps.length === 0) return <p className="text-xs text-muted-foreground">No Applets yet</p>;
  return (
    <Select
      aria-label="Applet"
      value={value}
      disabled={!state.apps}
      options={state.apps ? apps.map((a) => ({ value: a.id, label: a.name })) : [{ value, label: "Loading Applets" }]}
      onValueChange={(id) => onChange(id, apps.find((a) => a.id === id)?.name ?? "")}
    />
  );
}

/** A page of this app by its address ("/meetings", or a full link to a page here). */
function AppPagePicker({ value, onChange }: { value: string; onChange: (path: string) => void }) {
  const [draft, setDraft] = useState(value);
  const path = typeof window === "undefined" ? null : appPagePath(draft, window.location.origin);
  return (
    <span className="flex flex-col gap-1">
      {/* ui-exception: a page address, not prose a person writes */}
      <Field
        aria-label="Page address"
        value={draft}
        placeholder="/meetings"
        onChange={(e) => setDraft(e.currentTarget.value)}
        onBlur={() => path && path !== value && onChange(path)}
        onKeyDown={(e) => {
          if (e.key === "Enter" && path) onChange(path);
        }}
      />
      {draft.trim() && !path ? <span className="text-xs text-destructive">Not a page of this app</span> : null}
    </span>
  );
}

export function HistoryPanel({
  entries,
  error,
  author,
  note,
  previewVersion,
  busy,
  onPreview,
  onSetActive,
  onClose,
}: {
  entries: RecordHistoryEntry[] | null;
  error: string | null;
  author: (e: RecordHistoryEntry) => string;
  note: (e: RecordHistoryEntry) => string;
  previewVersion: number | null;
  busy: boolean;
  onPreview: (version: number | null) => void;
  onSetActive: (version: number) => void;
  onClose: () => void;
}) {
  const [now] = useState(() => Date.now());
  const newest = entries?.[0]?.version ?? null;
  return (
    <PanelShell title="History" onClose={onClose}>
      {error ? (
        <p className="p-2 text-xs text-destructive">
          {error}
          <ErrorAlchemyMenu error={error} />
        </p>
      ) : null}
      {!entries && !error ? (
        <ul aria-busy="true">
          {Array.from({ length: 6 }, (_, i) => (
            <li key={i} className="h-12 px-2 py-2">
              <span className="block h-3 w-2/3 animate-pulse rounded bg-muted" />
            </li>
          ))}
        </ul>
      ) : null}
      <ul>
        {entries?.map((e) => {
          const active = e.version === newest;
          const selected = e.version === previewVersion;
          return (
            <li key={e.version} className={cn("flex min-h-14 items-center gap-1 rounded hover:bg-muted", selected && "bg-muted")}>
              <button
                type="button"
                data-clickable
                aria-pressed={selected}
                onClick={() => onPreview(active ? null : e.version)}
                className="flex min-w-0 flex-1 items-center gap-2 px-2 py-1.5 text-left"
              >
                <span className="w-8 shrink-0 text-xs tabular-nums text-muted-foreground">{`v${e.version}`}</span>
                <span className="min-w-0 flex-1">
                  <span className="line-clamp-2 text-sm" title={note(e)}>
                    {note(e)}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">{`${author(e)} · ${relative(e.occurred_at, now)}`}</span>
                </span>
              </button>
              {active ? (
                <span className="shrink-0 pr-2 text-xs text-muted-foreground">Active</span>
              ) : selected ? (
                <Button variant="primary" className="mr-1 shrink-0" disabled={busy} onClick={() => onSetActive(e.version)}>
                  Set active
                </Button>
              ) : null}
            </li>
          );
        })}
      </ul>
    </PanelShell>
  );
}

function relative(iso: string, now: number): string {
  return formatRelativeTime(iso, { now, minUnit: "minute", absoluteAfter: 48 * 3_600_000, absolute: "monthDay" });
}

/** Which counts the strip shows: one switch per dashboard count, in the dashboard's order. */
function MetricKeysPicker({ value, onChange }: { value: string; onChange: (keys: string) => void }) {
  const on = new Set(value.split(",").map((k) => k.trim()).filter(Boolean));
  return (
    <ul className="flex flex-col">
      {METRIC_CARDS.map((card) => (
        <li key={card.key} className="flex h-8 items-center justify-between gap-2 text-sm text-foreground">
          <span className="truncate">{card.label}</span>
          <Switch
            aria-label={card.label}
            checked={on.has(card.key)}
            onCheckedChange={(checked: boolean) => {
              const next = METRIC_CARDS.map((c) => c.key).filter((k) => (k === card.key ? checked : on.has(k)));
              onChange(next.join(","));
            }}
          />
        </li>
      ))}
    </ul>
  );
}
