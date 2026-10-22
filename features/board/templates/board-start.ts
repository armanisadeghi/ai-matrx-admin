"use client";

// THE AI BUILDS A DESIGN BOARD, AND IT TALKS FIRST (Arman 2026-10-21/22, smart-add-brand VISION Parts 30-31). There
// is no "Build with AI" step: a design-system board that is still empty (its cover has nothing) opens with the
// design-system job already running in the board's SIDE CHAT on the board surface (`matrx-user/board`), which
// hands it the board's values and tools. The job starts with NO message (`startShellChatJob` `run`): the agent
// speaks first; nothing is typed for the person. Never a window, never a second launcher. A board started from a
// style says the style is in instead (the choice rides from the gallery in this tab only, `sessionStorage`).

import { useEffect, useRef } from "react";

import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";
import { useInPlaceChatHost } from "@ai-matrx/chat/agents/components/chat/in-place-chat-host";
import { selectInstanceStatus } from "@ai-matrx/chat/agents/redux/execution-system/conversations/conversations.selectors";
import { startShellChatJob } from "@ai-matrx/chat/canvas/workspace/shell-chat-page-context";
import { useAppSelector } from "@/lib/redux/hooks";
import { toast } from "@/lib/toast";

const DESIGN_SYSTEM_BUILD = MANDATE_KEYS.design_system__build;

/** Starts the design-system job in the side chat beside this board; the agent speaks first. */
export function startDesignBuild(): boolean {
  if (startShellChatJob(DESIGN_SYSTEM_BUILD, { run: true })) return true;
  toast.error("The chat could not open here. Use the Agents menu.");
  return false;
}

/**
 * Whether the design-system job is running right now in the side chat beside this board — read from the chat's own
 * records (the conversation on screen, its mandate, its run status), never a parallel store. An empty cover says
 * "building" only while this is true; otherwise it is honest and offers the job again.
 */
export function useDesignBuildRunning(): boolean {
  const conversationId = useInPlaceChatHost()?.activeConversationId ?? null;
  return useAppSelector((state) => {
    if (!conversationId) return false;
    if (state.conversations.byConversationId[conversationId]?.mandateKey !== DESIGN_SYSTEM_BUILD) return false;
    const status = selectInstanceStatus(conversationId)(state);
    return status === "running" || status === "streaming";
  });
}

/** How a new design board was started: by the AI (the default) or from a style. */
export type BoardStart = { mode: "ai" } | { mode: "style"; styleName: string };
export type BoardStartChoice = { name: string; brandId?: string | null } & ({ mode: "ai" } | { mode: "style"; styleTemplateId: string; styleName: string });

const stashKey = (boardId: string) => `matrx:board:start:${boardId}`;
const startedKey = (boardId: string) => `matrx:board:ai-started:${boardId}`;

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
    if (v?.mode === "ai") return v;
    if (v?.mode === "style" && typeof v.styleName === "string") return v;
  } catch {
    // An unreadable start is no start: the board opens as it is.
  }
  return null;
}

/** Whether this tab already started the build for this board (one start per board per tab). */
function startedHere(boardId: string): boolean {
  try {
    return window.sessionStorage.getItem(startedKey(boardId)) === "1";
  } catch {
    return false;
  }
}

function markStarted(boardId: string): void {
  try {
    window.sessionStorage.setItem(startedKey(boardId), "1");
  } catch {
    // Storage refused: the in-memory guard still holds for this mount.
  }
}

/**
 * On a design-system board: an EMPTY one opens with the AI building it (no click, no words); one just started
 * from a style says so. Once per board per tab; a board with content starts nothing.
 */
export function useBoardStartRun(boardId: string | null, isDesignBoard: boolean, isEmpty: boolean): void {
  const done = useRef(false);
  useEffect(() => {
    if (!boardId || !isDesignBoard || done.current) return;
    const start = takeBoardStart(boardId);
    if (start?.mode === "style") {
      done.current = true;
      toast.success(`${start.styleName} style added`);
      return;
    }
    if (!isEmpty || startedHere(boardId)) return;
    done.current = true;
    if (startDesignBuild()) markStarted(boardId);
  }, [boardId, isDesignBoard, isEmpty]);
}
