// lib/organizations/adminOrganization.ts — THE ADMIN SEAT, bound to this app's state.
//
// The rule (the admin's own organization is the active one only while the admin
// lane is open; unset = no overlay) is the package's `resolveAdminSeat` /
// `adminSeatReplacesUserContext`. This leaf only maps Redux state onto it, and
// imports nothing from the project so the slice, `activeOrg.ts` and transports
// can all read it without an import cycle.

import { adminSeatReplacesUserContext, resolveAdminSeat } from "@ai-matrx/auth/organizations";

export interface AdminOrganizationStateShape {
  appContext?: {
    organization_id?: string | null;
    admin_organization_id?: string | null;
    admin_organization_name?: string | null;
  } | null;
  userAuth?: { adminLaneOpen?: boolean } | null;
}

const seatOf = (state: AdminOrganizationStateShape | null | undefined) => ({
  laneOpen: state?.userAuth?.adminLaneOpen === true,
  organizationId: state?.appContext?.admin_organization_id ?? null,
  organizationName: state?.appContext?.admin_organization_name ?? null,
});

/** The admin organization in force right now, or null (off the lane, or none set). */
export function activeAdminOrganization(
  state: AdminOrganizationStateShape | null | undefined,
): { id: string; name: string | null } | null {
  return resolveAdminSeat(seatOf(state));
}

/** True when the admin organization differs from the person's own active organization. */
export function adminOrganizationReplacesUserContext(
  state: AdminOrganizationStateShape | null | undefined,
): boolean {
  return adminSeatReplacesUserContext(seatOf(state), state?.appContext?.organization_id ?? null);
}
