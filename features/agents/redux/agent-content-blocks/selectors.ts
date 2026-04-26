"use client";

import { createSelector } from "reselect";
import type { RootState } from "@/lib/redux/store.types";
import type { AgentContentBlockDef, AgentContentBlockRecord } from "./types";
import {
  matchesScope,
  scopeIndexKey,
  type Scope,
  type ScopeRef,
} from "../shared/scope";

const selectAgentContentBlockSlice = (state: RootState) =>
  state.agentContentBlock;

export const selectAllContentBlocksMap = createSelector(
  [selectAgentContentBlockSlice],
  (slice) => slice.contentBlocksById,
);

export const selectContentBlockIdsByScopeMap = createSelector(
  [selectAgentContentBlockSlice],
  (slice) => slice.contentBlockIdsByScope,
);

export const selectActiveContentBlockId = createSelector(
  [selectAgentContentBlockSlice],
  (slice) => slice.activeContentBlockId,
);

export const selectContentBlocksStatus = createSelector(
  [selectAgentContentBlockSlice],
  (slice) => slice.status,
);

export const selectContentBlocksError = createSelector(
  [selectAgentContentBlockSlice],
  (slice) => slice.error,
);

export const selectContentBlockScopeLoadedMap = createSelector(
  [selectAgentContentBlockSlice],
  (slice) => slice.scopeLoaded,
);

export const selectIsContentBlockScopeLoaded = createSelector(
  [
    selectContentBlockScopeLoadedMap,
    (_s: RootState, scope: Scope, scopeId?: string | null) =>
      scopeIndexKey({ scope, scopeId: scopeId ?? null }),
  ],
  (scopeLoaded, key) => scopeLoaded[key] ?? false,
);

export const selectAllContentBlocksArray = createSelector(
  [selectAllContentBlocksMap],
  (map): AgentContentBlockRecord[] => Object.values(map),
);

export const selectContentBlockById = createSelector(
  [selectAllContentBlocksMap, (_s: RootState, id: string) => id],
  (map, id): AgentContentBlockRecord | undefined => map[id],
);

export const selectContentBlockDefinition = createSelector(
  [selectContentBlockById],
  (record): AgentContentBlockDef | undefined => {
    if (!record) return undefined;
    const {
      _dirty,
      _dirtyFields,
      _fieldHistory,
      _loadedFields,
      _loading,
      _error,
      ...definition
    } = record;
    return definition;
  },
);

export const selectContentBlockIsDirty = createSelector(
  [selectContentBlockById],
  (record): boolean => record?._dirty ?? false,
);

export const selectContentBlockIsLoading = createSelector(
  [selectContentBlockById],
  (record): boolean => record?._loading ?? false,
);

export const selectContentBlockError = createSelector(
  [selectContentBlockById],
  (record): string | null => record?._error ?? null,
);

export const selectContentBlocksByScope = createSelector(
  [
    selectAllContentBlocksArray,
    (_s: RootState, scope: Scope, _scopeId?: string | null) => scope,
    (_s: RootState, _scope: Scope, scopeId?: string | null) => scopeId ?? null,
  ],
  (blocks, scope, scopeId) =>
    blocks.filter((b) => matchesScope(b, { scope, scopeId: scopeId ?? null })),
);

export const selectContentBlocksByScopeRef = createSelector(
  [selectAllContentBlocksArray, (_s: RootState, ref: ScopeRef) => ref],
  (blocks, ref) => blocks.filter((b) => matchesScope(b, ref)),
);

export const selectContentBlocksByCategoryId = createSelector(
  [
    selectAllContentBlocksArray,
    (_s: RootState, categoryId: string) => categoryId,
  ],
  (blocks, categoryId) => blocks.filter((b) => b.categoryId === categoryId),
);

export const selectActiveContentBlocks = createSelector(
  [selectAllContentBlocksArray],
  (blocks) => blocks.filter((b) => b.isActive),
);

export const selectContentBlocksGroupedByCategory = createSelector(
  [selectActiveContentBlocks],
  (blocks) =>
    blocks.reduce<Record<string, AgentContentBlockRecord[]>>((acc, b) => {
      const key = b.categoryId ?? "_uncategorized";
      if (!acc[key]) acc[key] = [];
      acc[key].push(b);
      return acc;
    }, {}),
);
