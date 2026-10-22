/**
 * THE STAR IS THE PIN, ON THE PLATFORM'S ONE FAVOURITES STORE. Real store, real `usePinned`
 * (the canonical RPC write is stubbed): starring the current page lands in
 * userPreferences.favorites (the same list the classic Favorites menu and the dashboard read),
 * shows as a Pinned row, survives a remount, and un-starring removes it. No second store.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { configureStore } from "@reduxjs/toolkit";
import { Provider } from "react-redux";
import userPreferences from "@/lib/redux/preferences/userPreferencesSlice";
import { useFramePins, pageFavorite } from "../useFramePins";

jest.mock("@/features/scopes/service/favoritesService", () => ({
  favoritesService: { setFavorite: jest.fn(() => Promise.resolve({ ok: true })) },
}));

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

function makeStore() {
  return configureStore({
    reducer: { userPreferences },
    middleware: (gdm) => gdm({ serializableCheck: false, immutableCheck: false }),
  });
}
type Store = ReturnType<typeof makeStore>;

function Host() {
  const { pins, favorite } = useFramePins("/crm/people", "People");
  return (
    <div>
      <button data-testid="star" aria-pressed={favorite.starred} onClick={favorite.onToggle} />
      <ul>{pins.map((p) => <li key={p.id}>{p.label}</li>)}</ul>
    </div>
  );
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
const star = () => host.querySelector<HTMLButtonElement>('[data-testid="star"]')!;
const rows = () => [...host.querySelectorAll("li")].map((l) => l.textContent);

it("starring the page pins it into the shared favourites; un-starring removes it", () => {
  const store = makeStore();
  mount(store);
  expect(rows()).toEqual([]);
  expect(star().getAttribute("aria-pressed")).toBe("false");
  act(() => star().click());
  expect(rows()).toEqual(["People"]);
  expect(star().getAttribute("aria-pressed")).toBe("true");
  const saved = store.getState().userPreferences.favorites.items;
  expect(saved.map((f) => [f.id, f.kind, f.href])).toEqual([["/crm/people", "nav", "/crm/people"]]);
  expect(saved[0]).toMatchObject(pageFavorite("/crm/people", "People"));
  // A new component tree on the same store still has it.
  unmount();
  mount(store);
  expect(rows()).toEqual(["People"]);
  act(() => star().click());
  expect(rows()).toEqual([]);
  expect(store.getState().userPreferences.favorites.items).toEqual([]);
  unmount();
});
