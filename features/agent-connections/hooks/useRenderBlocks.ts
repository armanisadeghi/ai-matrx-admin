"use client";

import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectAllRenderDefinitions,
  selectRenderDefinitionsByCategory,
  selectRenderDefinitionsStatus,
  selectAllRenderBlockCategories,
  selectRenderBlockCategoryTree,
  fetchRenderDefinitions,
  fetchRenderBlockCategories,
  type CategoryTreeNode,
  type SklRenderDefinition,
  type ShortcutCategoryRow,
} from "../redux/skl";
import { useScope } from "./useScope";

export interface UseRenderBlocksResult {
  definitions: SklRenderDefinition[];
  byCategoryId: Record<string, SklRenderDefinition[]>;
  categories: ShortcutCategoryRow[];
  categoryTree: CategoryTreeNode[];
  loading: boolean;
  error: string | null;
  reload: () => void;
}

export function useRenderBlocks(): UseRenderBlocksResult {
  const dispatch = useAppDispatch();
  const { scope, scopeId } = useScope();

  const definitions = useAppSelector(selectAllRenderDefinitions);
  const byCategoryId = useAppSelector(selectRenderDefinitionsByCategory);
  const categories = useAppSelector(selectAllRenderBlockCategories);
  const categoryTree = useAppSelector(selectRenderBlockCategoryTree);
  const defStatus = useAppSelector(selectRenderDefinitionsStatus);
  const catStatus = useAppSelector(
    (s) => s.skl.renderBlockCategories.status,
  );
  const error = useAppSelector(
    (s) => s.skl.renderDefinitions.error ?? s.skl.renderBlockCategories.error,
  );

  useEffect(() => {
    void dispatch(fetchRenderDefinitions({ scope, scopeId }));
    void dispatch(fetchRenderBlockCategories({ scope, scopeId }));
  }, [dispatch, scope, scopeId]);

  const loading = defStatus === "loading" || catStatus === "loading";

  return useMemo(
    () => ({
      definitions,
      byCategoryId,
      categories,
      categoryTree,
      loading,
      error,
      reload: () => {
        void dispatch(fetchRenderDefinitions({ scope, scopeId }));
        void dispatch(fetchRenderBlockCategories({ scope, scopeId }));
      },
    }),
    [
      definitions,
      byCategoryId,
      categories,
      categoryTree,
      loading,
      error,
      dispatch,
      scope,
      scopeId,
    ],
  );
}
