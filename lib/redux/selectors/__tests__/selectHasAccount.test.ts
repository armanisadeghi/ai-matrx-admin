/**
 * selectHasAccount — ACCOUNT, not identity (guests-use-everything D2).
 * A guest session has an id (so `selectIsAuthenticated` is true) but no account.
 */
import { selectHasAccount, selectIsAuthenticated } from "../userSelectors";
import { mapUserData } from "@/utils/userDataMapper";
import type { RootState } from "@/lib/redux/store";

const stateFor = (user: Parameters<typeof mapUserData>[0]) =>
  ({ userAuth: mapUserData(user), userProfile: {} }) as unknown as RootState;

describe("selectHasAccount", () => {
  it("a guest session (is_anonymous) is authenticated but has no account", () => {
    const state = stateFor({ id: "guest-1", is_anonymous: true, app_metadata: {}, user_metadata: {} } as never);
    expect(selectIsAuthenticated(state)).toBe(true);
    expect(selectHasAccount(state)).toBe(false);
  });
  it("a member has an account", () => {
    const state = stateFor({ id: "member-1", is_anonymous: false, email: "m@example.test", app_metadata: {}, user_metadata: {} } as never);
    expect(selectHasAccount(state)).toBe(true);
  });
  it("a visitor (no id) has no account", () => {
    expect(selectHasAccount(stateFor(null))).toBe(false);
  });
});
