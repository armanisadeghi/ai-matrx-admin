"use client";

/**
 * Hooks over THE per-person hide (`features/access-gate/service/hiddenByMe.ts`).
 *
 * `useHiddenByMe(token)` — the person's hidden ids for one record type, shared
 * by every list of that type; hide/unhide refresh every query under it, so a
 * hidden record leaves every open list at once.
 * `useRemovalRights(token, id)` — the pre-check run BEFORE an archive/delete
 * confirm, so a person who may not remove the record sees their options
 * instead of a refusal.
 */

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  fetchRemovalRights,
  hideForMe,
  listHiddenByMe,
  unhideForMe,
} from "@/features/access-gate/service/hiddenByMe";

export const hiddenByMeKeys = {
  root: ["hidden-by-me"] as const,
  list: (token: string) => ["hidden-by-me", "list", token] as const,
  rights: (token: string, id: string) =>
    ["hidden-by-me", "rights", token, id] as const,
};

export function useHiddenByMe(token: string) {
  return useQuery({
    queryKey: hiddenByMeKeys.list(token),
    queryFn: () => listHiddenByMe(token),
    staleTime: 60_000,
  });
}

export function useRemovalRights(token: string, id: string | null) {
  return useQuery({
    queryKey: hiddenByMeKeys.rights(token, id ?? ""),
    queryFn: () => fetchRemovalRights(token, id as string),
    enabled: Boolean(id),
    staleTime: 0,
  });
}

/**
 * Hide / unhide. `invalidate` names the list queries that must re-read (e.g.
 * the brands list key) — the hidden ids alone are refreshed automatically.
 */
export function useHideForMe(token: string, invalidate: readonly unknown[][] = []) {
  const queryClient = useQueryClient();
  const settle = async () => {
    await queryClient.invalidateQueries({ queryKey: hiddenByMeKeys.root });
    await Promise.all(
      invalidate.map((queryKey) => queryClient.invalidateQueries({ queryKey })),
    );
  };
  const hide = useMutation({
    mutationFn: (id: string) => hideForMe(token, id),
    onSuccess: settle,
  });
  const unhide = useMutation({
    mutationFn: (id: string) => unhideForMe(token, id),
    onSuccess: settle,
  });
  return { hide, unhide };
}
