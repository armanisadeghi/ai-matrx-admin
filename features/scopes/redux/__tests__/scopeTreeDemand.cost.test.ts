/** @jest-environment jsdom */
// The dev-only "who asked" diagnostic in scopeTreeDemand captured a stack on EVERY read of
// `state.scopesTree` while the tree was unloaded. /files/all reads it ~1.6M times at boot
// (114 s of Error construction, tab frozen, `pnpm preview:ready /files` NOT READY). The capture
// must be bounded no matter how many reads happen.
import { configureStore } from "@reduxjs/toolkit";
import { DEMAND_CAPTURE_ATTEMPTS, scopeTreeDemandEnhancer } from "../scopeTreeDemand";

jest.mock("@/features/scopes/redux/thunks/ensureScopeSkeleton", () => ({ ensureScopeSkeleton: () => () => new Promise(() => {}) }));
jest.mock("@/features/scopes/redux/thunks/ensureScopeTree", () => ({ ensureScopeTree: () => () => new Promise(() => {}) }));
jest.mock("@/lib/boot/primaryContent", () => ({ whenPrimaryContentShown: () => new Promise(() => {}) }));

it("bounds the dev stack capture however many times scopesTree is read", () => {
  const store = configureStore({
    reducer: { scopesTree: (s = { treeStatus: "idle", skeletonStatus: "idle" }) => s },
    enhancers: (g) => g().concat(scopeTreeDemandEnhancer),
  });
  const OrigError = global.Error;
  let constructed = 0;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  (global as any).Error = new Proxy(OrigError, {
    construct(T, args) {
      if (args[0] === "scope tree demand") constructed++;
      return new T(...(args as [string]));
    },
  });
  try {
    for (let i = 0; i < 50_000; i++) void store.getState().scopesTree;
  } finally {
    global.Error = OrigError;
  }
  expect(constructed).toBeGreaterThan(0);
  expect(constructed).toBeLessThanOrEqual(DEMAND_CAPTURE_ATTEMPTS);
});
