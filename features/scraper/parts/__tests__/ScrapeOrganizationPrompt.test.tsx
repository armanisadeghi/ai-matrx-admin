/**
 * No organization selected on /scraper: the person sees one quiet "Create an organization" door — never "Select an organization before sending this
 * request", a stack or Diagnostics JSON — and the scrape re-runs ONCE when
 * they pick (coordinator brief, 2026-10-05).
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore } from "@reduxjs/toolkit";
import appContextReducer from "@/lib/redux/slices/appContextSlice";

/** What the header's organization picker dispatches — by type, so this test writes no active context itself. */
const setOrganization = (payload: { id: string | null }) => ({
  type: "appContext/setOrganization",
  payload,
});
import { ScrapeOrganizationPrompt } from "../ScrapeOrganizationPrompt";

function storeWith(organizationId: string | null) {
  const store = configureStore({ reducer: { appContext: appContextReducer } });
  // Boot has finished asking: with no organization this is the terminal "none" state, not "resolving".
  store.dispatch({ type: "appContext/setOrgBootstrapResolved", payload: true });
  store.dispatch(setOrganization({ id: organizationId }));
  return store;
}

(
  globalThis as typeof globalThis & { IS_REACT_ACT_ENVIRONMENT?: boolean }
).IS_REACT_ACT_ENVIRONMENT = true;

let container: HTMLDivElement;
let root: Root;

function render(node: React.ReactNode): void {
  container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => {
    root.render(node);
  });
}

afterEach(() => {
  act(() => root.unmount());
  container.remove();
});

describe("ScrapeOrganizationPrompt", () => {
  it("never asks to choose: one quiet Create door, no transport sentence or stack", () => {
    render(
      <Provider store={storeWith(null)}>
        <ScrapeOrganizationPrompt onPicked={() => {}} />
      </Provider>,
    );
    const text = container.textContent ?? "";
    expect(text).not.toMatch(/choose|pick|select an organization/i);
    expect(container.querySelector("a[href='/organizations']")?.textContent).toBe("Create an organization");
    expect(text).not.toMatch(/before sending this request|Diagnostics JSON|stack|useScraperApi/i);
  });

  it("re-runs the scrape once when an organization is picked", () => {
    const store = storeWith(null);
    const onPicked = jest.fn();
    render(
      <Provider store={store}>
        <ScrapeOrganizationPrompt onPicked={onPicked} />
      </Provider>,
    );
    expect(onPicked).not.toHaveBeenCalled();
    act(() => {
      store.dispatch(setOrganization({ id: "11111111-1111-4111-8111-111111111111" }));
    });
    expect(onPicked).toHaveBeenCalledTimes(1);
    act(() => {
      store.dispatch(setOrganization({ id: "22222222-2222-4222-8222-222222222222" }));
    });
    expect(onPicked).toHaveBeenCalledTimes(1);
  });
});
