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
import { buildRemoteFetchStatusAction } from "@/lib/sync/engine/remoteFetchStatus";
import { useFramePins, pageFavorite } from "../useFramePins";
import { declareCurrentRecord } from "@/features/shell/current-record/currentRecord";

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
const markLoaded = (store: Store) =>
  store.dispatch(buildRemoteFetchStatusAction("userPreferences", "empty", "cold-boot") as never);

function Host() {
  const { pins, favorite } = useFramePins("/crm/people", "People");
  return (
    <div>
      <button data-testid="star" aria-pressed={favorite!.starred} data-known={String(favorite!.known)} onClick={favorite!.onToggle} />
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
  markLoaded(store);
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

it("while preferences have not loaded the star is neutral and a press toggles nothing", () => {
  const store = makeStore();
  mount(store);
  expect(star().getAttribute("data-known")).toBe("false");
  expect(star().getAttribute("aria-pressed")).toBe("false");
  act(() => star().click());
  expect(store.getState().userPreferences.favorites.items).toEqual([]);
  act(() => {
    markLoaded(store);
  });
  expect(star().getAttribute("data-known")).toBe("true");
  unmount();
});

function PathHost({ path, label }: { path: string; label: string }) {
  const { favorite } = useFramePins(path, label);
  return favorite ? <button data-testid="star" aria-pressed={favorite.starred} onClick={favorite.onToggle} /> : <i data-testid="no-star" />;
}
const mountPath = (store: Store, path: string, label: string) => {
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<Provider store={store}><PathHost path={path} label={label} /></Provider>));
};

it("on a record page the star favorites the RECORD itself, not the address", () => {
  const store = makeStore();
  markLoaded(store);
  const id = "4c9a3f8e-2b1d-4e6a-9f00-1a2b3c4d5e6f";
  let release = () => {};
  act(() => {
    release = declareCurrentRecord({ token: "agent", id, label: "Writer" });
  });
  mountPath(store, `/agents/${id}/build`, "Build");
  act(() => star().click());
  const saved = store.getState().userPreferences.favorites.items;
  expect(saved.map((f) => [f.id, f.kind, f.label])).toEqual([[`agent:${id}`, "agent", "Writer"]]);
  expect(star().getAttribute("aria-pressed")).toBe("true");
  unmount();
  act(() => release());
});

it("an unsaved page (/chat/new) has no star: favoritable means a real, saved thing", () => {
  const store = makeStore();
  markLoaded(store);
  mountPath(store, "/chat/new", "New chat");
  expect(host.querySelector('[data-testid="no-star"]')).not.toBeNull();
  unmount();
});

it("removing every pin leaves Pinned empty: the starting set comes back only for a person who never chose", () => {
  const store = makeStore();
  markLoaded(store);
  const starting = [{ id: "/chat", label: "Chat", href: "/chat" }];
  function StartHost() {
    const { pins, savePins } = useFramePins("/crm/people", "People", starting as never);
    return (
      <div>
        <button data-testid="add" onClick={() => savePins([...pins, { id: "/x", label: "X", href: "/x" } as never])} />
        <button data-testid="clear" onClick={() => savePins([])} />
        <ul>{pins.map((p) => <li key={p.id}>{p.label}</li>)}</ul>
      </div>
    );
  }
  const press = (id: string) => act(() => host.querySelector<HTMLButtonElement>(`[data-testid="${id}"]`)!.click());
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
  act(() => root.render(<Provider store={store}><StartHost /></Provider>));
  expect(rows()).toEqual(["Chat"]);
  press("add");
  expect(rows()).toContain("X");
  press("clear");
  expect(rows()).toEqual([]);
  unmount();
});
