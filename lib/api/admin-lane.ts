// lib/api/admin-lane.ts — THE ADMIN SEAT on the Python server.
//
// Arman, 2026-10-10: work an admin RUNS from the admin section (agent runs,
// mandates, labels, workflows, tests) happens in the admin's OWN declared
// admin organization — never the Matrx System platform tenant
// (`lib/organizations/adminOrganization.ts`). Two halves, decided at REQUEST
// time from the page the person is on (`browserAdminLaneOpen`):
//
//   1. `adminLaneOrganizationId()` — on an admin page, the organization admin
//      work binds to: the active organization there, which IS the admin
//      organization (or the person's current one when none is declared). Null
//      on every user page. Non-null also tells shared code "this is the admin
//      seat". An EXPLICIT organization a caller passes (a record's own org)
//      always wins.
//   2. `withAdminLaneHeader(headers)` — every organization-bound server request
//      from the admin section carries `x-matrx-admin-lane: 1` ("this is the
//      admin system"). The server re-verifies the caller in `admin.admins` and
//      audits (aidream `aidream/api/middleware/admin_lane_admission.py`):
//        - in the admin organization (a membership) the request is filed there
//          and still reads as the admin lane for admin-reach doors;
//        - bound to the platform tenant — only reading/editing PLATFORM CONTENT
//          (a built-in agent, a system mandate, a system kind record) — it is
//          the one admission of a non-member. A PERSON's new conversation,
//          request or run stamped with the tenant is REFUSED
//          (`platform_tenant_not_for_people`, Arman 2026-10-10): runs always
//          carry the active organization;
//        - any other organization is refused exactly as without the header.
//      The header alone grants nothing.

import { ADMIN_LANE_HEADER, browserAdminLaneOpen } from "@/utils/supabase/adminLane";
import { getActiveOrgId } from "@/lib/organizations/activeOrg";

/** The admin organization on the admin seat (never the platform tenant); null on every user page. */
export function adminLaneOrganizationId(): string | null {
  return browserAdminLaneOpen() ? getActiveOrgId() : null;
}

function isOrganization(organizationId: string | null | undefined): boolean {
  return typeof organizationId === "string" && organizationId.trim().length > 0;
}

/** The org header name as the transports write it (case varies by call site). */
function organizationHeaderOf(headers: Record<string, string>): string | undefined {
  for (const [name, value] of Object.entries(headers)) {
    if (name.toLowerCase() === "x-organization-id") return value;
  }
  return undefined;
}

/**
 * Adds `x-matrx-admin-lane: 1` when — and only when — an organization-bound
 * request leaves from the admin section. Returns the same object shape.
 */
export function withAdminLaneHeader<H extends Record<string, string>>(headers: H): H {
  if (!browserAdminLaneOpen() || !isOrganization(organizationHeaderOf(headers))) {
    return headers;
  }
  return { ...headers, [ADMIN_LANE_HEADER]: "1" };
}

/** The same decision for a transport that holds the organization id directly. */
export function adminLaneHeadersFor(
  organizationId: string | null | undefined,
): Record<string, string> {
  return browserAdminLaneOpen() && isOrganization(organizationId)
    ? { [ADMIN_LANE_HEADER]: "1" }
    : {};
}
