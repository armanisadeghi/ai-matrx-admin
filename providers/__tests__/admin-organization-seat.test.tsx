/**
 * THE ADMIN ORGANIZATION (Arman, 2026-10-10) — admin runs happen in the admin's
 * OWN declared organization, never the Matrx System platform tenant, and the
 * user pages never feel it.
 *
 * Real reducers, real selectors, the real seat component; only the page path
 * and the membership fetch are arranged. Plant `adminLaneOrganizationId()` back
 * to the platform tenant, drop the pathname reset, or let the seat write
 * `appContext.organization_id` and these go red.
 */
import { act } from "react";
import { createRoot, type Root } from "react-dom/client";
import { Provider } from "react-redux";
import { combineReducers, configureStore } from "@reduxjs/toolkit";

let mockPathname = "/notes";
jest.mock("next/navigation", () => ({ usePathname: () => mockPathname }));
jest.mock("@/features/scopes/redux/thunks/ensureScopeTree", () => ({
  ensureScopeTree: () => () => Promise.resolve(),
}));
const mockWriteLastActive = jest.fn(async () => undefined);
jest.mock("@/lib/organizations/accountOrganizationChoices", () => ({
  writeLastActiveOrganization: (id: string) => mockWriteLastActive(id),
}));

import { chatHostReducer } from "@ai-matrx/chat/store/chat-host.slice";
import { withAppChatHost } from "@/lib/redux/chat-host-from-app";
import userProfileReducer from "@/lib/redux/slices/userProfileSlice";
import userAuthReducer, { setUserAuth } from "@/lib/redux/slices/userAuthSlice";
import appContextReducer, {
  selectOrganizationId,
  selectProjectId,
  setOrganization,
  setProject,
} from "@/lib/redux/slices/appContextSlice";
import userPreferencesReducer, { setPreference } from "@/lib/redux/preferences/userPreferencesSlice";
import scopesReducer, { scopesActions } from "@/features/scopes/redux/scopesSlice";
import { setStoreSingleton } from "@/lib/redux/store-singleton";
import { AdminLaneSync } from "@/providers/AdminLaneSync";
import { AdminOrganizationSeat } from "@/providers/AdminOrganizationSeat";
import { chooseActiveOrganization } from "@/lib/redux/thunks/activeOrgBootstrap";
import { getActiveOrgId } from "@/lib/organizations/activeOrg";
import { adminLaneHeadersFor, adminLaneOrganizationId } from "@/lib/api/admin-lane";
import { SYSTEM_ORGANIZATION_ID } from "@/constants/platform-orgs";

const USER_ORG = "11111111-1111-4111-8111-111111111111";
const ADMIN_ORG = "22222222-2222-4222-8222-222222222222";
const OTHER_ORG = "33333333-3333-4333-8333-333333333333";

function org(id: string, name: string) {
  return { id, name, abbreviation: name.slice(0, 2), slug: name.toLowerCase(), role: "owner", scope_types: [], projects: [] };
}

function makeTestStore() {
  const store = configureStore({
    reducer: withAppChatHost(
      combineReducers({
        userAuth: userAuthReducer,
        userProfile: userProfileReducer,
        appContext: appContextReducer,
        userPreferences: userPreferencesReducer,
        scopesTree: scopesReducer,
        chatHost: chatHostReducer,
      }),
    ),
    middleware: (getDefault) => getDefault({ serializableCheck: false, immutableCheck: false }),
  });
  setStoreSingleton(store);
  store.dispatch(setUserAuth({ id: "admin-1", isAdmin: true, adminLevel: "super_admin" }));
  store.dispatch(setOrganization({ id: USER_ORG, name: "Harbor Dental Group" }));
  store.dispatch(setProject({ id: "project-in-user-org", name: "Spring launch" }));
  store.dispatch(
    scopesActions.treeFetchFulfilled({
      organizations: [org(USER_ORG, "Harbor Dental Group"), org(ADMIN_ORG, "Admin Workspace"), org(OTHER_ORG, "Oak Street Studio")],
      fetched_at: new Date().toISOString(),
    } as never),
  );
  return store;
}

type TestStore = ReturnType<typeof makeTestStore>;

function Seat() {
  return (
    <>
      <AdminLaneSync />
      <AdminOrganizationSeat />
    </>
  );
}

function goTo(path: string, store: TestStore, rerender?: (ui: React.ReactElement) => unknown) {
  mockPathname = path;
  window.history.pushState({}, "", path);
  const ui = (
    <Provider store={store}>
      <Seat />
    </Provider>
  );
  if (rerender) rerender(ui);
  return ui;
}

const state = (store: TestStore) => store.getState() as never;

(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true;
let root: Root | null = null;
function render(ui: React.ReactElement) {
  const container = document.createElement("div");
  document.body.appendChild(container);
  root = createRoot(container);
  act(() => root!.render(ui));
  return { rerender: (next: React.ReactElement) => act(() => root!.render(next)) };
}
afterEach(() => {
  act(() => root?.unmount());
  root = null;
});

describe("the admin organization", () => {
  beforeEach(() => mockWriteLastActive.mockClear());

  it("entering an admin page makes the declared admin organization active — never the platform tenant", () => {
    const store = makeTestStore();
    store.dispatch(setPreference({ module: "organization", preference: "adminOrganizationId", value: ADMIN_ORG }));
    render(goTo("/administration/intelligence/mandates", store));

    expect(selectOrganizationId(state(store))).toBe(ADMIN_ORG);
    expect(getActiveOrgId()).toBe(ADMIN_ORG);
    expect(adminLaneOrganizationId()).toBe(ADMIN_ORG);
    expect(adminLaneOrganizationId()).not.toBe(SYSTEM_ORGANIZATION_ID);
    // The chat package's org port (agent runs) sees the same organization.
    expect(store.getState().chatHost.org?.id).toBe(ADMIN_ORG);
    // A run in the admin organization is an ordinary member request: no admin-lane header.
    expect(adminLaneHeadersFor(ADMIN_ORG)).toEqual({});
    // Context picked under the user-side organization never rides into it.
    expect(selectProjectId(state(store))).toBeNull();
    // The user side is untouched.
    expect(store.getState().appContext.organization_id).toBe(USER_ORG);
  });

  it("a user page keeps its own organization even with an admin organization declared", () => {
    const store = makeTestStore();
    store.dispatch(setPreference({ module: "organization", preference: "adminOrganizationId", value: ADMIN_ORG }));
    render(goTo("/notes", store));

    expect(selectOrganizationId(state(store))).toBe(USER_ORG);
    expect(getActiveOrgId()).toBe(USER_ORG);
    expect(adminLaneOrganizationId()).toBeNull();
    expect(store.getState().chatHost.org?.id).toBe(USER_ORG);
    expect(selectProjectId(state(store))).toBe("project-in-user-org");
    expect(store.getState().appContext.admin_organization_id).toBeNull();
  });

  it("a switch on an admin page moves only the admin organization, and the next admin page sets it back", () => {
    const store = makeTestStore();
    store.dispatch(setPreference({ module: "organization", preference: "adminOrganizationId", value: ADMIN_ORG }));
    const { rerender } = render(goTo("/administration/intelligence/mandates", store));

    act(() => {
      store.dispatch(chooseActiveOrganization({ id: OTHER_ORG, name: "Oak Street Studio" }) as never);
    });
    expect(selectOrganizationId(state(store))).toBe(OTHER_ORG);
    expect(store.getState().appContext.organization_id).toBe(USER_ORG);
    expect(mockWriteLastActive).not.toHaveBeenCalled();

    goTo("/administration/usage", store, rerender);
    expect(selectOrganizationId(state(store))).toBe(ADMIN_ORG);

    goTo("/notes", store, rerender);
    expect(selectOrganizationId(state(store))).toBe(USER_ORG);
    expect(store.getState().chatHost.org?.id).toBe(USER_ORG);
  });

  it("a switch on a user page is the ordinary switch", () => {
    const store = makeTestStore();
    render(goTo("/notes", store));
    act(() => {
      store.dispatch(chooseActiveOrganization({ id: OTHER_ORG, name: "Oak Street Studio" }) as never);
    });
    expect(store.getState().appContext.organization_id).toBe(OTHER_ORG);
    expect(mockWriteLastActive).toHaveBeenCalledWith(OTHER_ORG);
  });

  it("unset, or no longer one of the person's organizations: admin pages use the current active organization", () => {
    const store = makeTestStore();
    render(goTo("/administration/intelligence/mandates", store));
    expect(selectOrganizationId(state(store))).toBe(USER_ORG);

    const gone = "44444444-4444-4444-8444-444444444444";
    act(() => {
      store.dispatch(setPreference({ module: "organization", preference: "adminOrganizationId", value: gone }));
    });
    expect(selectOrganizationId(state(store))).toBe(USER_ORG);
    expect(adminLaneOrganizationId()).toBe(USER_ORG);
  });
});
