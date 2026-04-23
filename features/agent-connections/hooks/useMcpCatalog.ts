"use client";

import { useEffect, useMemo } from "react";
import { useAppDispatch, useAppSelector } from "@/lib/redux/hooks";
import {
  selectMcpCatalog,
  selectMcpCatalogStatus,
  selectMcpCatalogError,
  fetchCatalog,
  connectServer,
  disconnectServer,
  discoverServerTools,
} from "@/features/agents/redux/mcp/mcp.slice";
import type { McpCatalogEntry } from "@/features/agents/types/mcp.types";
import type { UpsertConnectionParams } from "@/features/agents/services/mcp.service";

export interface UseMcpCatalogResult {
  servers: McpCatalogEntry[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  connect: (params: UpsertConnectionParams) => void;
  disconnect: (serverId: string) => void;
  discover: (serverId: string) => void;
}

export function useMcpCatalog(): UseMcpCatalogResult {
  const dispatch = useAppDispatch();
  const servers = useAppSelector(selectMcpCatalog);
  const status = useAppSelector(selectMcpCatalogStatus);
  const error = useAppSelector(selectMcpCatalogError);

  useEffect(() => {
    if (status === "idle") void dispatch(fetchCatalog());
  }, [status, dispatch]);

  return useMemo(
    () => ({
      servers,
      loading: status === "loading",
      error,
      reload: () => {
        void dispatch(fetchCatalog());
      },
      connect: (params) => {
        void dispatch(connectServer(params));
      },
      disconnect: (serverId) => {
        void dispatch(disconnectServer(serverId));
      },
      discover: (serverId) => {
        void dispatch(discoverServerTools(serverId));
      },
    }),
    [servers, status, error, dispatch],
  );
}
