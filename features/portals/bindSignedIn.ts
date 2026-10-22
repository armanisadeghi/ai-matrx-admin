import "server-only";

// features/portals/bindSignedIn.ts — CD-PAGE-12: A CLIENT WHO SIGNED IN ANOTHER WAY IS PUT ON HER PORTAL.
//
// The email link binds a principal to the auth user it signs in as (the sign-in route). A client who signs in with
// Google instead arrives signed in with no binding yet. When her sign-in's address is CONFIRMED (Google confirms it;
// an unconfirmed address proves nothing) and that address is on this portal, the same two server-lane doors bind her:
// `custom.portal_invitation` (is the address on the portal) and `custom.portal_principal_bind`.

import { portalInvitation, portalPrincipalBind } from "@/features/portals/service";
import { createAdminClient } from "@/utils/supabase/adminClient";

export async function bindSignedInClient(slug: string, userId: string): Promise<boolean> {
  const admin = createAdminClient();
  const { data, error } = await admin.auth.admin.getUserById(userId);
  const user = data?.user;
  if (error || !user?.email || !user.email_confirmed_at) return false;
  const invitation = await portalInvitation(slug, user.email).catch(() => null);
  if (!invitation || invitation.bound) return false;
  await portalPrincipalBind({ organizationId: invitation.organization_id, principalId: invitation.principal_id, userId });
  return true;
}
