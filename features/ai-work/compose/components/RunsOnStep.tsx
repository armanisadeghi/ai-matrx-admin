"use client";

/**
 * Step 1's "Runs on": the AI Matrx cloud (the default) or one of the person's Matrx 2 computers.
 * Every computer is listed; one that is offline, unreachable or too old is shown with its reason
 * and cannot be chosen. Choosing an online one connects to it straight through the relay (the
 * device console's own client) and asks IT for what it can do: Claude Code and Codex on it, its
 * recent folders, and its saved Codex accounts. What the computer cannot answer is said.
 */

import { useEffect, useRef, useState } from "react";
import { CircleDot, Lock, Monitor } from "lucide-react";
import { getClaimsUser } from "@ai-matrx/auth";
import { DesktopProtocolError } from "@ai-matrx/desktop-protocol";
import type { DesktopClient } from "@ai-matrx/desktop-protocol/client";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Button, Field, Select } from "@ai-matrx/design-system/controls";

import { cn } from "@/lib/utils";
import { supabase } from "@/utils/supabase/client";
import { getAccessTokenOrNull } from "@/lib/python-client";
import { useDeviceClient } from "@/features/files/devices/console/useDeviceClient";
import { ComputerWorkFields } from "@/features/ai-work/components/ComputerWorkFields";
import type { ConsoleStatus } from "@/features/files/devices/console/connection";
import { computerRowDetail, distinguishing, duplicateNames, listChooserComputers, type ChooserComputer, type ComputerRunRequest } from "@/features/ai-work/lib/computerChooser";

export type CodingProvider = "claude" | "codex";

/** What Run needs to start work on the chosen computer; null until it is ready. */
export type ComputerPlan = ComputerRunRequest;

/** The one live connection to the chosen computer, owned by the page (it outlives a collapsed step). */
export interface ComputerConnectionState {
  deviceId: string;
  client: DesktopClient;
  status: ConsoleStatus;
}

/**
 * Mount once per chosen computer, OUTSIDE any collapsible step: a step that closes unmounts its
 * body, and a connection owned there would close under a plan that still points at it.
 */
export function ComputerConnection({ deviceId, onConnection }: { deviceId: string; onConnection: (c: ComputerConnectionState | null) => void }) {
  const { client, status } = useDeviceClient(deviceId);
  // The status object is rebuilt on every render: report it only when what it SAYS changes.
  const said = `${status.pill}|${status.label}|${status.detail ?? ""}`;
  const latest = useRef(status);
  useEffect(() => {
    latest.current = status;
  });
  useEffect(() => {
    onConnection({ deviceId, client, status: latest.current });
  }, [deviceId, client, said, onConnection]);
  useEffect(() => () => onConnection(null), [onConnection]);
  return null;
}

type ListState = { state: "loading" } | { state: "ready"; computers: ChooserComputer[] } | { state: "failed"; reason: string };

const DEFAULT_ACCOUNT = "__default__";

function RunsOnOption({
  selected,
  selectable,
  label,
  detail,
  onSelect,
  testId,
}: {
  selected: boolean;
  selectable: boolean;
  label: string;
  detail: string;
  onSelect: () => void;
  testId: string;
}) {
  return (
    <li>
      <button
        type="button"
        disabled={!selectable}
        onClick={onSelect}
        aria-pressed={selected}
        data-testid={testId}
        className={cn(
          "flex w-full items-start gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors",
          selected ? "border-primary bg-primary/5" : "border-border bg-background",
          selectable ? "hover:border-primary/50" : "opacity-70",
        )}
      >
        {selectable ? (
          <CircleDot className={cn("mt-0.5 h-4 w-4 shrink-0", selected ? "text-primary" : "text-muted-foreground")} />
        ) : (
          <Lock className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0">
          <span className="block text-sm font-medium text-foreground">{label}</span>
          <span className="block text-xs text-muted-foreground">{detail}</span>
        </span>
      </button>
    </li>
  );
}

export function RunsOnStep({
  deviceId,
  connection,
  plan,
  onChange,
  onPlan,
}: {
  /** null = the AI Matrx cloud. */
  deviceId: string | null;
  /** The page's live connection to the chosen computer (see ComputerConnection). */
  connection: ComputerConnectionState | null;
  /** The plan already made, so reopening this step keeps the choices. */
  plan: ComputerPlan | null;
  onChange: (deviceId: string | null, name: string | null) => void;
  onPlan: (plan: ComputerPlan | null) => void;
}) {
  const [list, setList] = useState<ListState>({ state: "loading" });
  const [showUnavailable, setShowUnavailable] = useState(false);

  useEffect(() => {
    let alive = true;
    void (async () => {
      const token = await getAccessTokenOrNull();
      const {
        data: { user },
      } = await getClaimsUser(supabase);
      if (!token || !user?.id) {
        if (alive) setList({ state: "failed", reason: "Sign in to see your computers" });
        return;
      }
      try {
        const computers = await listChooserComputers(supabase, user.id, token);
        if (alive) setList({ state: "ready", computers });
      } catch (error) {
        if (alive) setList({ state: "failed", reason: `Couldn't read your computers: ${error instanceof Error ? error.message : String(error)}` });
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const unavailable = list.state === "ready" ? list.computers.filter((c) => !c.selectable).length : 0;
  const dupes = duplicateNames(list.state === "ready" ? list.computers.map((c) => c.name) : []);
  const chosen = list.state === "ready" ? list.computers.find((c) => c.device.id === deviceId && c.selectable) ?? null : null;

  return (
    <div className="flex flex-col gap-2" data-testid="runs-on">
      <span className="text-xs font-medium text-foreground">Runs on</span>
      <ul className="flex flex-col gap-2">
        <RunsOnOption
          testId="runs-on-cloud"
          selected={deviceId === null}
          selectable
          label="AI Matrx cloud"
          detail="Nothing to install; runs in your account"
          onSelect={() => {
            onChange(null, null);
            onPlan(null);
          }}
        />
        {list.state === "ready" &&
          list.computers
            .filter((computer) => computer.selectable || showUnavailable || computer.device.id === deviceId)
            .map((computer) => (
            <RunsOnOption
              key={computer.device.id}
              testId={`runs-on-computer-${computer.device.id}`}
              selected={deviceId === computer.device.id}
              selectable={computer.selectable}
              label={computer.name}
              detail={[
                computer.selectable ? "Online · Claude Code or Codex on it" : (computer.reason ?? "Not available"),
                dupes.has(computer.name) && computer.selectable ? distinguishing(computer.device) : computerRowDetail(computer.device, computer.selectable),
              ]
                .filter(Boolean)
                .join(" · ")}
              onSelect={() => {
                onPlan(null);
                onChange(computer.device.id, computer.name);
              }}
            />
          ))}
      </ul>
      {unavailable > 0 && (
        <Button variant="quiet" className="self-start" onClick={() => setShowUnavailable((v) => !v)} data-testid="runs-on-unavailable">
          {showUnavailable ? `Hide ${unavailable} unavailable` : `${unavailable} offline or unavailable`}
        </Button>
      )}
      {list.state === "loading" && <p className="text-xs text-muted-foreground">Checking your computers…</p>}
      {list.state === "failed" && <ErrorNotice size="inline" className="text-xs" message={list.reason} />}
      {list.state === "ready" && list.computers.length === 0 && (
        <p className="text-xs text-muted-foreground">No computer runs Matrx 2 on this account</p>
      )}
      {chosen &&
        (connection && connection.deviceId === chosen.device.id ? (
          <ComputerWorkFields key={chosen.device.id} computer={chosen} connection={connection} initial={plan} onPlan={onPlan} />
        ) : (
          <p className="text-xs text-muted-foreground">Connecting to {chosen.name}…</p>
        ))}
    </div>
  );
}
