"use client";

import { useMemo, useState, useCallback } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import { fetchUnifiedMenu } from "@/features/agents/redux/agent-shortcuts/thunks";
import { selectAllShortcutsArray } from "@/features/agents/redux/agent-shortcuts/selectors";
import { selectAllCategoriesArray } from "@/features/agents/redux/agent-shortcut-categories/selectors";
import { selectAllContentBlocksArray } from "@/features/agents/redux/agent-content-blocks/selectors";
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
  /**
   * Contexts to ADD to the default `{general}` allow-set.
   * Example: `['code-editor']` makes code-editor shortcuts visible alongside general ones.
   */
  addedContexts?: string[];
  /**
   * Contexts to REMOVE from the allow-set after `addedContexts` is applied.
   * Example: `['general']` with `addedContexts: ['code-editor']` → only code-editor shortcuts.
   */
  excludedContexts?: string[];
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

// Allowed-feature set: `{general} ∪ addedContexts − excludedContexts`.
// An item is visible iff its `enabledFeatures` intersects the set, OR the
// item has no `enabledFeatures` declared (legacy data — treated as general).
function buildAllowedContexts(
  addedContexts: string[] | undefined,
  excludedContexts: string[] | undefined,
): Set<string> {
  const allowed = new Set<string>(["general"]);
  for (const c of addedContexts ?? []) allowed.add(c);
  for (const c of excludedContexts ?? []) allowed.delete(c);
  return allowed;
}

function filterByAllowedContexts<
  T extends { enabledFeatures?: string[] | null },
>(items: T[], allowed: Set<string>): T[] {
  // Empty allow-set is a nonsense state — treat as "nothing visible".
  if (allowed.size === 0) return [];
  return items.filter((item) => {
    const ec = item.enabledFeatures;
    if (!ec || ec.length === 0) {
      // Legacy rows with no features declared — treat as general.
      return allowed.has("general");
    }
    for (const c of ec) {
      if (allowed.has(c)) return true;
    }
    return false;
  });
}

export function useUnifiedAgentContextMenu(
  args: UseUnifiedAgentContextMenuArgs,
): UseUnifiedAgentContextMenuResult {
  const {
    placementTypes,
    addedContexts,
    excludedContexts,
    enabled = true,
    scope = "global",
    scopeId = null,
  } = args;

  const dispatch = useAppDispatch();

  const shortcuts = useAppSelector(selectAllShortcutsArray);
  const categories = useAppSelector(selectAllCategoriesArray);
  const contentBlocks = useAppSelector(selectAllContentBlocksArray);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

  // Intentionally NO mount-time useEffect that fires refresh(). The menu is
  // one of the most expensive fetches in the system — it must only run when
  // the user actually engages. UnifiedAgentContextMenu calls `refresh()`
  // from its `onOpenChange` handler. The fetchUnifiedMenu thunk dedupes
  // internally (module-level inflight map + scope-loaded condition) so
  // rapid opens + multi-mounted menus all resolve to a single HTTP call.

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

    const allowedContexts = buildAllowedContexts(addedContexts, excludedContexts);

    const filteredCategories = filterByAllowedContexts(scopedCategories, allowedContexts);
    const filteredShortcuts = filterByAllowedContexts(scopedShortcuts, allowedContexts);
    // Content blocks are static insertable text — they don't carry enabled_features
    // today, so they always pass through. (If we ever add enabled_features to
    // content_blocks, swap in filterByAllowedContexts.)
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
    addedContexts,
    excludedContexts,
  ]);

  return {
    categoryGroups,
    loading: loading && categoryGroups.length === 0,
    error,
    refresh,
  };
}
