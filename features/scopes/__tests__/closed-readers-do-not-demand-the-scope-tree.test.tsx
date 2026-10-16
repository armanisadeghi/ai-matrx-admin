/**
 * @jest-environment jsdom
 *
 * DEMAND IS EXPLICIT. The store treats ANY read of state.scopesTree as a request for the tree, so a
 * shell-mounted reader that is not engaged (closed org switcher, admin seat off an admin page) must
 * not read it at all. Real enhancer, real reducer, real hooks; only the two loaders are counted.
 * Remove `enabled` from useScopeTree / `engaged` from AdminOrganizationSeat and these go red.
 */
import React, { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Provider } from "react-redux";
import { configureStore, createSlice } from "@reduxjs/toolkit";

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;

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
let mockPathname = "/notes";
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname }));

import scopesReducer from "@/features/scopes/redux/scopesSlice";
import { scopeTreeDemandEnhancer } from "@/features/scopes/redux/scopeTreeDemand";
import { useScopeTree } from "@/features/scopes/hooks/useScopeTree";
import { AdminOrganizationSeat } from "@/providers/AdminOrganizationSeat";

const flush = () => new Promise((r) => setTimeout(r, 0));

function makeStore() {
  const userPreferences = createSlice({
    name: "userPreferences",
    initialState: { organization: { adminOrganizationId: "org-admin" } },
    reducers: {},
  });
  const appContext = createSlice({ name: "appContext", initialState: {}, reducers: {} });
  return configureStore({
    reducer: { scopesTree: scopesReducer, userPreferences: userPreferences.reducer, appContext: appContext.reducer },
    enhancers: (d) => d().prepend(scopeTreeDemandEnhancer),
    middleware: (d) => d({ serializableCheck: false, immutableCheck: false }),
  });
}

function Reader({ enabled }: { enabled?: boolean }) {
  useScopeTree(enabled === undefined ? undefined : { enabled });
  return null;
}

let root: Root;
async function mount(node: React.ReactElement) {
  const store = makeStore();
  root = createRoot(document.createElement("div"));
  await act(async () => {
    root.render(<Provider store={store}>{node}</Provider>);
  });
  await act(async () => {
    await flush();
    await flush();
  });
}

beforeEach(() => {
  skeleton.mockClear();
  whole.mockClear();
  mockPathname = "/notes";
});
afterEach(() => act(() => root.unmount()));

describe("scope tree demand is explicit", () => {
  test("useScopeTree({ enabled: false }) reads nothing and loads nothing", async () => {
    await mount(<Reader enabled={false} />);
    expect(skeleton).not.toHaveBeenCalled();
    expect(whole).not.toHaveBeenCalled();
  });

  test("useScopeTree() (default) still loads the tree", async () => {
    await mount(<Reader />);
    expect(skeleton).toHaveBeenCalledTimes(1);
    expect(whole).toHaveBeenCalledTimes(1);
  });

  test("the admin seat on a user page (every route mounts it) loads nothing", async () => {
    await mount(<AdminOrganizationSeat />);
    expect(skeleton).not.toHaveBeenCalled();
    expect(whole).not.toHaveBeenCalled();
  });

  test("the admin seat on an admin page still asks for the tree", async () => {
    mockPathname = "/administration/users";
    await mount(<AdminOrganizationSeat />);
    expect(whole).toHaveBeenCalled();
  });
});
