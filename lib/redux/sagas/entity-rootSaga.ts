// lib/redux/sagas/entity-rootSaga.ts
//
// Entity-aware root saga — wraps the slim saga and adds entity-specific
// watchers via SagaCoordinator. Used by `makeEntityStore()` for routes
// under `app/(legacy)/legacy/*`.
//
// SagaCoordinator now lives at `@/lib/redux/entity/sagas/SagaCoordinator`
// (moved during the entity-isolation migration so the slim saga doesn't
// import entity code transitively).
//
// See `~/.claude/plans/the-entity-system-which-bubbly-wind.md`.

import { all, call } from "redux-saga/effects";
import { EntityKeys } from "@/types/entityTypes";
import { SagaCoordinator } from "@/lib/redux/entity/sagas/SagaCoordinator";
import { createSlimRootSaga } from "./rootSaga";

export function createEntityRootSaga(entityNames: EntityKeys[]) {
  const slimSaga = createSlimRootSaga();

  return function* entityRootSaga() {
    const sagaCoordinator = SagaCoordinator.getInstance();
    sagaCoordinator.setEntityNames(entityNames);

    yield all([
      call(slimSaga),
      call([sagaCoordinator, sagaCoordinator.initializeEntitySagas]),
    ]);
  };
}

/**
 * @deprecated Migration alias. Use `createEntityRootSaga` directly. Preserved
 * during Phase 1 so callers (currently `lib/redux/store.ts`) compile without
 * an intermediate rename pass. Removed in Phase 5.
 */
export const createRootSaga = createEntityRootSaga;
