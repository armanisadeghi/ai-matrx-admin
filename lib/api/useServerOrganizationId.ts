"use client";

// lib/api/useServerOrganizationId.ts — the organization a component binds its
// SERVER requests to: the active organization. On an admin page that is the
// admin's declared admin organization (lib/organizations/adminOrganization.ts),
// everywhere else the selected one — `selectOrganizationId` answers both.

import { useAppSelector } from "@/lib/redux/hooks";
import { selectOrganizationId } from "@/lib/redux/slices/appContextSlice";

export function useServerOrganizationId(): string | null {
  return useAppSelector(selectOrganizationId) ?? null;
}
