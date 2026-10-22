/**
 * /devices/[deviceId] — one computer, driven from anywhere. Phone (Termius bones): a header with
 * back, name and the Live / Reconnecting… / Offline pill; a segmented Terminal | Files | Sessions |
 * Info; the terminal fills the screen down to the keyboard. Desktop: Info in a left pane,
 * Terminal | Files | Sessions on the right. Sessions is the computer's Claude Code and Codex
 * sessions, live (code from anywhere). View, shell, folder and open session live in the URL (?view,
 * ?t, ?path, ?s), written with history.replaceState so switching never refetches the route.
 */

"use client";

import { useSearchParams, useRouter } from "next/navigation";
import { SegmentedControl } from "@ai-matrx/design-system/controls";
import { ChevronLeftTapButton } from "@ai-matrx/design-system/tap-target/buttons";

import PageHeader from "@/features/shell/components/header/PageHeader";
import { cn } from "@/lib/utils";
import { replaceAddressWithoutNavigating } from "@/lib/url-state/addressWithoutNavigating";

import { lastSeenIso, sinceLabel } from "../platform";
import { useNow } from "../useNow";
import type { DeviceRow } from "../types";
import { FilesPanel } from "./FilesPanel";
import { InfoPanel } from "./InfoPanel";
import { SessionsPanel } from "./sessions/SessionsPanel";
import { StatusPill } from "./StatusPill";
import { TerminalPanel } from "./TerminalPanel";
import { useDeviceClient } from "./useDeviceClient";
import { SurfaceRuntimeProvider } from "@ai-matrx/chat/surfaces/runtime/SurfaceRuntimeContext";
import type { SurfaceScopePayload } from "@ai-matrx/chat/surfaces/types";
import { DEVICE_CONSOLE_SURFACE_NAME } from "@/features/surfaces/manifests/device-console.manifest";

type View = "terminal" | "files" | "sessions" | "info";

const PHONE_VIEWS = [
  { value: "terminal", label: "Terminal" },
  { value: "files", label: "Files" },
  { value: "sessions", label: "Sessions" },
  { value: "info", label: "Info" },
];
const DESKTOP_VIEWS = PHONE_VIEWS.slice(0, 3);

function readView(raw: string | null): View {
  return raw === "files" || raw === "info" || raw === "sessions" ? raw : "terminal";
}

/** Rewrite the query in place: no navigation, no RSC refetch, the back stack untouched. */
function setQuery(patch: Record<string, string | null>): void {
  const url = new URL(window.location.href);
  for (const [k, v] of Object.entries(patch)) {
    if (v === null) url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  }
  replaceAddressWithoutNavigating(`${url.pathname}${url.search}${url.hash}`);
}

function offlineText(name: string, lastIso: string | null, now: number): string {
  return lastIso ? `${name} is offline · last seen ${sinceLabel(lastIso, now)}` : `${name} is offline`;
}

export function DeviceConsole({ device }: { device: DeviceRow }) {
  const router = useRouter();
  const search = useSearchParams();
  const now = useNow();
  const { client, state, device: relay, status } = useDeviceClient(device.id);
  const view = readView(search.get("view"));
  const live = state.status === "open";
  const name = device.instance_name?.trim() || "Unnamed device";
  const blocked = status.pill === "offline" ? "Computer is offline" : status.pill === "refused" ? status.detail : null;

  const offlineLine =
    status.pill === "offline"
      ? offlineText(name, lastSeenIso(device, relay), now)
      : status.detail;

  const header = (
    // The assists control may rest in this header's spare room rather than on the console.
    <div className="flex min-w-0 items-center gap-1" data-assist-dock-slot="header">
      {/* Transparent, as the title and pill beside it: glass floats only over moving content. */}
      <ChevronLeftTapButton
        variant="transparent"
        ariaLabel="Back to devices"
        onClick={() => {
          if (window.history.length > 1) router.back();
          else router.push("/devices");
        }}
      />
      <span className="min-w-0 truncate text-[15px] font-semibold text-foreground">{name}</span>
      <StatusPill pill={status.pill} label={status.label} className="ml-1" />
    </div>
  );

  // matrx-user/device-console — read-only: the terminal and files are the person's own hands on their
  // computer; an agent never types into it through this page.
  const getSurfaceScope = () =>
    ({
      device_id: device.id,
      device_name: name,
      device_platform: device.platform,
      device_os_version: device.os_version,
      device_app_version: device.app_version,
      device_hostname: device.hostname ?? null,
      device_status: status.pill,
      device_status_label: status.label,
      device_status_detail: offlineLine || null,
      device_connected: live,
      console_view: view,
      files_path: search.get("path"),
      terminal_session_id: search.get("t"),
      selected_session: search.get("s"),
    }) as SurfaceScopePayload;

  return (
    <SurfaceRuntimeProvider surfaceName={DEVICE_CONSOLE_SURFACE_NAME} getScope={getSurfaceScope} isEditable={false}>
    <div className="flex h-full flex-col overflow-hidden bg-textured pt-[var(--shell-header-h)] lg:flex-row">
      <PageHeader>{header}</PageHeader>

      {/* Desktop: what this computer is, beside what you do on it. */}
      <aside className="hidden min-h-0 w-[340px] shrink-0 flex-col border-r border-border pt-3 lg:flex">
        <InfoPanel client={client} live={live} device={device} relay={relay} status={status} visible />
      </aside>

      <main className="flex min-h-0 min-w-0 flex-1 flex-col">
        {offlineLine ? (
          <div className="flex h-9 shrink-0 items-center gap-2 border-b border-border bg-muted/50 px-4 text-[13px] text-muted-foreground" role="status">
            <span className={cn("h-2 w-2 shrink-0 rounded-full", status.pill === "refused" ? "bg-destructive" : "bg-muted-foreground/60")} aria-hidden="true" />
            <span className="truncate" suppressHydrationWarning>{offlineLine}</span>
          </div>
        ) : null}

        <div className="shrink-0 px-4 py-2 lg:hidden">
          <SegmentedControl aria-label="View" value={view} onValueChange={(v) => setQuery({ view: v === "terminal" ? null : v })} data={PHONE_VIEWS} fill />
        </div>
        <div className="hidden shrink-0 px-3 py-2 lg:block">
          <SegmentedControl aria-label="View"
            value={view === "info" ? "terminal" : view}
            onValueChange={(v) => setQuery({ view: v === "terminal" ? null : v })}
            data={DESKTOP_VIEWS}
          />
        </div>

        <TerminalPanel
          client={client}
          deviceId={device.id}
          blocked={blocked}
          live={live}
          resourceId={search.get("t")}
          onResourceChange={(id) => setQuery({ t: id })}
          visible={view === "terminal" || view === "info"}
          hiddenOnPhone={view === "info"}
        />
        <FilesPanel client={client} live={live} blocked={blocked} path={search.get("path")} onPathChange={(p) => setQuery({ path: p })} visible={view === "files"} />
        <SessionsPanel
          client={client}
          console={status}
          deviceName={name}
          visible={view === "sessions"}
          selected={search.get("s")}
          onSelect={(target) => setQuery({ s: target })}
        />
        <div className={cn("flex min-h-0 flex-1 flex-col lg:hidden", view !== "info" && "hidden")}>
          <InfoPanel client={client} live={live} device={device} relay={relay} status={status} visible={view === "info"} />
        </div>
      </main>
    </div>
    </SurfaceRuntimeProvider>
  );
}
