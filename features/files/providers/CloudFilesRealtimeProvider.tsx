/**
 * features/files/providers/CloudFilesRealtimeProvider.tsx
 *
 * Mounts the cloud-files realtime subscription for the current authed user.
 *
 * **Mount this exactly once, globally, in `app/Providers.tsx`.** The five
 * previous per-route mounts (files layout, images layout, code explorer,
 * file-preview window, cloud-files window) were deleted in Phase 0 of the
 * consolidation rebuild — see
 * [docs/FILE_HANDLING_CONSOLIDATION_PLAN.md](../../../docs/FILE_HANDLING_CONSOLIDATION_PLAN.md).
 *
 * Reads `userId` from Redux (`selectUserId`). It never LOADS the tree (the load
 * law, 2026-10-13): the surface that shows files asks with `useDemandFileTree`
 * (`hooks/useFilesReadStatus.ts`); this attaches the realtime channel the
 * moment that load starts and tears it down on sign-out.
 */

"use client";

import { useEffect } from "react";
import { useAppDispatch, useAppSelector, useAppStore } from "@/lib/redux/hooks";
import { selectUserId } from "@/lib/redux/selectors/userSelectors";
import {
  attachCloudFilesRealtime,
  detachCloudFilesRealtime,
} from "@/features/files/redux/realtime-middleware";
import { selectTreeStatus } from "@/features/files/redux/selectors";
import {
  invalidateAll as invalidateBlobCache,
  setBlobCacheIdentity,
} from "@/features/files/hooks/blob-cache";

export interface CloudFilesRealtimeProviderProps {
  children?: React.ReactNode;
}

export function CloudFilesRealtimeProvider({
  children,
}: CloudFilesRealtimeProviderProps) {
  const dispatch = useAppDispatch();
  const store = useAppStore();
  const userId = useAppSelector(selectUserId);

  // Stamp the blob cache (memory + IDB tiers) with the current identity.
  // Sign-out wipes both tiers for the previous user so the next user can
  // never read leftover bytes.
  useEffect(() => {
    if (userId) {
      setBlobCacheIdentity(userId);
    } else {
      // identityUserId was set previously; capture it before clearing.
      // invalidateAll(undefined) only wipes the in-memory tier; the IDB
      // tier sweep happens here via the captured prior id.
      // (No-op when never signed in.)
      setBlobCacheIdentity(null);
      invalidateBlobCache();
    }
  }, [userId]);

  useEffect(() => {
    if (!userId) {
      dispatch(detachCloudFilesRealtime());
      return undefined;
    }

    // 🚨 THE TREE LOADS ON DEMAND (2026-10-13). This provider never reads the tree: every surface
    // that SHOWS it (files pages, cloud tabs, pickers, `useCloudTree`, the camera library, save
    // dialogs) loads it itself when it is still `idle`. It used to load the whole tree (~1.2 s of
    // database work, more on reconnects) on every page of the app for nobody. The channel that
    // keeps a loaded tree live attaches the moment a surface starts that load — while the
    // snapshot is in flight, so the middleware's backfill does not repeat it.
    let unsubscribe: (() => void) | null = null;
    const attachWhenDemanded = (): boolean => {
      if (selectTreeStatus(store.getState()) === "idle") return false;
      unsubscribe?.();
      unsubscribe = null;
      dispatch(attachCloudFilesRealtime(userId));
      return true;
    };
    if (!attachWhenDemanded()) unsubscribe = store.subscribe(() => void attachWhenDemanded());

    return () => {
      unsubscribe?.();
      dispatch(detachCloudFilesRealtime());
    };
  }, [dispatch, store, userId]);

  return <>{children ?? null}</>;
}
