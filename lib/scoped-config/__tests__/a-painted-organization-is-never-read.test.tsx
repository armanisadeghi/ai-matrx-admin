/**
 * A PAINTED ORGANIZATION IS NEVER READ (2026-10-14). admin@admin.com's browser cache painted
 * "Alex Hart's Workspace" — an organization they are not a member of — and the knob reader's 4s
 * cap released the hold on a slow load: `knob_snapshot_delta` → `42501 not a member` on every
 * screen. The cap now releases only the no-organization hold; and the ladder's answer is saved so
 * the stale paint heals on the next load.
 */
import React from "react";
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore, createSlice } from "@reduxjs/toolkit";
import { usePaintedOrganizationHeld } from "../paintedOrganization";
import { appContextPolicy, makeAppContextState } from "@/lib/redux/slices/appContextSlice";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

const PAINTED = "8cb71c8b-5b49-4563-a5fe-d77ff600f8ee";

function storeWith(organization_id: string | null) {
  const slice = createSlice({
    name: "appContext",
    initialState: { organization_id, orgBootstrapResolved: false },
    reducers: {},
  });
  return configureStore({ reducer: { appContext: slice.reducer } });
}

let held: boolean | null = null;
const report = (value: boolean) => {
  held = value;
};
function Probe({ org, onHeld = report }: { org: string | null; onHeld?: (value: boolean) => void }) {
  onHeld(usePaintedOrganizationHeld(org));
  return null;
}

let root: Root;
let host: HTMLDivElement;
beforeEach(() => {
  jest.useFakeTimers();
  host = document.createElement("div");
  document.body.appendChild(host);
  root = createRoot(host);
});
afterEach(() => {
  act(() => root.unmount());
  host.remove();
  jest.useRealTimers();
});

it("a painted organization stays held past the cap until the ladder answers", () => {
  act(() => root.render(<Provider store={storeWith(PAINTED)}><Probe org={PAINTED} /></Provider>));
  expect(held).toBe(true);
  act(() => {
    jest.advanceTimersByTime(60_000);
  });
  expect(held).toBe(true);
});

it("no organization yet is released by the cap (a surface with no shell never gets one)", () => {
  act(() => root.render(<Provider store={storeWith(null)}><Probe org={null} /></Provider>));
  expect(held).toBe(true);
  act(() => {
    jest.advanceTimersByTime(5_000);
  });
  expect(held).toBe(false);
});

it("the ladder's answer is saved over the painted cache; a paint is not", () => {
  const afterLoad = appContextPolicy.config.persistAfterLoad;
  expect(typeof afterLoad).toBe("function");
  expect(afterLoad!(makeAppContextState({ organization_id: "884d1ce8", orgBootstrapResolved: true }))).toBe(true);
  expect(afterLoad!(makeAppContextState({ organization_id: PAINTED, orgBootstrapResolved: false }))).toBe(false);
  expect(afterLoad!(makeAppContextState({ organization_id: null, orgBootstrapResolved: true }))).toBe(false);
});
