"use client";

/**
 * Where a schedule that runs on a Matrx 2 computer stands, in one line: "Computer removed" when its
 * computer is gone (a desktop task whose target was cleared), "Waiting for <computer> · offline
 * since …" when it is due and its computer is not connected. Nothing for a cloud task, or while the
 * computer is online (it claims the run itself). The computers come from the one lister
 * (`browserCodingDoors.reach.listComputers`); the relay that cannot say reads "status unknown".
 */
import { useEffect, useState } from "react";

import { browserCodingDoors } from "@/features/ai-work/lib/matrx2Computers";
import { supabase } from "@/utils/supabase/client";
import type { AgendaTask } from "../../types";
import { humanizeRelative } from "../../utils/triggerHumanize";

type Line = { tone: "warn" | "danger"; text: string } | null;

export function runsOnComputer(task: Pick<AgendaTask, "surfaces" | "targetDeviceId">): boolean {
  return task.targetDeviceId != null || (task.surfaces.length === 1 && task.surfaces[0] === "desktop");
}

export function ComputerTargetLine({ task }: { task: AgendaTask }) {
  const due = task.nextDueAt ?? task.triggers[0]?.nextDueAt ?? null;
  const target = task.targetDeviceId;
  const onComputer = runsOnComputer(task);
  // Known without asking anyone: no computer at all.
  const removed: Line = onComputer && target == null ? { tone: "danger", text: "Computer removed: this schedule has no computer to run on" } : null;
  const ask = onComputer && target != null && task.enabled && due !== null;
  const [asked, setAsked] = useState<{ key: string; line: Line } | null>(null);
  const key = `${target ?? ""}|${due ?? ""}`;

  useEffect(() => {
    if (!ask || target == null) return;
    let live = true;
    const answer = (l: Line) => {
      if (live) setAsked({ key, line: l });
    };
    void (async () => {
      // Not due yet: its computer claims it when the time comes.
      if (due !== null && Date.parse(due) > Date.now()) return answer(null);
      const listed = await browserCodingDoors.reach.listComputers(target);
      if ("reason" in listed) {
        console.warn("[ComputerTargetLine] status unread", listed.reason);
        return answer({ tone: "warn", text: "Waiting · status unread" });
      }
      const computer = listed.find((c) => c.deviceId === target);
      if (!computer) return answer({ tone: "danger", text: "Computer removed" });
      if (computer.online === true) return answer(null);
      const { data } = await supabase.from("app_instances").select("last_seen").eq("id", target).maybeSingle();
      const since = (data as { last_seen: string | null } | null)?.last_seen ?? null;
      const state = computer.online === null ? "status unknown" : since ? `offline since ${humanizeRelative(since)}` : "offline";
      answer({ tone: "warn", text: `Waiting for ${computer.name} · ${state}` });
    })().catch((error: unknown) => {
      console.warn("[ComputerTargetLine] status unread", error);
      answer({ tone: "warn", text: "Waiting · status unread" });
    });
    return () => {
      live = false;
    };
  }, [ask, target, key, due]);

  const line: Line = removed ?? (ask && asked?.key === key ? asked.line : null);
  if (!line) return null;
  return (
    <div
      data-computer-target={line.tone}
      className={line.tone === "danger" ? "rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive" : "rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300"}
    >
      {line.text}
    </div>
  );
}


/** The chosen computer's name and whether the relay sees it now, for the detail card. */
export function useComputerStatus(deviceId: string | null | undefined): { name: string | null; state: "online" | "offline" | "unknown" | "loading" | "removed" } {
  const [answer, setAnswer] = useState<{ key: string; name: string | null; state: "online" | "offline" | "unknown" | "removed" } | null>(null);
  useEffect(() => {
    if (!deviceId) return;
    let live = true;
    void browserCodingDoors.reach
      .listComputers(deviceId)
      .then((listed) => {
        if (!live) return;
        if ("reason" in listed) return setAnswer({ key: deviceId, name: null, state: "unknown" });
        const c = listed.find((x) => x.deviceId === deviceId);
        setAnswer(c ? { key: deviceId, name: c.name, state: c.online === true ? "online" : c.online === false ? "offline" : "unknown" } : { key: deviceId, name: null, state: "removed" });
      })
      .catch(() => live && setAnswer({ key: deviceId, name: null, state: "unknown" }));
    return () => {
      live = false;
    };
  }, [deviceId]);
  if (!deviceId) return { name: null, state: "removed" };
  return answer && answer.key === deviceId ? answer : { name: null, state: "loading" };
}
