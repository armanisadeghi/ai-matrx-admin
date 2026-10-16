"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAppSelector } from "@/lib/redux/hooks";
import {
  selectAuthReady,
  selectIsAuthenticated,
  selectUserId,
} from "@/lib/redux/selectors/userSelectors";
import { selectOrganizationIds } from "@/features/scopes/redux/selectors/tree";
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

/** No organization-owned connection came back: the person's organizations are not needed. */
const NO_ORGANIZATION_IDS: readonly string[] = [];
const selectNoOrganizationIds = () => NO_ORGANIZATION_IDS;

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
  // The person's organizations come from the scope tree (a ~1 s shared read that starts on the
  // first `state.scopesTree` read). Only an organization-owned connection needs them, so they are
  // read only once the inventory holds one — never at mount, never for a disabled caller
  // (2026-10-16: the new-chat connector card read them on first paint and pulled the whole tree).
  // Same key, same cache entry: this observer adds no second request.
  const raw = useQuery(base);
  const needsOrganizations =
    raw.data?.connections.some((connection) => connection.owner_user_id === null) ?? false;
  const organizationIds = useAppSelector(
    needsOrganizations ? selectOrganizationIds : selectNoOrganizationIds,
  );
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
