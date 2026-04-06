/**
 * @deprecated Lite Redux is deprecated — use `@/lib/redux/store` instead:
 * - `makeStore` (replaces `makeLiteStore`)
 * - `getStore` (replaces `getLiteStore`)
 * - `RootState` (replaces `LiteRootState`)
 * - `resolveStoreBootstrapState` for optional public/bootstrap state
 */
// lib/redux/liteStore.ts — re-exports only; retained for backward-compatible imports
import {
    makeStore,
    getStore,
    resolveStoreBootstrapState,
    type AppStore,
    type RootState,
    type AppDispatch,
    type AppThunk,
} from "@/lib/redux/store";

/** @deprecated Use `makeStore` from `@/lib/redux/store`. */
export const makeLiteStore = makeStore;

/** @deprecated Use `getStore` from `@/lib/redux/store`. */
export const getLiteStore = getStore;

export type LiteAppStore = AppStore;
export type LiteRootState = RootState;
export type LiteAppDispatch = AppDispatch;
export type LiteAppThunk<ReturnType = void> = AppThunk<ReturnType>;

export { resolveStoreBootstrapState };
