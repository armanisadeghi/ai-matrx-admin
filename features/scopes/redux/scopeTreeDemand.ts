/**
 * features/scopes/redux/scopeTreeDemand.ts — THE SCOPE TREE LOADS WHEN SOMETHING READS IT.
 *
 * Owner rule (Arman, 2026-10-16): nothing fetches until something engages with it. The tree
 * (`custom.context_tree`, ~1.2 s of database work) used to load at idle on every signed-in page.
 * ~150 files read `state.scopesTree` (selectors, pickers, resolvers, inline `useAppSelector`s) and
 * most never dispatch `ensureScopeTree` themselves — they relied on that idle load. Making each of
 * them remember is the "developer forgot to check on click" defect class, so the demand is caught
 * ONCE, at the store: until the tree has started loading, `store.getState()` hands out a thin view
 * whose `scopesTree` property access schedules the load (skeleton first, then the whole tree — the
 * order the idle tasks used, still behind the page's own primary content). The first read anywhere — React selector, `store.getState()` caller —
 * starts it; after that the store returns its raw state again and this costs nothing.
 *
 * Middleware and thunks receive the RAW getState (this enhancer sits OUTSIDE applyMiddleware), so
 * the loaders' own reads never count as demand. A read before sign-in schedules a no-op (the
 * thunks wait for a user id) and the next read retries. Server: no view (there is no tree to load).
 */

import type { StoreEnhancer, ThunkDispatch, UnknownAction } from "@reduxjs/toolkit";
import { ensureScopeSkeleton } from "@/features/scopes/redux/thunks/ensureScopeSkeleton";
import { ensureScopeTree } from "@/features/scopes/redux/thunks/ensureScopeTree";
import { whenPrimaryContentShown } from "@/lib/boot/primaryContent";

type TreeStatusView = { scopesTree?: { treeStatus?: string; skeletonStatus?: string } };

function treeUntouched(state: unknown): boolean {
  const tree = (state as TreeStatusView | null)?.scopesTree;
  return !!tree && tree.treeStatus === "idle" && tree.skeletonStatus === "idle";
}

export const scopeTreeDemandEnhancer: StoreEnhancer = (createStore) => (reducer, preloaded) => {
  const store = createStore(reducer, preloaded);
  if (typeof window === "undefined") return store;

  const rawGetState = store.getState;
  const views = new WeakMap<object, object>();
  let scheduled = false;
  let satisfied = false;

  const demand = () => {
    // Who asked — the one question a "why did the tree load here?" hunt needs answered. Dev only:
    // every distinct reader before the load starts, in `window.__matrxScopeTreeDemandBy`.
    if (process.env.NODE_ENV !== "production") {
      const by = ((window as { __matrxScopeTreeDemandBy?: string[] }).__matrxScopeTreeDemandBy ??= []);
      const stack = new Error("scope tree demand").stack ?? "";
      if (by.length < 20 && !by.includes(stack)) by.push(stack);
    }
    if (scheduled || satisfied) return;
    scheduled = true;
    queueMicrotask(() => {
      const dispatch = store.dispatch as unknown as ThunkDispatch<unknown, unknown, UnknownAction>;
      void (async () => {
        try {
          // A table page's own rows first (lib/boot/primaryContent) — the order the idle tasks kept.
          await whenPrimaryContentShown();
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const skeleton = dispatch(ensureScopeSkeleton() as any) as Promise<void>;
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          const whole = dispatch(ensureScopeTree() as any) as Promise<void>;
          if (!treeUntouched(rawGetState())) satisfied = true;
          await Promise.allSettled([skeleton, whole]);
        } finally {
          scheduled = false;
          if (!treeUntouched(rawGetState())) satisfied = true;
        }
      })();
    });
  };

  const getState = () => {
    const state = rawGetState();
    if (satisfied || !treeUntouched(state)) {
      satisfied = true;
      return state;
    }
    const raw = state as object;
    let view = views.get(raw);
    if (!view) {
      view = new Proxy(raw, {
        get(target, key, receiver) {
          if (key === "scopesTree") demand();
          return Reflect.get(target, key, receiver);
        },
      });
      views.set(raw, view);
    }
    return view as typeof state;
  };

  return { ...store, getState };
};
