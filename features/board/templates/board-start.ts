"use client";

// THE START OF A NEW DESIGN BOARD, and its one door to the AI build (Arman 2026-10-21: reuse first, no parallel
// path). The design-system job runs in the board's SIDE CHAT on the board surface (`matrx-user/board`) like any
// surface-bound job: the surface hands it the board's values and tools, the person's words are its first message,
// sent exactly as typed (`startShellChatJob`, the shell chat's own composer Send). Never a window, never a second
// launcher. The choice rides from the gallery to the opened board in this tab only (`sessionStorage`, never the URL).

import { useEffect, useRef } from "react";

import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";
import { startShellChatJob } from "@ai-matrx/chat/canvas/workspace/shell-chat-page-context";
import { toast } from "@/lib/toast";

const DESIGN_SYSTEM_BUILD = MANDATE_KEYS.design_system__build;

/**
 * Opens the design-system job in the side chat beside this board. With the person's own words they are sent at
 * once, untouched; without, the chat waits for them.
 */
export function startDesignBuild(brief: string | null): void {
  const send = brief && brief.trim() ? brief : undefined;
  if (!startShellChatJob(DESIGN_SYSTEM_BUILD, send ? { send } : undefined)) {
    toast.error("The chat could not open here. Use the Agents menu.");
  }
}

/** What the person chose; `brief` is their own words, sent as typed (never added to). */
export type BoardStart = { mode: "ai"; brief: string } | { mode: "style"; styleName: string };
export type BoardStartChoice = { name: string; brandId?: string | null } & ({ mode: "ai"; brief: string } | { mode: "style"; styleTemplateId: string; styleName: string });

const stashKey = (boardId: string) => `matrx:board:start:${boardId}`;

/** Keeps the start for the board about to open (this tab only). */
export function stashBoardStart(boardId: string, start: BoardStart): void {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(stashKey(boardId), JSON.stringify(start));
}

/** The start kept for this board, read ONCE (it is removed as it is read). */
export function takeBoardStart(boardId: string): BoardStart | null {
  if (typeof window === "undefined") return null;
  const raw = window.sessionStorage.getItem(stashKey(boardId));
  if (!raw) return null;
  window.sessionStorage.removeItem(stashKey(boardId));
  try {
    const v = JSON.parse(raw) as BoardStart;
    if (v?.mode === "ai" && typeof v.brief === "string") return v;
    if (v?.mode === "style" && typeof v.styleName === "string") return v;
  } catch {
    // An unreadable start is no start: the board opens as it is.
  }
  return null;
}

/**
 * On the opened design-system board: runs the kept start once. "ai" starts the job in the side chat with the
 * person's words as its first message; "style" says the style is in and offers the AI to adapt it.
 */
export function useBoardStartRun(boardId: string | null, isDesignBoard: boolean): void {
  const done = useRef(false);
  useEffect(() => {
    if (!boardId || !isDesignBoard || done.current) return;
    const start = takeBoardStart(boardId);
    if (!start) return;
    done.current = true;
    if (start.mode === "ai") startDesignBuild(start.brief);
    else toast.success(`${start.styleName} style added`, { action: { label: "Adapt with AI", onClick: () => startDesignBuild(null) } });
  }, [boardId, isDesignBoard]);
}
