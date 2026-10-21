// An organization's seat never gets a platform-only tab or a /administration door (a 403 for an
// org owner — features/organizations/admin/routes.ts).
import { activityRecordHref } from "../userActivity";
import { USER_TABS, isVisibleUserTab, userRecordHref, visibleUserTabs, type UserRecordScope } from "../userSurfaces";

const org: UserRecordScope = { kind: "organization", orgId: "o-1", orgSlug: "acme", orgName: "Acme" };
const person = "11111111-1111-4111-8111-111111111111";

describe("organization seat of the user record", () => {
  it("shows only tabs marked for organizations", () => {
    expect(visibleUserTabs(org).map((t) => t.id)).toEqual(USER_TABS.filter((t) => t.built && t.inOrganization).map((t) => t.id));
    for (const t of USER_TABS.filter((t) => !t.inOrganization)) expect(isVisibleUserTab(t.id, org)).toBe(false);
  });

  it("addresses every tab under the organization, never /administration", () => {
    for (const t of visibleUserTabs(org)) {
      expect(userRecordHref(person, t.id, org).startsWith(`/organizations/acme/admin/users/${person}`)).toBe(true);
    }
  });

  it("never opens an activity row at a platform admin address", () => {
    const types = ["admin_history", "user", "organization", "support_session", "conversation", "workflow_run", "feedback", "notification", "auth_session", "billing", "coupon", "user_plan"];
    for (const type of types) {
      const href = activityRecordHref({ type, id: "x", user_id: person, href: "/administration/x" }, person, org);
      expect(href?.startsWith("/administration") ?? false).toBe(false);
    }
  });
});
