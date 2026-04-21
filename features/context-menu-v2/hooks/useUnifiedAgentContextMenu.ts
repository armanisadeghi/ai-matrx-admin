"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchUnifiedMenu } from "@/features/agents/redux/agent-shortcuts/thunks";
import {
  selectAllShortcutsArray,
  selectIsShortcutScopeLoaded,
} from "@/features/agents/redux/agent-shortcuts/selectors";
import { selectAllCategoriesArray } from "@/features/agents/redux/agent-shortcut-categories/selectors";
import { selectAllContentBlocksArray } from "@/features/agents/redux/agent-content-blocks/selectors";
import {
  selectContextMenuRows,
  selectContextMenuHydrated,
} from "@/lib/redux/slices/contextMenuCacheSlice";
import type { AgentShortcutRecord } from "@/features/agents/redux/agent-shortcuts/types";
import type { AgentShortcutCategoryRecord } from "@/features/agents/redux/agent-shortcut-categories/types";
import type { AgentContentBlockRecord } from "@/features/agents/redux/agent-content-blocks/types";
import type { Scope } from "@/features/agents/redux/shared/scope";
import { resolveRowScope } from "@/features/agents/redux/shared/scope";

export type AgentMenuEntry =
  | ({
      entryType: "agent_shortcut";
      scopeLevel: Scope;
    } & AgentShortcutRecord)
  | ({
      entryType: "content_block";
      scopeLevel: Scope;
    } & AgentContentBlockRecord);

export interface AgentMenuCategoryGroup {
  category: AgentShortcutCategoryRecord & { scopeLevel: Scope };
  items: AgentMenuEntry[];
  children: AgentMenuCategoryGroup[];
}

export interface UseUnifiedAgentContextMenuArgs {
  placementTypes: string[];
  contextFilter?: string;
  enabled?: boolean;
  scope?: Scope;
  scopeId?: string | null;
}

export interface UseUnifiedAgentContextMenuResult {
  categoryGroups: AgentMenuCategoryGroup[];
  loading: boolean;
  error: string | null;
  refresh: () => Promise<void>;
}

const SCOPE_PRIORITY: Record<Scope, number> = {
  task: 5,
  project: 4,
  user: 3,
  organization: 2,
  global: 1,
};

function higherPriority(a: Scope, b: Scope): Scope {
  return SCOPE_PRIORITY[a] >= SCOPE_PRIORITY[b] ? a : b;
}

function dedupeByPrecedence<T extends { scopeLevel: Scope }>(
  items: T[],
  keyFn: (item: T) => string | null,
): T[] {
  const winners = new Map<string, T>();
  const passthrough: T[] = [];
  for (const item of items) {
    const key = keyFn(item);
    if (!key) {
      passthrough.push(item);
      continue;
    }
    const existing = winners.get(key);
    if (!existing) {
      winners.set(key, item);
      continue;
    }
    if (SCOPE_PRIORITY[item.scopeLevel] > SCOPE_PRIORITY[existing.scopeLevel]) {
      winners.set(key, item);
    }
  }
  return [...winners.values(), ...passthrough];
}

function filterByContext<T extends { enabledContexts?: string[] | null }>(
  items: T[],
  contextFilter: string | undefined,
): T[] {
  if (!contextFilter) return items;
  return items.filter((item) => {
    const ec = item.enabledContexts ?? null;
    return ec === null || ec.length === 0 || ec.includes(contextFilter);
  });
}

export function useUnifiedAgentContextMenu(
  args: UseUnifiedAgentContextMenuArgs,
): UseUnifiedAgentContextMenuResult {
  const {
    placementTypes,
    contextFilter,
    enabled = true,
    scope = "global",
    scopeId = null,
  } = args;

  const dispatch = useAppDispatch();

  const shortcuts = useAppSelector(selectAllShortcutsArray);
  const categories = useAppSelector(selectAllCategoriesArray);
  const contentBlocks = useAppSelector(selectAllContentBlocksArray);
  const ssrRows = useAppSelector(selectContextMenuRows);
  const ssrHydrated = useAppSelector(selectContextMenuHydrated);
  const scopeLoaded = useAppSelector((state) =>
    selectIsShortcutScopeLoaded(state, scope, scopeId ?? null),
  );

  const [loading, setLoading] = useState(!scopeLoaded);
  const [error, setError] = useState<string | null>(null);
  const fetchedScopeKeyRef = useRef<string | null>(null);

  const refresh = useCallback(async () => {
    if (!enabled || placementTypes.length === 0) return;
    try {
      setLoading(true);
      setError(null);
      await dispatch(fetchUnifiedMenu({ scope, scopeId })).unwrap();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load menu");
    } finally {
      setLoading(false);
    }
  }, [dispatch, enabled, placementTypes.length, scope, scopeId]);

  useEffect(() => {
    if (!enabled || placementTypes.length === 0) {
      setLoading(false);
      return;
    }

    const scopeKey = `${scope}:${scopeId ?? ""}`;

    // If slices already have data for this scope, skip the fetch.
    if (scopeLoaded && fetchedScopeKeyRef.current === scopeKey) {
      setLoading(false);
      return;
    }

    if (fetchedScopeKeyRef.current === scopeKey) {
      return;
    }
    fetchedScopeKeyRef.current = scopeKey;

    // Fast path: SSR hydrated context_menu rows (legacy shape from the
    // deferred shell). Still trigger the agent-menu fetch in parallel so the
    // agent slices populate. We rely on the agent slices for the actual menu
    // — the SSR rows just tell us we're warm enough to render immediately.
    if (ssrHydrated && ssrRows.length > 0 && scope === "global") {
      setLoading(false);
      void refresh();
      return;
    }

    void refresh();
  }, [
    enabled,
    placementTypes,
    scope,
    scopeId,
    scopeLoaded,
    ssrHydrated,
    ssrRows.length,
    refresh,
  ]);

  const categoryGroups = useMemo<AgentMenuCategoryGroup[]>(() => {
    if (!enabled || placementTypes.length === 0) return [];

    const placementSet = new Set(placementTypes);

    const scopedCategories = categories
      .filter((c) => c.isActive !== false && placementSet.has(c.placementType))
      .map((c) => ({ ...c, scopeLevel: resolveRowScope(c) }));
    const scopedShortcuts = shortcuts
      .filter((s) => s.isActive !== false)
      .map((s) => ({
        ...s,
        entryType: "agent_shortcut" as const,
        scopeLevel: resolveRowScope(s),
      }));
    const scopedBlocks = contentBlocks
      .filter((b) => b.isActive !== false)
      .map((b) => ({
        ...b,
        entryType: "content_block" as const,
        scopeLevel: resolveRowScope(b),
      }));

    const filteredCategories = filterByContext(scopedCategories, contextFilter);
    const filteredShortcuts = filterByContext(scopedShortcuts, contextFilter);
    const filteredBlocks = scopedBlocks;

    const dedupedCategories = dedupeByPrecedence(
      filteredCategories,
      (c) => `${c.placementType}:${c.parentCategoryId ?? "_root"}:${c.label}`,
    );

    const dedupedShortcuts = dedupeByPrecedence(filteredShortcuts, (s) => {
      if (s.keyboardShortcut) return `kbd:${s.keyboardShortcut}`;
      return `label:${s.categoryId}:${s.label}`;
    });

    const dedupedBlocks = dedupeByPrecedence(
      filteredBlocks,
      (b) => `block:${b.categoryId ?? "_none"}:${b.blockId}`,
    );

    const byCategory = new Map<string, AgentMenuEntry[]>();
    for (const s of dedupedShortcuts) {
      if (!byCategory.has(s.categoryId)) byCategory.set(s.categoryId, []);
      byCategory.get(s.categoryId)!.push(s as AgentMenuEntry);
    }
    for (const b of dedupedBlocks) {
      const cid = b.categoryId;
      if (!cid) continue;
      if (!byCategory.has(cid)) byCategory.set(cid, []);
      byCategory.get(cid)!.push(b as AgentMenuEntry);
    }

    const nodeMap = new Map<string, AgentMenuCategoryGroup>();
    for (const cat of dedupedCategories) {
      nodeMap.set(cat.id, {
        category: cat,
        items: (byCategory.get(cat.id) ?? []).slice().sort(
          (x, y) => (x.sortOrder ?? 0) - (y.sortOrder ?? 0),
        ),
        children: [],
      });
    }

    const roots: AgentMenuCategoryGroup[] = [];
    for (const cat of dedupedCategories) {
      const node = nodeMap.get(cat.id)!;
      if (cat.parentCategoryId && nodeMap.has(cat.parentCategoryId)) {
        nodeMap.get(cat.parentCategoryId)!.children.push(node);
      } else {
        roots.push(node);
      }
    }

    const sortNodes = (nodes: AgentMenuCategoryGroup[]) => {
      nodes.sort(
        (a, b) =>
          (a.category.sortOrder ?? 0) - (b.category.sortOrder ?? 0) ||
          a.category.label.localeCompare(b.category.label),
      );
      for (const n of nodes) sortNodes(n.children);
    };
    sortNodes(roots);

    return roots;
  }, [
    enabled,
    placementTypes,
    categories,
    shortcuts,
    contentBlocks,
    contextFilter,
  ]);

  return {
    categoryGroups,
    loading: loading && categoryGroups.length === 0,
    error,
    refresh,
  };
}
