"use client";

/**
 * "Runs on": the cloud (default) or one of the person's Matrx 2 computers, from the one lister
 * (`browserCodingDoors.reach.listComputers`). On a computer the schedule is a Claude Code or Codex
 * session started there at each run, in a folder on that computer, with the person's chosen account
 * (blank: that computer's default login), or an agent run on AI Matrx bound to that computer (its
 * desktop tools reach it), started there at each run. An offline computer can still be chosen: it runs when
 * Matrx 2 is open there again, and the schedule says it is waiting.
 */
import { useCallback, useEffect, useState } from "react";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Select } from "@ai-matrx/design-system/controls";

import { browserCodingDoors } from "@/features/ai-work/lib/matrx2Computers";
import type { Matrx2ComputerStatus } from "@/features/ai-work/lib/matrx2Coding";
import { ComputerConnection, type ComputerConnectionState } from "@/features/ai-work/compose/components/RunsOnStep";
import { ComputerWorkFields } from "@/features/ai-work/components/ComputerWorkFields";
import { duplicateNames, lastSeenLabel, type ComputerRunRequest } from "@/features/ai-work/lib/computerChooser";
import { supabase } from "@/utils/supabase/client";
import { HomeStep } from "@/features/ai-work/compose/components/HomeStep";
import type { SavedRequestHome } from "@/features/ai-work/compose/savedRequests";

export interface ComputerCodingChoice {
  deviceId: string;
  /** A coding session started there, or the agent chosen below run on this computer. */
  mode: "coding" | "agent";
  folder: string;
  provider: "claude" | "codex";
  accountProfileId: string;
  /** Where each run's chat is filed (project, task, War Room); the computer files it. */
  homes?: SavedRequestHome[];
}

interface Props {
  value: ComputerCodingChoice | null;
  onChange: (next: ComputerCodingChoice | null) => void;
  error?: string;
}

const inputClass = "h-8 w-full rounded-md border border-border bg-background px-2 text-base md:text-sm";

export function RunsOnField({ value, onChange, error }: Props) {
  const [computers, setComputers] = useState<Matrx2ComputerStatus[] | null>(null);
  const [problem, setProblem] = useState<string | null>(null);

  useEffect(() => {
    let live = true;
    browserCodingDoors.reach
      .listComputers()
      .then((listed) => {
        if (!live) return;
        if ("reason" in listed) setProblem(listed.reason);
        else setComputers(listed);
      })
      .catch((e: unknown) => live && setProblem(e instanceof Error ? e.message : String(e)));
    return () => {
      live = false;
    };
  }, []);

  const [lastSeen, setLastSeen] = useState<Record<string, string | null>>({});
  const [connection, setConnection] = useState<ComputerConnectionState | null>(null);
  useEffect(() => {
    if (!computers?.length) return;
    let live = true;
    void supabase
      .from("app_instances")
      .select("id, last_seen")
      .in("id", computers.map((c) => c.deviceId))
      .then(({ data }) => {
        if (live) setLastSeen(Object.fromEntries(((data ?? []) as Array<{ id: string; last_seen: string | null }>).map((r) => [r.id, r.last_seen])));
      });
    return () => {
      live = false;
    };
  }, [computers]);
  const dupes = duplicateNames((computers ?? []).map((c) => c.name));

  const chosen = value ? computers?.find((c) => c.deviceId === value.deviceId) : null;
  // The shared fields report the work once it can run there; only a real change is passed on.
  const onWork = useCallback(
    (work: ComputerRunRequest | null) => {
      if (!work || !value) return;
      const next = { ...value, provider: work.provider, folder: work.folder, accountProfileId: work.accountProfileId ?? "" };
      if (next.provider !== value.provider || next.folder !== value.folder || next.accountProfileId !== value.accountProfileId) onChange(next);
    },
    [value, onChange],
  );
  return (
    <div className="space-y-2" data-runs-on={value?.deviceId ?? "cloud"}>
      <Select<string>
        aria-label="Runs on"
        value={value?.deviceId ?? "cloud"}
        options={[
          { value: "cloud", label: "AI Matrx cloud" },
          ...(value && !computers?.some((c) => c.deviceId === value.deviceId) ? [{ value: value.deviceId, label: "This computer (not listed)" }] : []),
          ...(computers ?? []).map((c) => ({
            value: c.deviceId,
            label: [c.name, c.online === true ? "online" : c.online === false ? "offline" : "status unknown", dupes.has(c.name) ? lastSeenLabel(lastSeen[c.deviceId]) : ""].filter(Boolean).join(" · "),
          })),
        ]}
        onValueChange={(id) =>
          onChange(id !== "cloud" ? { deviceId: id, mode: value?.mode ?? "coding", folder: value?.folder ?? "", provider: value?.provider ?? "claude", accountProfileId: value?.accountProfileId ?? "" } : null)
        }
      />
      {problem && <ErrorNotice title="Your computers could not be listed" message={problem} />}
      {value && (
        <Select<"coding" | "agent">
          aria-label="What runs there"
          value={value.mode}
          options={[
            { value: "coding", label: "A coding session there" },
            { value: "agent", label: "Run an agent on this computer" },
          ]}
          onValueChange={(mode) => onChange({ ...value, mode })}
        />
      )}
      {value?.mode === "agent" && (
        <p className="text-xs text-muted-foreground" data-runs-on-mode="agent">
          The agent below runs on AI Matrx at each run, using {chosen?.name ?? "that computer"} for its desktop tools. It runs while Matrx 2 is open there.
        </p>
      )}
      {value && value.mode === "coding" && chosen?.online === true && (
        <>
          <ComputerConnection key={value.deviceId} deviceId={value.deviceId} onConnection={setConnection} />
          {connection && connection.deviceId === value.deviceId ? (
            <ComputerWorkFields
              key={value.deviceId}
              computer={{ device: { id: value.deviceId }, name: chosen.name }}
              connection={connection}
              initial={{ deviceId: value.deviceId, name: chosen.name, provider: value.provider, folder: value.folder, accountProfileId: value.accountProfileId || null }}
              onPlan={onWork}
            />
          ) : (
            <p className="text-xs text-muted-foreground">Connecting to {chosen.name}…</p>
          )}
        </>
      )}
      {value && value.mode === "coding" && chosen?.online !== true && (
        <div className="grid gap-2 sm:grid-cols-2">
          <p className="text-xs text-muted-foreground sm:col-span-2">Folder and account suggestions appear while {chosen?.name ?? "that computer"} is online</p>
          <label className="space-y-1 text-xs sm:col-span-2">
            <span>Folder on {chosen?.name ?? "that computer"}</span>
            <input className={inputClass} value={value.folder} placeholder="/Users/you/Projects/site" onChange={(e) => onChange({ ...value, folder: e.target.value })} />
          </label>
          <label className="space-y-1 text-xs">
            <span>Runs as</span>
            <Select<"claude" | "codex">
              aria-label="Runs as"
              value={value.provider}
              options={[
                { value: "claude", label: "Claude Code" },
                { value: "codex", label: "Codex" },
              ]}
              onValueChange={(provider) => onChange({ ...value, provider })}
            />
          </label>
          <label className="space-y-1 text-xs">
            <span>Account (blank: that computer's default)</span>
            <input className={inputClass} value={value.accountProfileId} onChange={(e) => onChange({ ...value, accountProfileId: e.target.value })} />
          </label>
          <p className="text-xs text-muted-foreground sm:col-span-2">Each run starts a new session there with the prompt above. A run started by a schedule is not filed under your homes yet; it reaches AI Matrx when the computer delivers its history.</p>
        </div>
      )}
      {value && value.mode === "coding" && (
        <div className="space-y-1" data-runs-on-homes>
          <span className="text-xs">File each run under</span>
          {/* /work/new's own home chooser (HomeStep), shared — the computer files each run's chat there. */}
          <HomeStep homes={value.homes ?? []} onChange={(homes) => onChange({ ...value, homes })} />
        </div>
      )}
      {error && <ErrorNotice title="This schedule cannot be saved yet" message={error} />}
    </div>
  );
}
