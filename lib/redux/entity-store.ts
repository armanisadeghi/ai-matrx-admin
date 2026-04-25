// lib/redux/entity-store.ts
//
// Entity-aware store factory for routes under `app/(legacy)/legacy/*`.
//
// Phase 1 of the entity-isolation migration: `makeEntityStore` is currently
// the same factory as `makeStore` from `./store.ts` — `./store.ts` was
// updated in Phase 1 to use `createEntityRootReducer` + `createEntityRootSaga`,
// so it IS the entity factory during the migration window.
//
// Phase 4 will:
//   - Rewrite `./store.ts` to be the slim factory (no entity imports), and
//   - Move the entity factory implementation here so the entity branch has
//     its own real factory uncoupled from the slim one.
//
// During Phases 1–3, importing `makeEntityStore` from this file is the
// correct intent signal: it says "I want the entity-included store" even if
// the underlying implementation is shared.
//
// See `~/.claude/plans/the-entity-system-which-bubbly-wind.md`.

"use client";

export {
  makeStore as makeEntityStore,
  type AppStore as EntityAppStore,
  type RootState as EntityRootState,
  type AppDispatch as EntityAppDispatch,
  type AppThunk as EntityAppThunk,
} from "./store";
