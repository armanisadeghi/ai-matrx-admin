/**
 * GUARD (MKT-127) — debug mode stays on. It regressed twice: first it lived only in memory
 * (every load reset it), then the bridge's memory lived in component refs, so a provider remount
 * (a page change) forced the live switch back to the saved record, and a switch flipped before
 * the preferences loaded was overwritten by the loaded value.
 *
 * Real reducers (adminDebug + userPreferences) in a real store, the real hook mounted/unmounted
 * with react-dom; only the sync engine is absent (the saved value is the store's own).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import { buildRemoteFetchStatusAction } from "@/lib/sync/engine/remoteFetchStatus";
import adminDebugReducer, { setDebugMode, toggleDebugMode } from "@/lib/redux/preferences/adminDebugSlice";
import userPreferencesReducer, { setPreference } from "@/lib/redux/preferences/userPreferencesSlice";
import { useDebugModePersistence, resetDebugBridgeMemory } from "../useDebugModePersistence";

(globalThis as unknown as { IS_REACT_ACT_ENVIRONMENT: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const markLoaded = (store: { dispatch: (a: unknown) => unknown }) =>
  store.dispatch(buildRemoteFetchStatusAction("userPreferences", "empty", "cold-boot" as never));

function makeStore(loadStatus: "loading" | "loaded", savedDebug: boolean) {
  const store = configureStore({
    reducer: { adminDebug: adminDebugReducer, userPreferences: userPreferencesReducer },
    middleware: (g) => g({ serializableCheck: false, immutableCheck: false }),
  });
  store.dispatch(setPreference({ module: "system", preference: "debugMode", value: savedDebug }));
  if (loadStatus === "loaded") markLoaded(store);
  return store;
}

function Bridge() {
  useDebugModePersistence(true);
  return null;
}

const live = (s: ReturnType<typeof makeStore>) => (s.getState() as any).adminDebug.isDebugMode as boolean;
const saved = (s: ReturnType<typeof makeStore>) => (s.getState() as any).userPreferences.system.debugMode as boolean;

let root: Root | null = null;
let host: HTMLElement | null = null;
async function mount(store: ReturnType<typeof makeStore>) {
  host = document.createElement("div");
  root = createRoot(host);
  await act(async () => {
    root!.render(
      <Provider store={store}>
        <Bridge />
      </Provider>,
    );
  });
}
async function unmount() {
  await act(async () => root!.unmount());
  root = null;
}

beforeEach(() => resetDebugBridgeMemory());

describe("debug mode persists", () => {
  it("a toggle is saved, and survives the provider remounting on a page change", async () => {
    const store = makeStore("loaded", false);
    await mount(store);
    await act(async () => { store.dispatch(toggleDebugMode()); });
    expect(live(store)).toBe(true);
    expect(saved(store)).toBe(true);
    await unmount();
    await mount(store); // navigation remount
    expect(live(store)).toBe(true);
    await unmount();
  });

  it("a saved On comes back On after a reload", async () => {
    const store = makeStore("loaded", true);
    await mount(store);
    expect(live(store)).toBe(true);
    await unmount();
  });

  it("a switch flipped while preferences are still loading is saved, not overwritten", async () => {
    const store = makeStore("loading", false);
    await mount(store);
    await act(async () => { store.dispatch(setDebugMode(true)); });
    await act(async () => {
      markLoaded(store);
    });
    expect(live(store)).toBe(true);
    expect(saved(store)).toBe(true);
    await unmount();
  });
});
