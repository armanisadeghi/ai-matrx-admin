"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectAuthReady,
  selectIsAuthenticated,
  selectUserId,
} from "@/lib/redux/selectors/userSelectors";
import { liveOrganizationIdsAmong } from "@/features/organizations/organizationsIAmIn";
import {
  connectGoogle,
  disconnectGoogle,
  filterGoogleConnectionInventoryForUser,
  getYouTubeChannelPreview,
  getGoogleAdsCustomers,
  getGoogleAdsReport,
  getGoogleCalendarAgenda,
  getGoogleTasksPreview,
  getTagManagerInventory,
  getYouTubeAnalyticsPreview,
  listGoogleConnectionInventory,
  listGoogleCapabilities,
} from "@/features/marketing/google/service";
import type {
  GoogleCapabilityKey,
  GoogleConnectionPurpose,
} from "@/features/marketing/google/service";
import type { GoogleConnectionOwner } from "@/features/marketing/google/types";

export const googleConnectionKeys = {
  inventory: ["marketing", "google-connections"] as const,
  capabilities: ["marketing", "google-capabilities"] as const,
};

export function useGoogleCapabilities(options: { enabled?: boolean } = {}) {
  const authReady = useAppSelector(selectAuthReady);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const userId = useAppSelector(selectUserId);
  // The capability catalog is the same in every organization: no selected
  // organization gates or keys this read.
  return useQuery({
    queryKey: [...googleConnectionKeys.capabilities, userId],
    queryFn: ({ signal }) => listGoogleCapabilities(signal),
    enabled: (options.enabled ?? true) && authReady && isAuthenticated && Boolean(userId),
    staleTime: 30_000,
  });
}

const NO_ORGANIZATION_IDS: readonly string[] = [];

export function useGoogleConnectionInventory(options: { enabled?: boolean } = {}) {
  const authReady = useAppSelector(selectAuthReady);
  const isAuthenticated = useAppSelector(selectIsAuthenticated);
  const userId = useAppSelector(selectUserId);
  const base = {
    queryKey: [...googleConnectionKeys.inventory, userId],
    queryFn: ({ signal }: { signal: AbortSignal }) => listGoogleConnectionInventory(signal),
    // `users.integration_connections` is deliberately unavailable to `anon`.
    // Core routes can mount before the Redux auth slice hydrates, so do not
    // issue the inventory read until the caller has an authenticated identity.
    enabled: (options.enabled ?? true) && authReady && isAuthenticated && Boolean(userId),
    staleTime: 30_000,
  };
  // An organization-owned connection is hers only when she is a live member of THAT organization.
  // Asked by id for the organizations the connections name (the boot-seeded membership page answers
  // first, `iam.my_organizations_by_ids` the rest) — never the scope tree (2026-10-17: the new-chat
  // connector card pulled the whole tree, 4 reads / ~23 KB, just for these ids). Same inventory key,
  // same cache entry: the observers below add no second inventory request.
  const raw = useQuery(base);
  const organizationIdsNamed = [
    ...new Set(
      (raw.data?.connections ?? [])
        .filter((connection) => connection.owner_user_id === null && connection.organization_id)
        .map((connection) => connection.organization_id as string),
    ),
  ].sort();
  const membership = useQuery({
    queryKey: [...googleConnectionKeys.inventory, userId, "organizations", organizationIdsNamed.join(",")],
    queryFn: () => liveOrganizationIdsAmong(organizationIdsNamed),
    enabled: base.enabled && organizationIdsNamed.length > 0,
    staleTime: 30_000,
  });
  const organizationIds = membership.data ?? NO_ORGANIZATION_IDS;
  return useQuery({
    ...base,
    select: (inventory) =>
      filterGoogleConnectionInventoryForUser(
        inventory,
        userId,
        organizationIds,
      ),
  });
}

export function useConnectGoogle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      code,
      owner,
      connectionPurpose = "general",
      options,
    }: {
      code: string;
      owner: GoogleConnectionOwner;
      connectionPurpose?: GoogleConnectionPurpose;
      options?: {
        targetConnectionId?: string;
        capabilityKey?: GoogleCapabilityKey;
        /** `google_products` only: every catalog key the person switched on. */
        capabilityKeys?: readonly string[];
        organizationContextId?: string;
        expectedUserId?: string;
      };
    }) => connectGoogle(code, owner, connectionPurpose, options),
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: googleConnectionKeys.inventory,
      }),
  });
}

export function useDisconnectGoogle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: disconnectGoogle,
    onSuccess: () =>
      queryClient.invalidateQueries({
        queryKey: googleConnectionKeys.inventory,
      }),
  });
}

export function useYouTubeChannelPreview() {
  return useMutation({
    mutationFn: ({
      connectionId,
      channelId,
      organizationId,
    }: {
      connectionId: string;
      channelId: string;
      organizationId?: string | null;
    }) => getYouTubeChannelPreview(connectionId, channelId, organizationId),
  });
}

export function useGoogleAdsCustomers() {
  return useMutation({
    mutationFn: ({
      connectionId,
      organizationId,
    }: {
      connectionId: string;
      organizationId?: string | null;
    }) => getGoogleAdsCustomers(connectionId, organizationId),
  });
}

export function useGoogleAdsReport() {
  return useMutation({ mutationFn: getGoogleAdsReport });
}

export function useGoogleCalendarAgenda() {
  return useMutation({ mutationFn: getGoogleCalendarAgenda });
}

export function useGoogleTasksPreview() {
  return useMutation({ mutationFn: getGoogleTasksPreview });
}

export function useYouTubeAnalyticsPreview() {
  return useMutation({ mutationFn: getYouTubeAnalyticsPreview });
}

export function useTagManagerInventory() {
  return useMutation({ mutationFn: getTagManagerInventory });
}
