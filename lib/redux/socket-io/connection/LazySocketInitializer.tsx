"use client";

// LazySocketInitializer — Only connects when a component requests it via requestConnect().
// Renders at layout level but does nothing until connectionRequested is true.
// On first request, dynamically imports and runs the socket initialization logic.

import { useEffect, useRef } from "react";
import { useAppSelector, useAppDispatch } from "@/lib/redux/hooks";
import {
  setConnection,
  setConnectionStatus,
  setAuthToken,
  setIsAdmin,
} from "../slices/socketConnectionsSlice";

export default function LazySocketInitializer() {
  const dispatch = useAppDispatch();
  const connectionRequested = useAppSelector(
    (state) => state.socketConnections.connectionRequested,
  );
  const userId = useAppSelector((state) => state.user.id);
  const initialized = useRef(false);

  useEffect(() => {
    // Socket.io disabled — server no longer supports it.
    const SOCKET_IO_ENABLED = false as boolean;
    if (!SOCKET_IO_ENABLED) return;

    if (!connectionRequested || !userId || initialized.current) return;
    initialized.current = true;

    async function connect() {
      try {
        // Dynamic import to avoid pulling socket.io into the initial bundle
        const { SocketConnectionManager } =
          await import("./socketConnectionManager");
        const socketManager = SocketConnectionManager.getInstance();

        const connectionId = await socketManager.initializePrimaryConnection();
        const socket = await socketManager.getSocket(
          connectionId,
          socketManager.getUrl(connectionId),
          socketManager.getNamespace(connectionId),
        );

        if (socket) {
          dispatch(
            setConnection({
              connectionId,
              socket,
              url: socketManager.getUrl(connectionId),
              namespace: socketManager.getNamespace(connectionId),
              connectionStatus: "connected",
              isAuthenticated: true,
            }),
          );

          const authToken = await socketManager.getAuthToken();
          dispatch(setAuthToken(authToken));
          const isAdmin = await socketManager.isAdmin();
          dispatch(setIsAdmin(isAdmin));

          socket.on("connect", () => {
            dispatch(
              setConnectionStatus({ connectionId, status: "connected" }),
            );
          });
          socket.on("disconnect", () => {
            dispatch(
              setConnectionStatus({ connectionId, status: "disconnected" }),
            );
          });
          socket.on("connect_error", () => {
            dispatch(setConnectionStatus({ connectionId, status: "error" }));
          });
        }
      } catch (err) {
        console.error("[LazySocketInitializer] Failed to connect:", err);
      }
    }

    connect();
  }, [connectionRequested, userId, dispatch]);

  return null;
}
