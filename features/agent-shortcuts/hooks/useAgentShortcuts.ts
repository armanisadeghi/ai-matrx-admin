"use client";

import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectShortcutsByScope,
  selectShortcutsSliceStatus,
  selectShortcutsSliceError,
} from "@/features/agents/redux/agent-shortcuts/selectors";
import { fetchShortcutsForScope } from "@/features/agents/redux/agent-shortcuts/thunks";
import { selectCategoryTreeByScope } from "@/features/agents/redux/agent-shortcut-categories/selectors";
import { fetchCategoriesForScope } from "@/features/agents/redux/agent-shortcut-categories/thunks";
import { selectContentBlocksByScope } from "@/features/agents/redux/agent-content-blocks/selectors";
import { fetchContentBlocksForScope } from "@/features/agents/redux/agent-content-blocks/thunks";
import type { AgentScope } from "../constants";
import type { AgentShortcutRecord } from "@/features/agents/redux/agent-shortcuts/types";
import type { AgentShortcutCategoryRecord } from "@/features/agents/redux/agent-shortcut-categories/types";
import type { AgentContentBlockRecord } from "@/features/agents/redux/agent-content-blocks/types";

export interface UseAgentShortcutsArgs {
  scope: AgentScope;
  scopeId?: string;
  autoFetch?: boolean;
}

export interface UseAgentShortcutsResult {
  shortcuts: AgentShortcutRecord[];
  categories: AgentShortcutCategoryRecord[];
  contentBlocks: AgentContentBlockRecord[];
  isLoading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useAgentShortcuts({
  scope,
  scopeId,
  autoFetch = true,
}: UseAgentShortcutsArgs): UseAgentShortcutsResult {
  const dispatch = useAppDispatch();

  const shortcuts = useAppSelector((state) =>
    selectShortcutsByScope(state, scope, scopeId),
  );
  const categories = useAppSelector((state) =>
    selectCategoryTreeByScope(state, scope, scopeId),
  );
  const contentBlocks = useAppSelector((state) =>
    selectContentBlocksByScope(state, scope, scopeId),
  );
  const status = useAppSelector(selectShortcutsSliceStatus);
  const error = useAppSelector(selectShortcutsSliceError);

  const refetch = useMemo(
    () => () => {
      const ref = { scope, scopeId: scopeId ?? null };
      dispatch(fetchShortcutsForScope(ref));
      dispatch(fetchCategoriesForScope(ref));
      dispatch(fetchContentBlocksForScope(ref));
    },
    [dispatch, scope, scopeId],
  );

  useEffect(() => {
    if (!autoFetch) return;
    const orgLikeScopeNeedsId =
      scope === "organization" || scope === "project" || scope === "task";
    if (orgLikeScopeNeedsId && !scopeId) return;
    const ref = { scope, scopeId: scopeId ?? null };
    dispatch(fetchShortcutsForScope(ref));
    dispatch(fetchCategoriesForScope(ref));
    dispatch(fetchContentBlocksForScope(ref));
  }, [dispatch, scope, scopeId, autoFetch]);

  return {
    shortcuts: shortcuts ?? [],
    categories: categories ?? [],
    contentBlocks: contentBlocks ?? [],
    isLoading: status === "loading",
    error: error ?? null,
    refetch,
  };
}
