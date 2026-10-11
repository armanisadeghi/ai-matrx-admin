"use client";

// features/mandates/feature-intelligence/usePlacement.ts
//
// The registry tree and where every visible job sits, read once per session
// and shared by every Intelligence page (directory, node pages, lanes, search).
// A mandate write anywhere drops the placement so a new job finds its home.

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { onMandateCacheInvalidated } from "@ai-matrx/chat/mandates/service";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import { readPlacement, readTaxonomyNodes } from "./placement-data";
import {
  arrange,
  buildTree,
  type PlacedEntry,
  type PlacementRow,
  type Tree,
} from "./placement-model";

let treeCache: Promise<Tree> | null = null;
let rowsCache: Promise<PlacementRow[]> | null = null;

export function loadTree(): Promise<Tree> {
  treeCache ??= readTaxonomyNodes(createClient())
    .then(buildTree)
    .catch((cause: unknown) => {
      treeCache = null;
      throw cause;
    });
  return treeCache;
}

export function loadPlacement(): Promise<PlacementRow[]> {
  rowsCache ??= readPlacement(createClient()).catch((cause: unknown) => {
    rowsCache = null;
    throw cause;
  });
  return rowsCache;
}

onMandateCacheInvalidated(() => {
  rowsCache = null;
});

export interface PlacementState {
  tree: Tree | null;
  rows: PlacementRow[] | null;
  /** Rows arranged by home (node slug or lane id), for this viewer. */
  arranged: Map<string, PlacedEntry[]> | null;
  viewerId: string | null;
  error: string | null;
}

export function usePlacement(): PlacementState {
  const viewerId = useAppSelector(selectUserId);
  const [tree, setTree] = useState<Tree | null>(null);
  const [rows, setRows] = useState<PlacementRow[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [epoch, setEpoch] = useState(0);

  useEffect(() => onMandateCacheInvalidated(() => setEpoch((n) => n + 1)), []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([loadTree(), loadPlacement()]).then(
      ([nextTree, nextRows]) => {
        if (cancelled) return;
        setTree(nextTree);
        setRows(nextRows);
        setError(null);
      },
      (cause: unknown) => {
        console.error("[intelligence] placement could not be read", cause);
        if (!cancelled) setError(cause instanceof Error ? cause.message : String(cause));
      },
    );
    return () => {
      cancelled = true;
    };
  }, [epoch]);

  return {
    tree,
    rows,
    arranged: rows ? arrange(rows, viewerId) : null,
    viewerId,
    error,
  };
}
