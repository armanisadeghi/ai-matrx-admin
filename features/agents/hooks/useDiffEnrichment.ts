"use client";

import { useMemo } from "react";
import { useAppSelector } from "@/lib/redux/hooks";
import { selectAllTools } from "@/features/agents/redux/tools/tools.selectors";
import { selectMcpCatalog } from "@/features/agents/redux/mcp/mcp.slice";
import type { EnrichmentContext } from "@/components/diff/adapters/types";
import type { RootState } from "@/lib/redux/store.types";

export function useDiffEnrichment(): EnrichmentContext {
  const allTools = useAppSelector(selectAllTools);
  const mcpCatalog = useAppSelector(selectMcpCatalog);
  const modelEntities = useAppSelector(
    (state: RootState) => state.modelRegistry.entities,
  );

  return useMemo(
    (): EnrichmentContext => ({
      resolveModelId: (id: string) => {
        const model = modelEntities[id];
        return model?.common_name ?? model?.name ?? undefined;
      },
      resolveToolId: (id: string) => {
        const tool = allTools.find((t) => t.id === id);
        return tool?.name ?? undefined;
      },
      resolveMcpServerId: (id: string) => {
        const server = mcpCatalog.find((s) => s.serverId === id);
        return server?.name ?? undefined;
      },
    }),
    [allTools, mcpCatalog, modelEntities],
  );
}
