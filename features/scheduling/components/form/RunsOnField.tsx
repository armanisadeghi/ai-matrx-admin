"use client";

/**
 * "Runs on": the cloud (default) or one of the person's Matrx 2 computers, from the one lister
 * (`browserCodingDoors.reach.listComputers`). On a computer the schedule is a Claude Code or Codex
 * session started there at each run, in a folder on that computer, with the person's chosen account
 * (blank: that computer's default login). An offline computer can still be chosen: it runs when
 * Matrx 2 is open there again, and the schedule says it is waiting.
 */
import { useEffect, useState } from "react";
import { ErrorNotice } from "@ai-matrx/design-system";
import { Select } from "@ai-matrx/design-system/controls";

import { browserCodingDoors } from "@/features/ai-work/lib/matrx2Computers";
import type { Matrx2ComputerStatus } from "@/features/ai-work/lib/matrx2Coding";

export interface ComputerCodingChoice {
  deviceId: string;
  folder: string;
  provider: "claude" | "codex";
  accountProfileId: string;
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

  const chosen = value ? computers?.find((c) => c.deviceId === value.deviceId) : null;
  return (
    <div className="space-y-2" data-runs-on={value?.deviceId ?? "cloud"}>
      <Select<string>
        aria-label="Runs on"
        value={value?.deviceId ?? "cloud"}
        options={[
          { value: "cloud", label: "AI Matrx cloud" },
          ...(value && !computers?.some((c) => c.deviceId === value.deviceId) ? [{ value: value.deviceId, label: "This computer (not listed)" }] : []),
          ...(computers ?? []).map((c) => ({ value: c.deviceId, label: `${c.name} · ${c.online === true ? "online" : c.online === false ? "offline" : "status unknown"}` })),
        ]}
        onValueChange={(id) =>
          onChange(id !== "cloud" ? { deviceId: id, folder: value?.folder ?? "", provider: value?.provider ?? "claude", accountProfileId: value?.accountProfileId ?? "" } : null)
        }
      />
      {problem && <ErrorNotice title="Your computers could not be listed" message={problem} />}
      {value && (
        <div className="grid gap-2 sm:grid-cols-2">
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
      {error && <ErrorNotice title="This schedule cannot be saved yet" message={error} />}
    </div>
  );
}
