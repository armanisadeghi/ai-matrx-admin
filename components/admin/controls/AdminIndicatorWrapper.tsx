// components/AdminIndicatorWrapper.tsx
"use client";

import React, { useState, useEffect } from "react";
import { SocketManager } from "@/lib/redux/socket/manager";
import { SocketConnectionManager } from "@/lib/redux/socket/core/connection-manager";
import AdminIndicator from "./AdminIndicator";
import { useSelector } from "react-redux";
import { RootState } from "@/lib/redux";

const ADMIN_USER_IDS = [
  "4cf62e4e-2679-484f-b652-034e697418df",
  "8f7f17ba-935b-4967-8105-7c6b554f41f1",
  "6555aa73-c647-4ecf-8a96-b60e315b6b18"
];

const AdminIndicatorWrapper = () => {
  const [isSocketConnected, setIsSocketConnected] = useState(false);
  const [socketUrl, setSocketUrl] = useState<string>("Not connected");
  const socketManager = SocketManager.getInstance();
  const connectionManager = SocketConnectionManager.getInstance();

  const user = useSelector((state: RootState) => state.user);
  const isAdmin = ADMIN_USER_IDS.includes(user.id);

  useEffect(() => {
    if (!isAdmin) return;

    let isMounted = true;

    const updateConnectionStatus = async () => {
      try {
        const socket = await socketManager.getSocket();
        if (!isMounted) return;

        // Set initial state based on current socket status
        if (socket) {
          setIsSocketConnected(socket.connected);
          setSocketUrl(socket.connected ? socket.io.uri : "Not connected");

          // Listen for future changes
          socket.on("connect", () => {
            if (isMounted) {
              setIsSocketConnected(true);
              setSocketUrl(socket.io.url);
            }
          });

          socket.on("disconnect", () => {
            if (isMounted) {
              setIsSocketConnected(false);
              setSocketUrl("Not connected");
            }
          });
        } else {
          setIsSocketConnected(false);
          setSocketUrl("Not connected");
        }
      } catch (error) {
        console.error("[AdminIndicatorWrapper] Error checking socket:", error);
        if (isMounted) {
          setIsSocketConnected(false);
          setSocketUrl("Connection error");
        }
      }
    };

    updateConnectionStatus();

    return () => {
      isMounted = false;
    };
  }, [socketManager, connectionManager, isAdmin]);

  if (!isAdmin) return null;

  return (
    <AdminIndicator
      user={user}
      socketConnected={isSocketConnected}
      socketUrl={socketUrl}
    />
  );
};

export default AdminIndicatorWrapper;