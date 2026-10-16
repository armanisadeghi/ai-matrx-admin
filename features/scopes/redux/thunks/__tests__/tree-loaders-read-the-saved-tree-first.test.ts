/**
 * THE SAVED TREE IS READ BEFORE THE NETWORK IS ASKED (2026-10-16, "persist.held" on
 * /agents/<id>/build). Boot is deferred to window load + idle, but the first read of
 * `state.scopesTree` starts the load — so the loaders fetched before the saved copy was read:
 * a server read on every warm reload, and the engine holding the tree's device write.
 *   - not hydrated yet → no fetch; the saved tree lands → still no fetch;
 *   - hydrated with nothing saved (a cold device) → one fetch.
 */
import { configureStore } from "@reduxjs/toolkit";
import reducer from "@/features/scopes/redux/scopesSlice";
import { ensureScopeTree } from "@/features/scopes/redux/thunks/ensureScopeTree";
import { ensureScopeSkeleton } from "@/features/scopes/redux/thunks/ensureScopeSkeleton";
import { scopesService } from "@/features/scopes/service/scopesService";
import { setStoreSingleton, type AppStore } from "@/lib/redux/store-singleton";
import { buildRehydrateAction } from "@/lib/sync/engine/rehydrate";
import { WHEN_SYNC_HYDRATED_CAP_MS } from "@/lib/sync/whenSyncHydrated";

jest.mock("@/utils/auth/getUserId", () => ({ getUserId: () => "8d3f2c41-5b7e-4a90-9c12-6e4b1f0a7d55" }));
jest.mock("@/features/scopes/service/scopesService", () => ({
  scopesService: { getScopeTree: jest.fn() },
  forgetSharedScopeBootRead: jest.fn(),
}));

const ORG = "org-harbor-lane-bakery";
const savedTree = {
  organizations: { [ORG]: { id: ORG, name: "Harbor Lane Bakery", scope_types: [], projects: [] } },
  organizationIds: [ORG],
  treeFetchedAt: 1_000,
};
const getScopeTree = scopesService.getScopeTree as jest.Mock;

function storeWithEngine() {
  let settled = false;
  const listeners = new Set<() => void>();
  const store = configureStore({ reducer: { scopesTree: reducer } });
  const sync = {
    hydrationSettled: () => settled,
    bootStarted: () => true,
    onHydrationSettledChange: (l: () => void) => {
      listeners.add(l);
      return () => listeners.delete(l);
    },
  };
  Object.assign(store, { _sync: sync });
  setStoreSingleton(store as unknown as AppStore);
  const settle = () => {
    settled = true;
    for (const l of listeners) l();
  };
  return { store, settle };
}

const flush = () => new Promise((r) => setTimeout(r, 0));

afterEach(() => jest.clearAllMocks());

it("a warm reload answers from the saved tree — the server is never asked", async () => {
  const { store, settle } = storeWithEngine();
  const whole = store.dispatch(ensureScopeTree() as never) as unknown as Promise<void>;
  const skeleton = store.dispatch(ensureScopeSkeleton() as never) as unknown as Promise<void>;
  await flush();
  expect(getScopeTree).not.toHaveBeenCalled();
  expect(store.getState().scopesTree.treeStatus).toBe("idle");
  store.dispatch(buildRehydrateAction("scopesTree", savedTree, { fromRehydrate: true }));
  settle();
  await Promise.all([whole, skeleton]);
  expect(getScopeTree).not.toHaveBeenCalled();
  expect(store.getState().scopesTree.organizationIds).toEqual([ORG]);
  expect(store.getState().scopesTree.treeStatus).toBe("ready");
});

it("a cold device fetches once the empty read is done", async () => {
  getScopeTree.mockResolvedValue({ ok: true, data: { organizations: [], fetched_at: new Date(2_000).toISOString() } });
  const { store, settle } = storeWithEngine();
  const whole = store.dispatch(ensureScopeTree() as never) as unknown as Promise<void>;
  await flush();
  expect(getScopeTree).not.toHaveBeenCalled();
  settle();
  await whole;
  expect(getScopeTree).toHaveBeenCalledTimes(1);
});

it("a refresh never waits", async () => {
  getScopeTree.mockResolvedValue({ ok: true, data: { organizations: [], fetched_at: new Date(3_000).toISOString() } });
  const { store } = storeWithEngine();
  await store.dispatch(ensureScopeTree({ refresh: true }) as never);
  expect(getScopeTree).toHaveBeenCalledTimes(1);
});

it("a boot that never starts holds the loader only until the cap, then it fetches", async () => {
  jest.useFakeTimers();
  try {
    getScopeTree.mockResolvedValue({ ok: true, data: { organizations: [], fetched_at: new Date(4_000).toISOString() } });
    const error = jest.spyOn(console, "error").mockImplementation(() => {});
    const store = configureStore({ reducer: { scopesTree: reducer } });
    Object.assign(store, {
      _sync: { hydrationSettled: () => false, bootStarted: () => false, onHydrationSettledChange: () => () => {} },
    });
    setStoreSingleton(store as unknown as AppStore);
    const whole = store.dispatch(ensureScopeTree() as never) as unknown as Promise<void>;
    await jest.advanceTimersByTimeAsync(WHEN_SYNC_HYDRATED_CAP_MS - 1);
    expect(getScopeTree).not.toHaveBeenCalled();
    await jest.advanceTimersByTimeAsync(1);
    await whole;
    expect(getScopeTree).toHaveBeenCalledTimes(1);
    expect(error).toHaveBeenCalledWith(expect.stringContaining("never started"));
    error.mockRestore();
  } finally {
    jest.useRealTimers();
  }
});
