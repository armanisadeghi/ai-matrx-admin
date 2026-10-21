"use client";

// The design-system start on an opened board, and the one door that opens the design-system Conductor ("Design system build") on the open board: the same run
// window as the Agents menu's Run door (`runHere`), used by a new board's AI start and the empty cover.

import { useEffect, useRef } from "react";

import { MANDATE_KEYS } from "@ai-matrx/agents/mandates";
import { useOpenAgentRunWindow } from "@ai-matrx/chat/host/window-openers";
import { fetchMandateIdentities } from "@ai-matrx/chat/mandates/service";
import { BOARD_SURFACE_NAME } from "@/features/surfaces/manifests/board.manifest";
import { toast } from "@/lib/toast";

const DESIGN_SYSTEM_BUILD = MANDATE_KEYS.design_system__build;

/**
 * Opens the design-system Conductor's run window on this board (the Agents menu's Run door, `runHere`). With the
 * person's own words it is sent at once; without, the window waits for them.
 */
export function useOpenDesignBuild(): (brief: string | null) => void {
  const openRun = useOpenAgentRunWindow();
  return (brief) => {
    void fetchMandateIdentities([DESIGN_SYSTEM_BUILD]).then(
      (ids) => {
        const who = ids[DESIGN_SYSTEM_BUILD];
        openRun({
          initialAgentId: who?.defaultAgentId ?? null,
          initialAgentName: who?.label ?? "Design system build",
          mandateKey: DESIGN_SYSTEM_BUILD,
          surfaceName: BOARD_SURFACE_NAME,
          initialDraftText: brief,
          initialAutoRun: !!brief,
        });
      },
      (e: unknown) => toast.error(e instanceof Error ? e.message : "The design system build could not open. Use the Agents menu."),
    );
  };
}

/** What the person chose; `brief` is their own words, sent as typed (never added to). */
export type BoardStart = { mode: "ai"; brief: string } | { mode: "style"; styleName: string };
export type BoardStartChoice = { name: string } & ({ mode: "ai"; brief: string } | { mode: "style"; styleTemplateId: string; styleName: string });

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
 * On the opened design-system board: runs the kept start. "ai" opens the Conductor's run window at once (sent at
 * once when the person wrote about their business); "style" says the style is in and offers the AI to adapt it.
 */
export function useBoardStartRun(boardId: string | null, isDesignBoard: boolean): void {
  const openBuild = useOpenDesignBuild();
  const done = useRef(false);
  useEffect(() => {
    if (!boardId || !isDesignBoard || done.current) return;
    const start = takeBoardStart(boardId);
    if (!start) return;
    done.current = true;
    if (start.mode === "ai") openBuild(start.brief.trim() || null);
    else toast.success(`${start.styleName} style added`, { action: { label: "Adapt with AI", onClick: () => openBuild(null) } });
  }, [boardId, isDesignBoard, openBuild]);
}
