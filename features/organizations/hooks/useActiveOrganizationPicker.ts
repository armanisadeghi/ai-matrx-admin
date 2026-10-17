"use client";

// Canonical hook for every "pick the global active organization" surface
// (user-menu org section, header reminder popover, etc.). Reads active org
// from appContextSlice, lists orgs from the scope tree (Redux — same source
// as ActiveContextPanel), and writes via chooseActiveOrganization.

import { useEffect } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectOrganizationId,
  selectOrganizationName,
  selectShouldPromptForOrganization,
} from "@/lib/redux/slices/appContextSlice";
import { selectHasAccount } from "@/lib/redux/selectors/userSelectors";
import { chooseActiveOrganization } from "@/lib/redux/thunks/activeOrgBootstrap";
import { useScopeTree } from "@/features/scopes/hooks/useScopeTree";
import { ensureScopeTree } from "@/features/scopes/redux/thunks/ensureScopeTree";

/**
 * `load: false` reads what is already in Redux without asking for the scope tree. The shell's
 * switcher trigger passes `load: open`: while false the hook does not even READ the scope tree
 * (the store treats any read of it as demand), so the closed trigger never starts the load.
 */
export function useActiveOrganizationPicker({ load = true }: { load?: boolean } = {}) {
  const dispatch = useAppDispatch();
  const activeOrgId = useAppSelector(selectOrganizationId);
  const activeOrgName = useAppSelector(selectOrganizationName);
  // True only when the load ladder READ the memberships and found none: the
  // ladder picks an organization for anyone who has one (STATE rule 12), so
  // this is "you belong to no organization", never "choose one".
  const belongsToNone = useAppSelector(selectShouldPromptForOrganization);
  const { organizations, status } = useScopeTree({ enabled: load });
  const isAuthenticated = useAppSelector(selectHasAccount);

  useEffect(() => {
    // Gate on auth: ensureScopeTree no-ops (and stays 'idle') until a user id
    // exists, so we only fire once authenticated. Depending on isAuthenticated
    // means this re-fires when auth hydrates async on (public) routes
    // (usePublicAuthSync lands ~100ms after mount) — without it, the org
    // picker on a public route would stay empty for a logged-in user.
    if (!isAuthenticated || !load) return;
    void dispatch(ensureScopeTree({}));
  }, [dispatch, isAuthenticated, load]);

  const selectOrganization = (id: string, name: string) => {
    dispatch(chooseActiveOrganization({ id, name }));
  };

  return {
    activeOrgId,
    activeOrgName,
    belongsToNone,
    organizations,
    // Only "loading" once we've actually fired (i.e. authenticated). An
    // anonymous visitor never dispatches ensureScopeTree, so treeStatus stays
    // 'idle' forever — reporting that as loading would spin the picker
    // indefinitely. Not authenticated = not loading, nothing to pick.
    loading: isAuthenticated && (status === "loading" || (load && status === "idle")),
    loadFailed: status === "error",
    selectOrganization,
  };
}
