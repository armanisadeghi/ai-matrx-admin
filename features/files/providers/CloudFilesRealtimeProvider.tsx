/**
 * features/files/providers/CloudFilesRealtimeProvider.tsx
 *
 * Mounts the realtime subscription for the current user on mount and tears it
 * down on unmount / user change. Drop this inside an authenticated layout
 * (e.g., app/(a)/files/layout.tsx) — or globally if every authed page
 * should receive cloud-files updates.
 */

"use client";

import { useEffect } from "react";
import { useAppDispatch } from "@/lib/redux/hooks";
import {
  attachCloudFilesRealtime,
  detachCloudFilesRealtime,
} from "@/features/files/redux/realtime-middleware";
import { loadUserFileTree } from "@/features/files/redux/thunks";

export interface CloudFilesRealtimeProviderProps {
  /**
   * Current user id. When null (unauthenticated) the subscription is torn
   * down. When non-null the middleware attaches a Realtime channel scoped to
   * this user and hydrates the initial tree via the RPC.
   */
  userId: string | null;
  children?: React.ReactNode;
}

export function CloudFilesRealtimeProvider({
  userId,
  children,
}: CloudFilesRealtimeProviderProps) {
  const dispatch = useAppDispatch();

  useEffect(() => {
    if (!userId) {
      dispatch(detachCloudFilesRealtime());
      return;
    }

    dispatch(attachCloudFilesRealtime(userId));
    // Hydrate the tree immediately. The middleware also fires a reconcile on
    // SUBSCRIBED — calling both is intentional: client perception of "files
    // are ready" must not wait for the realtime channel handshake.
    void dispatch(loadUserFileTree({ userId }));

    return () => {
      dispatch(detachCloudFilesRealtime());
    };
  }, [dispatch, userId]);

  return <>{children ?? null}</>;
}
