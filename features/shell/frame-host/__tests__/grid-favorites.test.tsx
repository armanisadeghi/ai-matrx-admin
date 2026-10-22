/**
 * THE APP GRID'S FAVORITES ARE THE PERSON'S, NOT THE COMPONENT'S (owner rule: every choice
 * persists on the server). Real store + real settings path (userPreferences.appGrid.favorites);
 * the grid is the real AppGrid, hosted exactly as FrameHostImpl hosts it (useGridFavorites).
 *
 *   1. never edited: the frame's default nine, in order;
 *   2. an edit lands in the store and survives a remount (a new component tree, same store);
 *   3. the saved record round-trips through a load (the module is in the persisted set);
 *   4. edit mode removes, adds, and reorders — and a retired id never lingers in what is saved.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import userPreferences, { initializeUserPreferencesState } from "@/lib/redux/preferences/userPreferencesSlice";
import { REHYDRATE_ACTION_TYPE } from "@/lib/sync/engine/rehydrate";
import { AppGrid } from "@/features/shell/frame/AppGrid";
import { DEFAULT_GRID_FAVORITES, PRODUCTS, PRODUCT_FAMILIES } from "@/features/shell/frame/products";
import { useGridFavorites } from "../useGridFavorites";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
class NoopResizeObserver {
  observe() {}
  unobserve() {}
  disconnect() {}
}
(globalThis as { ResizeObserver?: unknown }).ResizeObserver ??= NoopResizeObserver;
Element.prototype.scrollIntoView ??= function scrollIntoView() {};

function makeStore() {
  return configureStore({
    reducer: { userPreferences },
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
  });
}
type Store = ReturnType<typeof makeStore>;

function Host() {
  const [favorites, setFavorites] = useGridFavorites();
  return <AppGrid products={PRODUCTS} families={PRODUCT_FAMILIES} favorites={favorites} onFavoritesChange={setFavorites} />;
}

let host: HTMLElement;
let root: Root;
const mount = (store: Store) => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<Provider store={store}><Host /></Provider>));
};
const unmount = () => {
  act(() => root.unmount());
  host.remove();
};
const settle = () => act(() => new Promise<void>((r) => requestAnimationFrame(() => r())));
const saved = (s: Store) => s.getState().userPreferences.appGrid.favorites;
const body = () => document.querySelector<HTMLElement>('[role="group"][aria-label="Products"]')!;
const cardNames = () =>
  [...body().querySelectorAll('[aria-label^="Your favorites"] .mf-grid-name')].map((n) => n.textContent);
const byLabel = (label: string) => body().querySelector<HTMLButtonElement>(`[aria-label="${label}"]`)!;
const click = (el: Element) => act(() => (el as HTMLElement).click());
async function openAndEdit() {
  click(document.querySelector('[aria-label="All products"]')!);
  await settle();
  click([...body().querySelectorAll("button")].find((b) => b.textContent === "Edit favorites")!);
  await settle();
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("the app grid's favorites persist", () => {
  it("never edited: the default nine show, and nothing is saved", async () => {
    const store = makeStore();
    mount(store);
    click(document.querySelector('[aria-label="All products"]')!);
    await settle();
    expect(saved(store)).toBeNull();
    expect(cardNames()).toEqual(["Chat", "Memory", "Workspace", "Docs", "Drive", "Data", "CRM", "Intelligence", "Meet"]);
    expect(DEFAULT_GRID_FAVORITES).toHaveLength(9);
    unmount();
  });

  it("an edit survives a remount from the store", async () => {
    const store = makeStore();
    mount(store);
    await openAndEdit();
    click(byLabel("Remove Meet from favorites"));
    unmount();

    expect(saved(store)).toEqual(DEFAULT_GRID_FAVORITES.filter((id) => id !== "meet"));
    mount(store);
    click(document.querySelector('[aria-label="All products"]')!);
    await settle();
    expect(cardNames()).not.toContain("Meet");
    expect(cardNames()).toHaveLength(8);
    unmount();
  });

  it("the saved record comes back after a load", () => {
    const record = { ...initializeUserPreferencesState(), appGrid: { favorites: ["crm", "chat"] } };
    const after = userPreferences(initializeUserPreferencesState(), {
      type: REHYDRATE_ACTION_TYPE,
      payload: { sliceName: "userPreferences", state: record },
      meta: { source: "idb" },
    } as never);
    expect(after.appGrid.favorites).toEqual(["crm", "chat"]);
  });
});

describe("edit mode", () => {
  it("adds a product (it joins the end of the card) and removes one", async () => {
    const store = makeStore();
    mount(store);
    await openAndEdit();
    click(byLabel("Remove Meet from favorites"));
    click(byLabel("Remove Drive from favorites"));
    click(byLabel("Add HR to favorites"));
    expect(saved(store)).toEqual(["chat", "memory", "workspace", "docs", "data", "crm", "intelligence", "hr"]);
    unmount();
  });

  it("a full card of nine takes no tenth", async () => {
    const store = makeStore();
    mount(store);
    await openAndEdit();
    expect(byLabel("Add HR to favorites").disabled).toBe(true);
    click(byLabel("Add HR to favorites"));
    expect(saved(store)).toBeNull();
    unmount();
  });

  it("reorders: later and earlier move a favorite one place; the ends cannot move off", async () => {
    const store = makeStore();
    mount(store);
    await openAndEdit();
    expect(byLabel("Move Chat earlier").disabled).toBe(true);
    expect(byLabel("Move Meet later").disabled).toBe(true);
    click(byLabel("Move Chat later"));
    expect(saved(store)!.slice(0, 3)).toEqual(["memory", "chat", "workspace"]);
    click(byLabel("Move Workspace earlier"));
    expect(saved(store)!.slice(0, 3)).toEqual(["memory", "workspace", "chat"]);
    expect(cardNames().slice(0, 3)).toEqual(["Memory", "Workspace", "Chat"]);
    unmount();
  });

  it("a retired id in the saved list is dropped on the next edit", async () => {
    const store = makeStore();
    store.dispatch({ type: "userPreferences/setPreference", payload: { module: "appGrid", preference: "favorites", value: ["chat", "gone-product", "crm"] } });
    mount(store);
    await openAndEdit();
    click(byLabel("Remove CRM from favorites"));
    expect(saved(store)).toEqual(["chat"]);
    unmount();
  });
});
