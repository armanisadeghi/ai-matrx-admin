/**
 * THE ADMIN SEAT on the Python server (lib/api/admin-lane.ts), Arman 2026-10-10:
 * inside the admin section a server request binds the ACTIVE organization —
 * the admin's declared admin organization, never the platform tenant — and
 * carries `x-matrx-admin-lane: 1`; on a user page nothing changes. The
 * platform tenant is bound only when a caller passes a Matrx System record's
 * own organization (platform content).
 */
import { configureStore } from "@reduxjs/toolkit";
import { SYSTEM_ORGANIZATION_ID } from "@/constants/platform-orgs";
import {
  adminLaneHeadersFor,
  adminLaneOrganizationId,
  withAdminLaneHeader,
} from "@/lib/api/admin-lane";
import { applyOrganizationContextHeader } from "@/lib/api/organization-context";
import appContextReducer, {
  setAdminOrganization,
  setOrganization,
} from "@/lib/redux/slices/appContextSlice";
import userAuthReducer, { setAdminLaneOpen } from "@/lib/redux/slices/userAuthSlice";
import { setStoreSingleton } from "@/lib/redux/store-singleton";

const USER_ORG = "11111111-1111-4111-8111-111111111111";
const ADMIN_ORG = "22222222-2222-4222-8222-222222222222";
const OTHER_ORG = "44444444-4444-4444-8444-444444444444";

function onPage(path: string) {
  window.history.pushState({}, "", path);
  const admin = path.startsWith("/administration/") || path === "/administration";
  const store = configureStore({ reducer: { appContext: appContextReducer, userAuth: userAuthReducer } });
  store.dispatch(setOrganization({ id: USER_ORG }));
  store.dispatch(setAdminOrganization({ id: ADMIN_ORG }));
  store.dispatch(setAdminLaneOpen(admin));
  setStoreSingleton(store);
}

describe("the admin lane", () => {
  it("binds the admin organization — never the platform tenant — inside the admin section", () => {
    onPage("/administration/intelligence/mandates/x");
    expect(adminLaneOrganizationId()).toBe(ADMIN_ORG);
    expect(adminLaneOrganizationId()).not.toBe(SYSTEM_ORGANIZATION_ID);
    expect(applyOrganizationContextHeader({}, ADMIN_ORG)).toMatchObject({
      "x-matrx-admin-lane": "1",
    });
  });

  it("platform content (a Matrx System record's own org) still rides the lane from admin", () => {
    onPage("/administration/intelligence/mandates/x");
    expect(applyOrganizationContextHeader({}, SYSTEM_ORGANIZATION_ID)).toMatchObject({
      "x-matrx-admin-lane": "1",
    });
    expect(withAdminLaneHeader({ "X-Organization-Id": OTHER_ORG })).toHaveProperty(
      "x-matrx-admin-lane",
      "1",
    );
  });

  it("changes nothing on a user page", () => {
    onPage("/notes");
    expect(adminLaneOrganizationId()).toBeNull();
    expect(applyOrganizationContextHeader({}, SYSTEM_ORGANIZATION_ID)).not.toHaveProperty(
      "x-matrx-admin-lane",
    );
  });

  it("the transport half marks only an organization-bound request inside the admin section", () => {
    onPage("/administration/intelligence/mandates/x");
    expect(adminLaneHeadersFor(ADMIN_ORG)).toEqual({ "x-matrx-admin-lane": "1" });
    expect(adminLaneHeadersFor(SYSTEM_ORGANIZATION_ID)).toEqual({ "x-matrx-admin-lane": "1" });
    expect(adminLaneHeadersFor(null)).toEqual({});
  });

  it("the transport half never marks a request from a user page", () => {
    onPage("/notes");
    expect(adminLaneHeadersFor(SYSTEM_ORGANIZATION_ID)).toEqual({});
    expect(adminLaneHeadersFor(USER_ORG)).toEqual({});
  });

  it("an ORGANIZATION's own admin pages are user pages: no admin org, no header", () => {
    onPage(`/organizations/${OTHER_ORG}/admin/members`);
    expect(adminLaneOrganizationId()).toBeNull();
    expect(adminLaneHeadersFor(OTHER_ORG)).toEqual({});
  });

  it("a user path that merely starts like an admin prefix is a user page", () => {
    onPage("/administrationx/anything");
    expect(adminLaneOrganizationId()).toBeNull();
    expect(adminLaneHeadersFor(USER_ORG)).toEqual({});
  });
});
