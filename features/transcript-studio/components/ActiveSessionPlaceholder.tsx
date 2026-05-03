"use client";

import { useMemo } from "react";
import { Mic } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StudioSession } from "../types";

interface ActiveSessionPlaceholderProps {
  session: StudioSession;
  className?: string;
}

/**
 * Phase 1 placeholder for the active-session view. The four-column resizable
 * shell + recording UI lands in Phases 3–7. This stub exists so the route
 * has something meaningful to render once a session is selected, and so we
 * can verify the sidebar → main flow end-to-end before moving on.
 */
export function ActiveSessionPlaceholder({
  session,
  className,
}: ActiveSessionPlaceholderProps) {
  const subtitle = useMemo(() => formatSubtitle(session), [session]);

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-1 flex-col bg-textured",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between border-b border-border bg-background px-4 py-2">
        <div className="flex flex-col gap-0.5">
          <h2 className="text-sm font-semibold">{session.title}</h2>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>

      <div className="flex flex-1 min-h-0 items-center justify-center p-8 text-center text-muted-foreground">
        <div className="flex flex-col items-center gap-3">
          <Mic className="h-8 w-8 text-primary/60" />
          <div className="flex flex-col gap-1">
            <p className="text-sm font-medium text-foreground">
              4-column workspace lands in Phase 3.
            </p>
            <p className="text-xs">
              Recording, cleanup, concepts, and the module column will mount
              here once the global recording portal ships.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function formatSubtitle(session: StudioSession): string {
  const created = new Date(session.createdAt).toLocaleString(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  });
  const status = session.status === "idle" ? "ready" : session.status;
  const link = session.transcriptId ? "linked to transcript" : "standalone";
  return `${status} · ${link} · ${created}`;
}
