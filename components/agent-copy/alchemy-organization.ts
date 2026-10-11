// alchemy-organization — THE ORGANIZATION ALCHEMY WORKS IN, decided once for the host and its
// destinations: the active organization, the same one every other server-bound request reads. On an
// admin page that is the admin's declared admin organization (lib/organizations/adminOrganization.ts,
// Arman 2026-10-10 — never the platform tenant); everywhere else the selected one. The admin lane
// lives in the store (`userAuth.adminLaneOpen`), so a store subscription hears it move — there is no
// separate navigation listener.

import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";

export function alchemyOrganizationId(state: Parameters<typeof selectOrganizationId>[0]): string | null {
  return selectOrganizationId(state);
}
