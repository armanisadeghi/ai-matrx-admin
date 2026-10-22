"use client";

// THE BRAND OF A DESIGN BOARD: one association edge, board -> web_brand, role design_system
// (platform.association_types "board -> web_brand"). Read and written ONLY through `associationsService`
// (the assoc_list / assoc_link / assoc_unlink chokepoint). The board's own organization rides every write.

import { useEffect, useState } from "react";

import { associationsService } from "@/features/scopes/service/associationsService";
import { toast } from "@/lib/toast";

export const DESIGN_BRAND_ROLE = "design_system";
const BOARD = "board";
const BRAND = "web_brand";

/** The brand an edge list names for a board (first design_system edge to a brand); null when none. */
export function designBrandFromEdges(edges: readonly { direction: string; otherType: string; otherId: string; role: string | null }[]): string | null {
  const e = edges.find((x) => x.direction === "outgoing" && x.otherType === BRAND && x.role === DESIGN_BRAND_ROLE);
  return e?.otherId ?? null;
}

export async function readDesignBoardBrand(boardId: string): Promise<{ ok: true; brandId: string | null } | { ok: false; error: string }> {
  const r = await associationsService.listForEntity(BOARD, boardId);
  if (!r.ok) return { ok: false, error: r.error.message };
  return { ok: true, brandId: designBrandFromEdges(r.data.edges) };
}

/** Points the board at `brandId` (null unlinks). Removes the previous edge first: one brand per design board. */
export async function writeDesignBoardBrand(args: { boardId: string; brandId: string | null; previousBrandId: string | null; organizationId: string | null }): Promise<{ ok: true } | { ok: false; error: string }> {
  const { boardId, brandId, previousBrandId, organizationId } = args;
  if (previousBrandId && previousBrandId !== brandId) {
    const r = await associationsService.remove({ sourceType: BOARD, sourceId: boardId, targetType: BRAND, targetId: previousBrandId, role: DESIGN_BRAND_ROLE });
    if (!r.ok) return { ok: false, error: r.error.message };
  }
  if (brandId && brandId !== previousBrandId) {
    const r = await associationsService.add({
      sourceType: BOARD,
      sourceId: boardId,
      targetType: BRAND,
      targetId: brandId,
      role: DESIGN_BRAND_ROLE,
      ...(organizationId ? { orgId: organizationId } : {}),
    });
    if (!r.ok) return { ok: false, error: r.error.message };
  }
  return { ok: true };
}

/** The board's brand, read once per board, and the way to change it (optimistic, rolled back with a toast on failure). */
export function useDesignBoardBrand(boardId: string | null | undefined, organizationId: string | null) {
  const [state, setState] = useState<{ boardId: string | null; brandId: string | null }>({ boardId: null, brandId: null });
  useEffect(() => {
    if (!boardId) return;
    let live = true;
    void readDesignBoardBrand(boardId).then((r) => {
      if (!live) return;
      if (!r.ok) {
        console.error("[design-board-brand] reading the board's brand failed", r.error);
        toast.error("Couldn't load this board's brand");
        return;
      }
      setState({ boardId, brandId: r.brandId });
    });
    return () => {
      live = false;
    };
  }, [boardId]);
  const brandId = state.boardId === boardId ? state.brandId : null;
  const set = async (next: string | null) => {
    if (!boardId) return;
    const previous = brandId;
    setState({ boardId, brandId: next });
    const r = await writeDesignBoardBrand({ boardId, brandId: next, previousBrandId: previous, organizationId });
    if (!r.ok) {
      setState({ boardId, brandId: previous });
      console.error("[design-board-brand] changing the board's brand failed", r.error);
      toast.error("Couldn't change this board's brand");
    }
  };
  return { brandId, set };
}
