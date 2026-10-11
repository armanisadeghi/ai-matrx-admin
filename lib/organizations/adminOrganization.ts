// lib/organizations/adminOrganization.ts — THE ADMIN ORGANIZATION (Arman, 2026-10-10).
//
// Work an admin RUNS from the admin section (agent runs, mandates, labels,
// workflows, tests) happens in one of the admin's OWN organizations — never the
// Matrx System platform tenant. The admin declares it once
// (`userPreferences.organization.adminOrganizationId`); on every entry to an
// admin page `AdminLaneSync` sets it as `appContext.admin_organization_id`, and
// while the admin lane is open (`userAuth.adminLaneOpen`) it IS the active
// organization for every reader (`selectOrganizationId`, `getActiveOrgId`, the
// chat package's org port). The admin may switch it while there; the next
// admin page sets it back. User pages never see it: off the lane the person's
// own `appContext.organization_id` is untouched and unchanged.
//
// Unset (or no longer a membership): no overlay — admin pages use the person's
// current active organization, exactly as user pages do.
//
// A PURE LEAF: imports nothing, so the slice, `activeOrg.ts` and transports can
// all read it without an import cycle.

export interface AdminOrganizationStateShape {
  appContext?: {
    organization_id?: string | null;
    admin_organization_id?: string | null;
    admin_organization_name?: string | null;
  } | null;
  userAuth?: { adminLaneOpen?: boolean } | null;
}

/** The admin organization in force right now, or null (off the lane, or none set). */
export function activeAdminOrganization(
  state: AdminOrganizationStateShape | null | undefined,
): { id: string; name: string | null } | null {
  if (state?.userAuth?.adminLaneOpen !== true) return null;
  const id = state.appContext?.admin_organization_id;
  if (!id) return null;
  return { id, name: state.appContext?.admin_organization_name ?? null };
}

/**
 * True when the admin organization differs from the person's own active
 * organization — scope, project and task picked under the user-side
 * organization never ride into a run filed elsewhere.
 */
export function adminOrganizationReplacesUserContext(
  state: AdminOrganizationStateShape | null | undefined,
): boolean {
  const admin = activeAdminOrganization(state);
  return admin !== null && admin.id !== (state?.appContext?.organization_id ?? null);
}
