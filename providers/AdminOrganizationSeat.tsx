"use client";

// THE ADMIN ORGANIZATION, UI half (rule: lib/organizations/adminOrganization.ts).
// On every entry to an admin page (each new admin pathname) the declared admin
// organization becomes the admin pages' active organization. The admin may
// switch it while there (the switcher writes `setAdminOrganization` on the
// lane); the next admin page sets the declared one back. User pages are never
// touched: nothing here runs off the lane, and `appContext.organization_id`
// is never written.
//
// Unset, or not one of the person's organizations: cleared, so admin pages use
// the current active organization.

import { useEffect, useLayoutEffect } from "react";
import { usePathname } from "next/navigation";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import type { RootState } from "@/lib/redux/store";
import { setAdminOrganization } from "@/lib/redux/slices/appContextSlice";
import { isAdminLanePath } from "@/utils/supabase/adminLane";
import { ensureScopeTree } from "@/features/scopes/redux/thunks/ensureScopeTree";

export const selectDeclaredAdminOrganizationId = (state: RootState): string | null =>
  state.userPreferences?.organization?.adminOrganizationId ?? null;

type Verdict = "member" | "not-member" | "unknown";

function membershipVerdict(state: RootState, id: string | null): Verdict {
  if (!id) return "not-member";
  if ((state.scopesTree?.organizationIds ?? []).includes(id)) return "member";
  return state.scopesTree?.treeStatus === "ready" ? "not-member" : "unknown";
}

export function AdminOrganizationSeat() {
  const pathname = usePathname();
  const dispatch = useAppDispatch();
  const onAdminPage = isAdminLanePath(pathname);
  const declared = useAppSelector(selectDeclaredAdminOrganizationId);
  const verdict = useAppSelector((state) => membershipVerdict(state, declared));
  const name = useAppSelector((state) =>
    declared ? (state.scopesTree?.organizations?.[declared]?.name ?? null) : null,
  );

  // The membership list names the organization and proves it is still theirs.
  useEffect(() => {
    if (onAdminPage && declared) void dispatch(ensureScopeTree({}));
  }, [dispatch, onAdminPage, declared]);

  useLayoutEffect(() => {
    if (!onAdminPage) return;
    dispatch(
      setAdminOrganization(
        declared && verdict !== "not-member" ? { id: declared, name } : { id: null },
      ),
    );
    // `pathname`: every admin page entry resets to the declared organization.
  }, [dispatch, onAdminPage, pathname, declared, verdict, name]);

  return null;
}
