"use client";

/**
 * A board's pages (`settings.parent_board_id`): the top board and every page under it, read in ONE
 * query (`listPageFamily`), and "Add page" — a new board under the top board, opened at once
 * (`beginPageCreate`, the same optimistic create as "New board").
 */

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "@/lib/toast";
import type { JsonObject } from "@/types/json";
import { type BoardPage, beginPageCreate, isBoardError, listPageFamily, parentBoardIdOf } from "./boardsService";

export interface PageFamily {
  /** null until the first read answers. */
  list: BoardPage[] | null;
  error: string | null;
  retry: () => void;
  adding: boolean;
  addPage: (title?: string) => Promise<{ id: string; title: string }>;
}

export function usePageFamily(
  board: { id: string; title: string; organizationId: string; settings: JsonObject; layout: "canvas" | "page" } | null,
): PageFamily {
  const router = useRouter();
  const parentId = board ? parentBoardIdOf(board.settings) : null;
  const rootId = board ? (parentId ?? board.id) : null;
  const [read, setRead] = useState<{ key: string; list: BoardPage[] | null; error: string | null } | null>(null);
  const [attempt, setAttempt] = useState(0);
  const [adding, setAdding] = useState(false);
  const key = `${rootId ?? ""}|${attempt}`;

  useEffect(() => {
    if (!rootId) return;
    let live = true;
    listPageFamily(rootId).then(
      (list) => live && setRead({ key, list, error: null }),
      (e: unknown) => live && setRead({ key, list: null, error: isBoardError(e) ? e.message : String(e) }),
    );
    return () => {
      live = false;
    };
  }, [rootId, key]);

  const current = read?.key === key ? read : null;
  let list = current?.list ?? null;
  if (list && board) {
    // This board as this tab knows it (a rename shows at once; a page still being created is listed).
    const known = list.some((p) => p.id === board.id);
    list = known
      ? list.map((p) => (p.id === board.id ? { ...p, title: board.title } : p))
      : [...list, { id: board.id, title: board.title, parentId }];
  }

  const addPage = async (title?: string) => {
    if (!board) throw new Error("The board is still opening.");
    setAdding(true);
    try {
      const { id } = await beginPageCreate({
        parent: { id: board.id, organizationId: board.organizationId, settings: board.settings },
        title,
        layout: board.layout,
      });
      router.push(`/board/${id}`);
      return { id, title: title?.trim() || "Untitled page" };
    } catch (e) {
      const message = isBoardError(e) ? e.message : `The page could not be made: ${e instanceof Error ? e.message : String(e)}`;
      toast.error(message);
      throw e instanceof Error ? e : new Error(message);
    } finally {
      setAdding(false);
    }
  };

  return {
    list,
    error: current?.error ?? null,
    retry: () => setAttempt((n) => n + 1),
    adding,
    addPage,
  };
}
