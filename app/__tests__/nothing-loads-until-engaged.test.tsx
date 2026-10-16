/**
 * @jest-environment jsdom
 *
 * First-paint fetch contract V14/V15/V20/V25 (owner rule, Arman 2026-10-16): nothing is fetched or
 * pulled in until something engages with it, AND each deferral proves its on-engagement load.
 * Each block fails if the idle-time load returns or the engagement trigger is lost.
 */
import { readFileSync } from "fs";
import { join } from "path";
import { configureStore, createSlice } from "@reduxjs/toolkit";

const root = join(__dirname, "../..");
const read = (p: string) => readFileSync(join(root, p), "utf8");
const code = (p: string) => read(p).replace(/\/\/.*$/gm, "").replace(/\/\*[\s\S]*?\*\//g, "");

const skeleton = jest.fn();
const whole = jest.fn();
jest.mock("@/features/scopes/redux/thunks/ensureScopeSkeleton", () => ({
  ensureScopeSkeleton: () => (dispatch: (a: unknown) => void) => {
    skeleton();
    dispatch({ type: "scopesTree/skeletonFetchPending" });
    return Promise.resolve();
  },
}));
jest.mock("@/features/scopes/redux/thunks/ensureScopeTree", () => ({
  ensureScopeTree: () => () => {
    whole();
    return Promise.resolve();
  },
}));
jest.mock("@/lib/boot/primaryContent", () => ({ whenPrimaryContentShown: () => Promise.resolve() }));

import { scopeTreeDemandEnhancer } from "@/features/scopes/redux/scopeTreeDemand";
import { hasEngaged, installFirstEngagementListeners, resetFirstEngagement, whenEngaged } from "@/lib/boot/firstEngagement";
import { isFileBytesUrl, registerBlobCacheOnFirstFileFetch } from "@/features/files/cache/registerOnFirstFileFetch";
import { openPersonPeek, personPeekRequested, getPersonPeekTarget } from "@/features/data-tables/records-ui-host/personPeekStore";

const flush = () => new Promise((r) => setTimeout(r, 0));

function makeScopeStore() {
  const scopesTree = createSlice({
    name: "scopesTree",
    initialState: { treeStatus: "idle", skeletonStatus: "idle" },
    reducers: { skeletonFetchPending: (s) => void (s.skeletonStatus = "loading") },
  });
  const other = createSlice({ name: "other", initialState: { n: 0 }, reducers: { bump: (s) => void (s.n += 1) } });
  const store = configureStore({
    reducer: { scopesTree: scopesTree.reducer, other: other.reducer },
    enhancers: (d) => d().prepend(scopeTreeDemandEnhancer),
  });
  return { store, bump: () => store.dispatch(other.actions.bump()) };
}

describe("V25 — the scope tree loads on its first read, never at idle", () => {
  beforeEach(() => {
    skeleton.mockClear();
    whole.mockClear();
  });

  test("the deferred core no longer loads the tree", () => {
    const core = code("app/DeferredSingletonCore.tsx");
    expect(core).not.toMatch(/ensureScopeTree|ensureScopeSkeleton|useIdleTask/);
    expect(code("lib/redux/store.ts")).toMatch(/prepend\(scopeTreeDemandEnhancer\)/);
  });

  test("reads of other slices fetch nothing", async () => {
    const { store, bump } = makeScopeStore();
    bump();
    expect((store.getState() as { other: { n: number } }).other.n).toBe(1);
    await flush();
    expect(skeleton).not.toHaveBeenCalled();
  });

  test("the first read of state.scopesTree — from anyone — starts skeleton then whole tree, once", async () => {
    const { store } = makeScopeStore();
    void (store.getState() as { scopesTree: unknown }).scopesTree;
    void (store.getState() as { scopesTree: unknown }).scopesTree;
    await flush();
    await flush();
    expect(skeleton).toHaveBeenCalledTimes(1);
    expect(whole).toHaveBeenCalledTimes(1);
    // Loading started → the store hands out its raw state again; further reads demand nothing.
    void (store.getState() as { scopesTree: unknown }).scopesTree;
    await flush();
    expect(skeleton).toHaveBeenCalledTimes(1);
  });

  test("the view is identity-stable per state (selectors do not re-run for nothing)", () => {
    const { store } = makeScopeStore();
    expect(store.getState()).toBe(store.getState());
  });
});

describe("V20 — engagement tier", () => {
  beforeEach(() => resetFirstEngagement());

  test("idle is not engagement; a pointer press is", async () => {
    installFirstEngagementListeners();
    expect(hasEngaged()).toBe(false);
    const p = whenEngaged();
    window.dispatchEvent(new Event("pointerdown"));
    await p;
    expect(hasEngaged()).toBe(true);
  });

  test("focus on a button is not engagement; focus in a composer is", () => {
    installFirstEngagementListeners();
    const button = document.createElement("button");
    const composer = document.createElement("textarea");
    document.body.append(button, composer);
    button.focus();
    expect(hasEngaged()).toBe(false);
    composer.focus();
    expect(hasEngaged()).toBe(true);
  });

  test("the warm waits for engagement, and the wrapper sees engagement before the core loads", () => {
    const core = code("app/DeferredSingletonCore.tsx");
    expect(core).toMatch(/const engaged = useHasEngaged\(\)/);
    expect(core).toMatch(/if \(!engaged \|\| !warmup/);
    expect(code("app/DeferredSingletonWrapper.tsx")).toMatch(/installFirstEngagementListeners\(\);/);
  });
});

describe("V15 — blob-cache worker registers on the first file-bytes fetch", () => {
  test("byte URLs are recognized; others are not", () => {
    expect(isFileBytesUrl("https://files.matrxserver.com/files/123e4567-e89b-12d3-a456-426614174000/download?version=2")).toBe(true);
    expect(isFileBytesUrl("https://server.app.matrxserver.com/share/abc/download")).toBe(true);
    expect(isFileBytesUrl("https://server.app.matrxserver.com/ai/warm")).toBe(false);
  });

  test("no registration until a byte fetch appears, then exactly one", () => {
    let callback: ((list: { getEntries: () => { name: string }[] }) => void) | null = null;
    (globalThis as unknown as { PerformanceObserver: unknown }).PerformanceObserver = class {
      constructor(cb: typeof callback) {
        callback = cb;
      }
      observe() {}
      disconnect() {}
    };
    const register = jest.fn().mockResolvedValue(null);
    registerBlobCacheOnFirstFileFetch({ backendUrl: "https://b", userId: "u", register });
    callback!({ getEntries: () => [{ name: "https://b/ai/warm" }] });
    expect(register).not.toHaveBeenCalled();
    callback!({ getEntries: () => [{ name: "https://b/files/123e4567-e89b-12d3-a456-426614174000/download" }] });
    callback!({ getEntries: () => [{ name: "https://b/files/123e4567-e89b-12d3-a456-426614174000/download" }] });
    expect(register).toHaveBeenCalledTimes(1);
    expect(code("app/DeferredSingletonCore.tsx")).not.toMatch(/register-blob-cache-sw|registerBlobCacheServiceWorker\(/);
  });
});

describe("V14 — the overlay world loads on the first open, never at idle", () => {
  test("the idle core no longer mounts OverlayController or PersonPeekHost", () => {
    const core = code("app/DeferredSingletonCore.tsx");
    expect(core).not.toMatch(/OverlayController|PersonPeekHost/);
    const world = code("app/DeferredOverlayWorld.tsx");
    expect(world).toMatch(/<OverlayController \/>/);
    expect(world).toMatch(/<PersonPeekHost \/>/);
  });

  test("the wrapper renders the overlay world behind ONE edge, gated on an open (not on idle)", () => {
    const wrapper = code("app/DeferredSingletonWrapper.tsx");
    expect(wrapper.match(/import\("\.\/DeferredOverlayWorld"\)/g)).toHaveLength(1);
    expect(wrapper).toMatch(/overlayWorldWanted \? <DeferredOverlayWorld \/> : null/);
    expect(wrapper).toMatch(/Object\.keys\(state\.overlays\.overlays\)\.length > 0/);
    // The wrapper reaches only the tiny peek store, never the peek UI.
    expect(wrapper).not.toMatch(/records-ui-host\/PersonPeekHost"/);
  });

  test("a person-peek request latches and keeps its target for the host that mounts after it", () => {
    expect(personPeekRequested()).toBe(false);
    openPersonPeek({ recordId: "r1", email: "a@b.c" });
    expect(personPeekRequested()).toBe(true);
    expect(getPersonPeekTarget()?.recordId).toBe("r1");
  });
});
