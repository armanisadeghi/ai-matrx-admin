// types/reduxTypes.ts
import { Database } from "@/types/database.types";
import { UserData } from "@/utils/userDataMapper";
import { GlobalCacheState } from "@/lib/redux/schema/globalCacheSlice";
import type { AIModel } from "@/features/ai-models/redux/modelRegistrySlice";
import type { ContextMenuRow } from "@/utils/supabase/ssrShellData";

export interface InitialReduxState {
  user: UserData;
  testRoutes: string[];
  // Phase 3: made optional. Preferences are no longer fetched server-side;
  // the `userPreferencesPolicy` warm-cache cold-boot path (IDB → LS → remote.fetch)
  // owns hydration entirely on the client. `resolveStoreBootstrapState` falls
  // back to `initializeUserPreferencesState(defaultUserPreferences)` when absent.
  userPreferences?: Record<string, any>;
  globalCache: GlobalCacheState;
  // Optional SSR pre-population.
  // contextMenuCache shape matches ContextMenuCacheState exactly — safe as preloaded state.
  // modelRegistry and sms need action-based hydration (their shapes don't match raw arrays)
  // so they are handled by SsrShellHydrator client island, not preloaded state.
  contextMenuCache?: { rows: ContextMenuRow[]; hydrated: boolean };
  agentContextMenuCache?: { rows: ContextMenuRow[]; hydrated: boolean };
}

/**
 * Optional bootstrap fields for `StoreProvider` / `makeStore` on public routes.
 *
 * @deprecated Prefer `Partial<InitialReduxState>` or explicit slice preload keys; the name
 * "lite" referred to the removed lite store.
 */
export interface LiteInitialReduxState {
  user?: Partial<UserData>;
  userPreferences?: Record<string, unknown>;
  // Pre-populated from SSR shell data RPC — no client fetch needed
  modelRegistry?: { availableModels: AIModel[]; lastFetched: number };
  contextMenuCache?: { rows: ContextMenuRow[]; hydrated: boolean };
  agentContextMenuCache?: { rows: ContextMenuRow[]; hydrated: boolean };
  // sms.unreadTotal seeded via PostPaintHydrator dispatch — not preloadedState
  sms?: { unreadTotal: number };
}

export type Id = string;
export type Page = number;
export type PageSize = number;
export type IncludeAllIdsNames = boolean;
export type ConversionFunction = string;
export type Ids = string[];
export type Payload = Record<string, any>;
export type UpdateFunction = string;
export type CreateFunction = string;
export type FeatureName = string;

// RPC function types
export type RpcFetchOneType =
  Database["public"]["Functions"]["fetch_all_fk_ifk"];
export type RpcFetchPaginatedType =
  Database["public"]["Functions"]["fetch_paginated_with_all_ids"];
export type RpcDeleteType = Database["public"]["Functions"]["delete_by_id"];
export type RpcUpdateType = Database["public"]["Functions"]["update_by_id"];
export type RpcCreateType = Database["public"]["Functions"]["add_one_entry"];
export type RpcFetchCustomRelsType =
  Database["public"]["Functions"]["fetch_custom_rels"];

// Thunk argument interfaces
export interface FetchOneThunkArgs {
  featureName: FeatureName;
  id: Id;
  tableList?: string[];
}

export interface FetchPaginatedThunkArgs {
  featureName: FeatureName;
  page: Page;
  pageSize: PageSize;
  includeAllIdsNames?: IncludeAllIdsNames;
  conversionFunction?: ConversionFunction;
}

export interface DeleteOneThunkArgs {
  featureName: FeatureName;
  id: Id;
}

export interface DeleteManyThunkArgs {
  featureName: FeatureName;
  ids: Ids;
}

export interface UpdateThunkArgs {
  featureName: FeatureName;
  payload: Payload;
  updateFunction?: UpdateFunction;
}

export interface CreateThunkArgs {
  featureName: FeatureName;
  payload: Payload;
  createFunction?: CreateFunction;
}

export type SliceState<FeatureType> = {
  items: Record<string, FeatureType>;
  allIdAndNames: { id: string; name: string }[];
  totalCount: number;
  loading: boolean;
  error: string | null;
  lastFetched: Record<string, number>;
  staleTime: number;
  backups: Record<string, FeatureType>;
};

export interface PaginatedResponse<T> {
  page: number;
  allIdAndNames: Array<{ id: string; name: string }>;
  pageSize: number;
  totalCount: number;
  paginatedData: T[];
}

export interface DeleteResponse {
  deletedIds: string[];
}

export interface FetchCustomRelsThunkArgs {
  featureName: FeatureName;
  id: Id;
  tableList: string[];
}
