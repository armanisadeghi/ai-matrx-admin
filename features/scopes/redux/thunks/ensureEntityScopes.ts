// features/scopes/redux/thunks/ensureEntityScopes.ts
//
// Lazy per-entity scope-assignment fetch. The Surface B counterpart to
// `ensureScopeTree` — populates `scopesTree.entityScopesByKey[<key>]`
// when a tagger or resolver actually needs the entity's local scopes.
//
// No-refetch policy: status === "ready" short-circuits unless `refresh`
// is explicitly passed. No host in-flight map: the read goes through the
// service's association door, whose client dedupes identical reads in flight.

import type { ThunkAction, UnknownAction } from "@reduxjs/toolkit";
import { scopesService } from "@/features/scopes/service/scopesService";
import { scopesActions } from "@/features/scopes/redux/scopesSlice";
import type { RootState } from "@/lib/redux/rootReducer";
import type { EntityTypeToken } from "@ai-matrx/associations";

type AppThunk<R = void> = ThunkAction<R, RootState, unknown, UnknownAction>;

export function entityScopesKey(
  entityType: EntityTypeToken,
  entityId: string,
): string {
  return `${entityType}:${entityId}`;
}

type Dispatch = Parameters<AppThunk>[0];
interface PendingBatch {
  ids: Set<string>;
  done: Promise<void>;
}
const pendingBatches = new Map<string, PendingBatch>();

function batchEntityScopes(dispatch: Dispatch, entityType: EntityTypeToken, entityId: string): Promise<void> {
  const open = pendingBatches.get(entityType);
  if (open) {
    open.ids.add(entityId);
    return open.done;
  }
  const ids = new Set<string>([entityId]);
  const done = new Promise<void>((resolve) => {
    setTimeout(() => {
      pendingBatches.delete(entityType);
      const wanted = [...ids];
      void scopesService
        .getEntityScopesBulk(entityType as Parameters<typeof scopesService.getEntityScopesBulk>[0], wanted)
        .then((res) => {
          for (const id of wanted) {
            const key = entityScopesKey(entityType, id);
            if (!res.ok) dispatch(scopesActions.entityScopesFetchRejected({ key, error: res.error.message }));
            else dispatch(scopesActions.entityScopesFetchFulfilled({ key, scope_ids: res.data.byEntity[id] ?? [] }));
          }
        })
        .catch((error: unknown) => {
          const message = error instanceof Error ? error.message : String(error);
          for (const id of wanted) {
            dispatch(scopesActions.entityScopesFetchRejected({ key: entityScopesKey(entityType, id), error: message }));
          }
        })
        .finally(resolve);
    }, 0);
  });
  pendingBatches.set(entityType, { ids, done });
  return done;
}

export function ensureEntityScopes(
  entityType: EntityTypeToken,
  entityId: string,
  opts: { refresh?: boolean } = {},
): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const { refresh = false } = opts;
    const key = entityScopesKey(entityType, entityId);
    const entry = getState().scopesTree.entityScopesByKey[key];

    if (!refresh && entry?.status === "ready") return;
    if (!refresh) {
      // A list of rows each asking for its own tags used to be N reads (the Files page: one
      // `assoc_for_entity` per file, 50 on one load). Asks made in the same moment ride ONE
      // bulk read (`getEntityScopesBulk`); an ask already in flight is not repeated.
      if (entry?.status === "loading") return;
      dispatch(scopesActions.entityScopesFetchPending({ key }));
      await batchEntityScopes(dispatch, entityType, entityId);
      return;
    }
    dispatch(scopesActions.entityScopesFetchPending({ key }));

    const res = await scopesService.getEntityScopes(entityType, entityId);
    if (!res.ok) {
      dispatch(scopesActions.entityScopesFetchRejected({ key, error: res.error.message }));
      return;
    }
    dispatch(scopesActions.entityScopesFetchFulfilled({ key, scope_ids: res.data.scope_ids }));
  };
}

/**
 * THE SCOPE TAGS OF A PAGE OF ROWS IN ONE READ (list surfaces: file tables, the extraction catalog).
 * Every row not already read gets its holder entry (`entityScopesByKey`) — its scope ids, or the
 * store's refusal on every row the read covered (a cell then says so; never an empty "no context").
 */
export function ensureEntityScopesBulk(
  entityType: string,
  entityIds: readonly string[],
  opts: { refresh?: boolean } = {},
): AppThunk<Promise<void>> {
  return async (dispatch, getState) => {
    const byKey = getState().scopesTree.entityScopesByKey;
    const wanted = [...new Set(entityIds.filter(Boolean))].filter(
      (id) => opts.refresh || byKey[`${entityType}:${id}`]?.status !== "ready",
    );
    if (wanted.length === 0) return;
    for (const id of wanted) dispatch(scopesActions.entityScopesFetchPending({ key: `${entityType}:${id}` }));
    const res = await scopesService.getEntityScopesBulk(
      entityType as Parameters<typeof scopesService.getEntityScopesBulk>[0],
      wanted,
    );
    for (const id of wanted) {
      const key = `${entityType}:${id}`;
      if (!res.ok) dispatch(scopesActions.entityScopesFetchRejected({ key, error: res.error.message }));
      else dispatch(scopesActions.entityScopesFetchFulfilled({ key, scope_ids: res.data.byEntity[id] ?? [] }));
    }
  };
}
