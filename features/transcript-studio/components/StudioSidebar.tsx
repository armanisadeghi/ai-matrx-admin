"use client";

import { useEffect, useState } from "react";
import { Loader2, Mic, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import {
  selectActiveSessionId,
  selectAllSessions,
  selectFetchStatus,
} from "../redux/selectors";
import { activeSessionIdSet } from "../redux/slice";
import {
  createSessionThunk,
  fetchSessionsThunk,
} from "../redux/thunks";
import type { StudioSession } from "../types";

interface StudioSidebarProps {
  className?: string;
  onPickSession?: (sessionId: string) => void;
  onCreateSession?: (sessionId: string) => void;
}

export function StudioSidebar({
  className,
  onPickSession,
  onCreateSession,
}: StudioSidebarProps) {
  const dispatch = useAppDispatch();
  const sessions = useAppSelector(selectAllSessions);
  const activeSessionId = useAppSelector(selectActiveSessionId);
  const fetchStatus = useAppSelector(selectFetchStatus);
  const userId = useAppSelector(selectUserId);

  // Hydration gate. Server-rendered output uses the EMPTY initial Redux
  // store (StudioHydrator's seeds are dispatched in a useEffect, after
  // mount). The client's first render must match — so we render the
  // loading shell on both server and the first client render, then flip
  // to the real content after hydration. Without this, the
  // empty-state-div ↔ session-list-ul element-type swap trips React's
  // hydration mismatch warning, which `suppressHydrationWarning` can't
  // suppress because it doesn't cover divergent element types.
  const [isHydrated, setIsHydrated] = useState(false);
  useEffect(() => setIsHydrated(true), []);

  const handlePick = (id: string) => {
    dispatch(activeSessionIdSet(id));
    onPickSession?.(id);
  };

  const handleCreate = async () => {
    if (!userId) return;
    const result = await dispatch(
      createSessionThunk({ userId, activate: true }),
    );
    if (
      createSessionThunk.fulfilled.match(result) &&
      result.payload?.id
    ) {
      onCreateSession?.(result.payload.id);
    }
  };

  const handleRetry = () => {
    void dispatch(fetchSessionsThunk());
  };

  return (
    <div
      className={cn(
        "flex h-full min-h-0 flex-col border-r border-border bg-textured",
        className,
      )}
    >
      <div className="flex shrink-0 items-center justify-between gap-2 border-b border-border px-3 py-2">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Mic className="h-4 w-4 text-primary" />
          Studio
        </div>
        <button
          type="button"
          onClick={handleCreate}
          disabled={!userId}
          className={cn(
            "inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors",
            userId
              ? "bg-primary text-primary-foreground hover:bg-primary/90"
              : "bg-muted text-muted-foreground cursor-not-allowed",
          )}
        >
          <Plus className="h-3.5 w-3.5" />
          New
        </button>
      </div>

      <div className="flex-1 min-h-0 overflow-y-auto">
        {!isHydrated ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : fetchStatus === "loading" && sessions.length === 0 ? (
          <div className="flex items-center justify-center p-6">
            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
          </div>
        ) : fetchStatus === "error" ? (
          <div className="px-3 py-4 text-xs text-muted-foreground">
            <p>Could not load sessions.</p>
            <button
              type="button"
              onClick={handleRetry}
              className="mt-2 text-primary underline-offset-2 hover:underline"
            >
              Try again
            </button>
          </div>
        ) : sessions.length === 0 ? (
          <div className="px-3 py-4 text-xs text-muted-foreground">
            No sessions yet. Press <span className="font-medium">New</span> to
            start your first one.
          </div>
        ) : (
          <ul className="flex flex-col py-1">
            {sessions.map((session) => (
              <SidebarItem
                key={session.id}
                session={session}
                isActive={session.id === activeSessionId}
                onPick={() => handlePick(session.id)}
              />
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

interface SidebarItemProps {
  session: StudioSession;
  isActive: boolean;
  onPick: () => void;
}

function SidebarItem({ session, isActive, onPick }: SidebarItemProps) {
  const subtitle = formatSessionSubtitle(session);
  return (
    <li>
      <button
        type="button"
        onClick={onPick}
        className={cn(
          "flex w-full flex-col items-start gap-0.5 px-3 py-2 text-left transition-colors",
          isActive
            ? "bg-primary/10 border-l-2 border-primary"
            : "border-l-2 border-transparent hover:bg-accent/40",
        )}
      >
        <span className="line-clamp-1 text-xs font-medium">
          {session.title}
        </span>
        <span className="line-clamp-1 text-[10px] text-muted-foreground">
          {subtitle}
        </span>
      </button>
    </li>
  );
}

function formatSessionSubtitle(session: StudioSession): string {
  const parts: string[] = [];
  if (session.status !== "idle" && session.status !== "stopped") {
    parts.push(session.status);
  }
  parts.push(timeAgo(session.updatedAt));
  if (session.moduleId && session.moduleId !== "tasks") {
    parts.push(session.moduleId);
  }
  return parts.join(" · ");
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return "";
  const sec = Math.floor(ms / 1000);
  if (sec < 60) return "just now";
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day}d ago`;
  return new Date(iso).toLocaleDateString();
}
