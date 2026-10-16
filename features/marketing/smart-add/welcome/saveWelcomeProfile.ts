/**
 * Sign-up welcome — write what "Looks right" confirmed into the person's plain profile through the existing
 * `/api/user/form-profile` route (GET, then PATCH only the empty fields; welcomeProfile.ts decides what).
 */

import { ensureOrgId } from "@/lib/organizations/ensureOrgId";
import { applyOrganizationContextHeader } from "@/lib/api/organization-context";
import type { UserFormProfileData } from "@/features/user-profile/types";
import { welcomeProfilePatch, type WelcomeConfirmed } from "./welcomeProfile";

const ENDPOINT = "/api/user/form-profile";

/** Returns the fields written (empty when there was nothing new). Throws with the route's own message. */
export async function saveWelcomeProfile(found: WelcomeConfirmed): Promise<string[]> {
  const res = await fetch(ENDPOINT, { cache: "no-store" });
  const got = (await res.json()) as { success: boolean; data?: UserFormProfileData | null; msg?: string };
  if (!res.ok || !got.success) throw new Error(got.msg || `Profile could not be read (${res.status})`);
  const patch = welcomeProfilePatch(got.data ?? null, found);
  const fields = Object.keys(patch);
  if (!fields.length) return [];
  const organizationId = await ensureOrgId(null);
  const put = await fetch(ENDPOINT, {
    method: "PATCH",
    headers: applyOrganizationContextHeader({ "Content-Type": "application/json" }, organizationId),
    body: JSON.stringify(patch),
  });
  const saved = (await put.json()) as { success: boolean; msg?: string };
  if (!put.ok || !saved.success) throw new Error(saved.msg || `Profile could not be saved (${put.status})`);
  return fields;
}
