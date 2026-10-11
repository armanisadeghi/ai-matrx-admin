// features/mandates/mandate-home.ts
//
// THE one answer to "what is this mandate's scope?" — read from the mandate's
// HOME (`mandate.organization_id`), never from who is looking at it. The
// workspace once printed the viewer's perspective here, so a shortcut homed in
// an organization read "Scope: Personal" on its own page while its shortcut
// row said "Organization · <org>" (verifier, 2026-10-10). Every place that
// prints or exports a mandate's scope calls this.

import { SYSTEM_ORGANIZATION_ID } from "@/constants/platform-orgs";

/**
 * The mandate's scope as a person reads it: "System", the home organization's
 * name, one the viewer is not a member of, or no home at all — never a generic
 * "Organization" and never "Personal" (a mandate always lives in an org).
 */
export function mandateScopeLabel(
  homeOrganizationId: string | null | undefined,
  homeName: string | null,
): string {
  if (!homeOrganizationId) return "No home organization";
  if (homeOrganizationId.toLowerCase() === SYSTEM_ORGANIZATION_ID.toLowerCase()) return "System";
  return homeName ?? "An organization you are not in";
}

/**
 * The organization that bounds a mandate's "Everyone" level: the home org's
 * name when the mandate lives in one organization, `null` when it is
 * system-homed (or has no home) and "Everyone" really is everyone.
 */
export function mandateHomeBound(
  homeOrganizationId: string | null | undefined,
  homeName: string | null,
): string | null {
  if (!homeOrganizationId) return null;
  if (homeOrganizationId.toLowerCase() === SYSTEM_ORGANIZATION_ID.toLowerCase()) return null;
  return homeName ?? "its organization";
}
